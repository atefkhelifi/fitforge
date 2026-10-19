type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null };

/** Minimal in-memory stand-in for the parts of supabase-js that the app uses. */
export function createFakeSupabase() {
  const tables: Record<string, Row[]> = {};
  const state = { signedIn: true, userId: 'u1', failSelectOn: null as string | null, counter: 0 };

  const rows = (name: string) => (tables[name] ??= []);

  class Query implements PromiseLike<Result> {
    private op: 'select' | 'insert' | 'upsert' | 'delete' = 'select';
    private payload: Row[] = [];
    private conflictKey = 'id';
    private filters: [string, unknown][] = [];
    private orderBy: string | null = null;
    private slice: [number, number] | null = null;
    private wantsRows = false;
    private mode: 'many' | 'single' | 'maybe' = 'many';

    constructor(private table: string) {}

    select() {
      this.wantsRows = true;
      return this;
    }
    insert(payload: Row | Row[]) {
      this.op = 'insert';
      this.payload = Array.isArray(payload) ? payload : [payload];
      return this;
    }
    upsert(payload: Row | Row[], options?: { onConflict?: string }) {
      this.op = 'upsert';
      this.payload = Array.isArray(payload) ? payload : [payload];
      // The fake has one user, so a conflict on (user_id, date) is a conflict on date.
      this.conflictKey = options?.onConflict === 'user_id,date' ? 'date' : 'id';
      return this;
    }
    delete() {
      this.op = 'delete';
      return this;
    }
    eq(col: string, value: unknown) {
      this.filters.push([col, value]);
      return this;
    }
    order(col: string) {
      this.orderBy = col;
      return this;
    }
    range(from: number, to: number) {
      this.slice = [from, to];
      return this;
    }
    single() {
      this.mode = 'single';
      return this;
    }
    maybeSingle() {
      this.mode = 'maybe';
      return this;
    }

    private run(): Result {
      const table = rows(this.table);
      const matches = (r: Row) => this.filters.every(([c, v]) => r[c] === v);

      if (this.op === 'select') {
        if (state.failSelectOn === this.table) return { data: null, error: { message: `boom ${this.table}` } };
        let out = table.filter(matches).map((r) => ({ ...r }));
        if (this.orderBy) {
          const key = this.orderBy;
          out.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
        }
        if (this.slice) out = out.slice(this.slice[0], this.slice[1] + 1);
        return this.shape(out);
      }

      if (this.op === 'delete') {
        const keep = table.filter((r) => !matches(r));
        tables[this.table] = keep;
        return { data: null, error: null };
      }

      const written: Row[] = [];
      for (const item of this.payload) {
        const existing = this.op === 'upsert' ? table.find((r) => r[this.conflictKey] === item[this.conflictKey]) : undefined;
        if (existing) {
          Object.assign(existing, item);
          written.push({ ...existing });
        } else {
          const row = { id: item.id ?? `gen-${++state.counter}`, ...item };
          table.push(row);
          written.push({ ...row });
        }
      }
      return this.wantsRows ? this.shape(written) : { data: null, error: null };
    }

    private shape(out: Row[]): Result {
      if (this.mode === 'many') return { data: out, error: null };
      if (this.mode === 'maybe') return { data: out[0] ?? null, error: null };
      return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } };
    }

    then<A = Result, B = never>(
      onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): PromiseLike<A | B> {
      return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
    }
  }

  const client = {
    from: (table: string) => new Query(table),
    auth: {
      getSession: async () => ({ data: { session: state.signedIn ? { user: { id: state.userId } } : null } }),
    },
  };

  return {
    client,
    state,
    tables,
    reset() {
      for (const k of Object.keys(tables)) delete tables[k];
      state.signedIn = true;
      state.failSelectOn = null;
      state.counter = 0;
    },
  };
}

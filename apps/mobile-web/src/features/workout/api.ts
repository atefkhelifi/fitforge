import { supabase } from '@/lib/supabase';

export type WorkoutPayload = {
  dayId: string;
  dayName: string;
  startedAt: number;
  endedAt: number;
  sets: { exerciseId: string; setNo: number; weightKg: number; reps: number }[];
};

export type SyncStatus = 'saved' | 'not-signed-in' | 'error';

/** Saves a finished workout for the signed-in user. */
export async function saveWorkout(payload: WorkoutPayload): Promise<SyncStatus> {
  if (!supabase) return 'not-signed-in';
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return 'not-signed-in';

  const { data: row, error } = await supabase
    .from('workout_sessions')
    .insert({
      day_id: payload.dayId,
      day_name: payload.dayName,
      started_at: new Date(payload.startedAt).toISOString(),
      ended_at: new Date(payload.endedAt).toISOString(),
    })
    .select('id')
    .single();
  if (error || !row) return 'error';

  if (payload.sets.length === 0) return 'saved';
  const { error: setsError } = await supabase.from('set_logs').insert(
    payload.sets.map((s) => ({
      session_id: row.id,
      exercise_id: s.exerciseId,
      set_no: s.setNo,
      weight_kg: s.weightKg,
      reps: s.reps,
    })),
  );
  if (setsError) {
    // Don't leave a session without its sets.
    await supabase.from('workout_sessions').delete().eq('id', row.id);
    return 'error';
  }
  return 'saved';
}

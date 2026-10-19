// Checks that your Supabase project and Edge Function are set up. Run: npm run check-setup
// Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from .env (or the environment).
import { existsSync, readFileSync } from 'node:fs';

function loadEnv() {
  const env = { ...process.env };
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let failures = 0;
const ok = (msg) => console.log(`  OK    ${msg}`);
const bad = (msg, fix) => {
  failures += 1;
  console.log(`  FAIL  ${msg}\n        -> ${fix}`);
};

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), ...(init.headers ?? {}) } });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // not JSON
  }
  return { status: res.status, body };
}

console.log('FitForge setup check\n');

if (!url || url.includes('your-project-ref') || !key || key === 'your-anon-key') {
  bad('.env is missing or still has the placeholder values', 'Copy .env.example to .env and paste your Project URL and anon key (Supabase > Project Settings > API).');
  process.exit(1);
}
if (key.includes('service_role') || /^sb_secret_/.test(key)) {
  bad('That looks like a SECRET key', 'Use the anon / publishable key. Never put a service_role / secret key in the app.');
  process.exit(1);
}

try {
  const settings = await call('/auth/v1/settings');
  if (settings.status === 200) {
    ok('Supabase project reachable, keys accepted');
    if (settings.body?.external?.email === false) bad('Email sign-in is disabled', 'Authentication > Providers > Email: turn it on.');
    else ok('Email sign-in enabled');
    if (settings.body?.mailer_autoconfirm === false) {
      console.log('  NOTE  "Confirm email" is on: new accounts must click a link in their email before signing in.\n        (Turn it off under Authentication > Providers > Email while developing.)');
    }
  } else {
    bad(`Could not reach Supabase (HTTP ${settings.status})`, 'Check the URL and anon key in .env.');
    process.exit(1);
  }
} catch (e) {
  bad(`Network error: ${e.message}`, 'Check the URL in .env and your internet connection.');
  process.exit(1);
}

const tables = [
  ['exercises', 'id', 'migration 0001'],
  ['profiles', 'id', 'migration 0001'],
  ['workout_sessions', 'id', 'migration 0001'],
  ['set_logs', 'id', 'migration 0001'],
  ['body_metrics', 'id', 'migration 0001'],
  ['meals', 'id', 'migration 0001'],
  ['meal_items', 'id', 'migration 0001'],
  ['ai_usage', 'id', 'migration 0002'],
  ['meals', 'dish_name', 'migration 0003 (dish_name column)'],
  ['progress_photos', 'id', 'migration 0004'],
];
for (const [table, column, migration] of tables) {
  const r = await call(`/rest/v1/${table}?select=${column}&limit=1`);
  if (r.status === 200) ok(`${table}.${column} exists`);
  else bad(`${table}.${column} not found (HTTP ${r.status})`, `Run ${migration} in the SQL editor (or paste supabase/setup-all.sql on a fresh project).`);
}

const seeded = await call('/rest/v1/exercises?select=id&limit=20');
if (seeded.status === 200 && Array.isArray(seeded.body)) {
  if (seeded.body.length >= 15) ok(`exercise library seeded (${seeded.body.length}+ rows)`);
  else bad(`exercise library has only ${seeded.body.length} rows`, 'Re-run the seed insert at the end of migration 0001, or saving workouts will fail on the exercise foreign key.');
}

const bucket = await call('/storage/v1/bucket/progress-photos');
// A private bucket is not visible to the anon key; 400/404 here is expected either way, so only report a clear hint.
console.log(`  NOTE  Storage bucket "progress-photos" is created by migration 0004 (check Storage in the dashboard if photos fail). [HTTP ${bucket.status}]`);

const fn = await call('/functions/v1/analyze-meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (fn.status === 404) bad('Edge Function analyze-meal is not deployed', 'Run: npx supabase functions deploy analyze-meal  (see docs/07-setup.md).');
else if (fn.status === 401 && typeof fn.body?.error === 'string') ok('Edge Function analyze-meal is deployed and requires sign-in');
else if (fn.status === 401) ok('Edge Function responded 401 (requires sign-in)');
else bad(`analyze-meal answered HTTP ${fn.status}`, 'Check the function logs in the Supabase dashboard (Edge Functions > analyze-meal > Logs).');

const del = await call('/functions/v1/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (del.status === 404) bad('Edge Function delete-account is not deployed (needed for "Delete my account")', 'Run: npx supabase functions deploy delete-account');
else if (del.status === 401) ok('Edge Function delete-account is deployed and requires sign-in');
else bad(`delete-account answered HTTP ${del.status}`, 'Check the function logs in the Supabase dashboard.');

console.log('\nNot checked here: GEMINI_API_KEY. It is only used when you scan a meal. If scans fail with "Analysis failed",');
console.log('look at the function logs, and run: npx supabase secrets set GEMINI_API_KEY=your-key');
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} problem(s) found. Fix them in order, then run this again.`);
process.exit(failures === 0 ? 0 : 1);

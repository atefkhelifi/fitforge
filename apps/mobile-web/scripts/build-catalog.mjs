// Builds src/data/exercise-catalog.json from the open-source Free Exercise DB (Unlicense).
// Run: node scripts/build-catalog.mjs        (downloads the dataset at the pinned commit)
//      node scripts/build-catalog.mjs file.json   (use a local copy of dist/exercises.json)
// The photos are NOT bundled: the app loads them from the jsDelivr CDN at the same pinned commit.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Keep in step with DATASET_COMMIT in src/data/exercise-catalog.ts.
const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const SOURCE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
const OUT = fileURLToPath(new URL('../src/data/exercise-catalog.json', import.meta.url));

const raw = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : await (await fetch(SOURCE)).text();
const source = JSON.parse(raw);

const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
const problems = [];
const seen = new Set();

const catalog = source.map((e) => {
  if (!e.id || !e.name) problems.push(`missing id/name: ${JSON.stringify(e).slice(0, 80)}`);
  if (seen.has(e.id)) problems.push(`duplicate id ${e.id}`);
  seen.add(e.id);
  if (!/^[A-Za-z0-9_().\-]+$/.test(e.id)) problems.push(`unsafe id ${e.id}`);

  // Photos are always "<id>/0.jpg", "<id>/1.jpg", ... so only the count is stored.
  const images = e.images ?? [];
  images.forEach((p, i) => {
    if (p !== `${e.id}/${i}.jpg`) problems.push(`unexpected image path ${p} for ${e.id}`);
  });

  return {
    id: e.id,
    name: clean(e.name),
    level: e.level ?? 'beginner',
    equipment: e.equipment ?? null,
    category: e.category ?? 'strength',
    force: e.force ?? null,
    mechanic: e.mechanic ?? null,
    primary: e.primaryMuscles ?? [],
    secondary: e.secondaryMuscles ?? [],
    steps: (e.instructions ?? []).map(clean),
    images: images.length,
  };
});

if (problems.length) {
  console.error('Dataset problems:\n' + problems.slice(0, 20).join('\n'));
  process.exit(1);
}

catalog.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(OUT, JSON.stringify(catalog));
const kb = Math.round(JSON.stringify(catalog).length / 1024);
console.log(`wrote ${catalog.length} exercises (${kb} KB, ${catalog.filter((e) => e.images > 0).length} with photos) to src/data/exercise-catalog.json`);

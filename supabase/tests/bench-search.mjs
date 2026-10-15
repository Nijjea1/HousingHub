// Times search_listings with and without the spatial index on seeded data.
// Usage: npm run bench:search [-- <listings> <runs per block>]
import { createDb, migrate } from './db.mjs';
import { MCMASTER, insertListings, randomListings } from './random-listings.mjs';

const count = Number(process.argv[2] ?? 50_000);
const runs = Number(process.argv[3] ?? 100);
const SEED = 42;
const SPREAD_KM = 50;

const db = await createDb();
await migrate(db);
const t0 = performance.now();
await insertListings(db, randomListings(count, { seed: SEED, spreadKm: SPREAD_KM }));
console.log(`Inserted ${count} listings within ${SPREAD_KM} km of McMaster (seed ${SEED}) in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

const query = `select count(*) from public.search_listings(center_lat => ${MCMASTER.latitude}, center_lng => ${MCMASTER.longitude},
  radius_m => 2000, sort_by => 'distance', max_results => 200)`;
const matches = (await db.query(query)).rows[0].count;
console.log(`Query: 2 km around McMaster, nearest first, up to 200 results (returns ${matches})`);

async function block(label) {
  for (let i = 0; i < 10; i++) await db.query(query); // warm-up
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await db.query(query);
    times.push(performance.now() - start);
  }
  return { label, times };
}

const dropIndex = () => db.exec('drop index if exists idx_listings_location; analyze public.listings;');
const createIndex = () => db.exec('create index if not exists idx_listings_location on public.listings using gist (location); analyze public.listings;');

// A B A B so drift over the run (caches, JIT, GC) can't pass for an index effect.
const blocks = [];
for (let round = 0; round < 2; round++) {
  await dropIndex();
  blocks.push(await block('no index'));
  await createIndex();
  blocks.push(await block('gist index'));
}

const plan = (await db.query(`explain select id from public.listings
  where st_dwithin(location, st_setsrid(st_makepoint(${MCMASTER.longitude}, ${MCMASTER.latitude}), 4326)::geography, 2000, false)`)).rows
  .map((r) => r['QUERY PLAN']).join('\n  ');
console.log(`\nPlan for the radius predicate with the index:\n  ${plan}\n`);

function stats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, t) => s + t, 0) / n;
  const sd = Math.sqrt(sorted.reduce((s, t) => s + (t - mean) ** 2, 0) / (n - 1));
  return { n, median: sorted[Math.floor(n / 2)], p95: sorted[Math.floor(n * 0.95)], mean, ci95: (1.96 * sd) / Math.sqrt(n) };
}

const fmt = (x) => x.toFixed(2).padStart(8);
console.log('block        n   median ms   p95 ms   mean ms (95% CI)');
for (const b of blocks) {
  const s = stats(b.times);
  console.log(`${b.label.padEnd(11)} ${String(s.n).padStart(3)} ${fmt(s.median)}   ${fmt(s.p95)} ${fmt(s.mean)} ± ${s.ci95.toFixed(2)}`);
}
for (const label of ['no index', 'gist index']) {
  const s = stats(blocks.filter((b) => b.label === label).flatMap((b) => b.times));
  console.log(`${(label + ' all').padEnd(15)} n=${s.n} median ${s.median.toFixed(2)} ms, mean ${s.mean.toFixed(2)} ± ${s.ci95.toFixed(2)} ms`);
}
await db.close();

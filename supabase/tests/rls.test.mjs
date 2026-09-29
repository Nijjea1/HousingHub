// Applies the Supabase migrations to PGlite (Postgres compiled to WASM) on top
// of a minimal stand-in for Supabase's auth/storage schemas and roles, then
// checks the row level security policies. Run with `npm run test:db`.
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const migDir = path.join(repo, 'supabase', 'migrations');
const migrations = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()
  .map(f => [f, fs.readFileSync(path.join(migDir, f), 'utf8')]);
const seedPath = path.join(repo, 'supabase', 'seed.sql');

const STUB = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage; create schema extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create table auth.users (
  instance_id uuid, id uuid primary key, aud varchar(255), role varchar(255), email varchar(255),
  encrypted_password varchar(255), email_confirmed_at timestamptz, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token varchar(255), email_change varchar(255), email_change_token_new varchar(255),
  recovery_token varchar(255)
);
create table auth.identities (
  id uuid primary key default gen_random_uuid(), provider_id text not null, user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null, provider text not null, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  unique (provider_id, provider)
);
grant select on auth.users to anon, authenticated;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text not null, owner uuid);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`;

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

async function as(db, uid, sql, params) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`
                    : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role;'); }
}
async function fails(db, uid, sql, params) {
  try { await as(db, uid, sql, params); return false; } catch { return true; }
}

async function applyMigrations(db, label) {
  for (const [name, sql] of migrations) {
    try { await db.exec(sql); }
    catch (e) { ok(false, `${label}: ${name} applies (${e.message})`); throw e; }
  }
  ok(true, `${label}: all ${migrations.length} migrations apply`);
}

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';

async function rlsChecks(db, label) {
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'a@test.dev', '{"full_name":"Ava Student","university_id":"mcmaster"}'),
    ('${B}', 'b@test.dev', '{"full_name":"Ben Landlord","role":"landlord"}'),
    ('${C}', 'c@test.dev', '{"university_id":"not-a-real-school"}') on conflict do nothing;`);

  const prof = await db.query(`select id, full_name, university_id, role from public.profiles where id in ('${A}','${B}','${C}') order by id`);
  ok(prof.rows.length === 3, `${label}: signup trigger creates a profile per user`);
  ok(prof.rows[0].full_name === 'Ava Student' && prof.rows[0].university_id === 'mcmaster', `${label}: profile copies name/university from signup metadata`);
  ok(prof.rows[2].university_id === null, `${label}: unknown university id is ignored instead of failing signup`);
  ok(prof.rows[1].role === 'landlord' && prof.rows[2].role === 'student', `${label}: role comes from metadata, defaults to student`);

  const listing = `insert into public.listings (title, description, price, property_type, bedrooms, bathrooms, address, city, province, postal_code, university_id, user_id)
    values ('Test listing', 'A description', 900, 'apartment', 2, 1, '1 Main St W', 'Hamilton', 'ON', 'L8S 1A1', 'mcmaster', $1) returning id`;
  ok(await fails(db, null, listing, [B]), `${label}: anon cannot create a listing`);
  ok(await fails(db, A, listing, [B]), `${label}: user cannot create a listing owned by someone else`);
  const created = await as(db, B, listing, [B]);
  const lid = created.rows[0].id;
  ok(!!lid, `${label}: user can create their own listing`);
  ok((await as(db, null, `select id from public.listings where id = $1`, [lid])).rows.length === 1, `${label}: anon can read listings`);
  const hijack = await as(db, A, `update public.listings set title = 'hacked' where id = $1 returning id`, [lid]);
  ok(hijack.rows.length === 0, `${label}: user cannot edit someone else's listing`);
  ok(await fails(db, B, `update public.listings set user_id = '${A}' where id = $1`, [lid]), `${label}: owner cannot hand a listing to another user`);
  ok(await fails(db, B, `update public.listings set property_type = 'castle' where id = $1`, [lid]), `${label}: property_type is constrained`);
  ok(await fails(db, B, `update public.listings set price = 0 where id = $1`, [lid]), `${label}: price must be positive`);
  ok(await fails(db, B, `update public.listings set province = 'CA' where id = $1`, [lid]), `${label}: province must be a Canadian province code`);
  ok(await fails(db, B, `update public.listings set postal_code = '94105' where id = $1`, [lid]), `${label}: postal code must be Canadian format`);
  ok(await fails(db, B, `update public.listings set university_id = 'nope' where id = $1`, [lid]), `${label}: university must exist`);
  ok((await as(db, null, `select id from public.universities where is_active`)).rows.length >= 1, `${label}: anon can read active universities`);
  ok(await fails(db, A, `insert into public.universities (id, name, short_name, city, province, latitude, longitude) values ('x', 'X', 'X', 'X', 'ON', 0, 0)`), `${label}: users cannot add universities`);

  await as(db, A, `insert into public.favorites (user_id, listing_id, collection_name) values ($1, $2, 'Top picks')`, [A, lid]);
  ok((await as(db, C, `select * from public.favorites`)).rows.length === 0, `${label}: favorites are private`);
  ok(await fails(db, C, `insert into public.favorites (user_id, listing_id) values ($1, $2)`, [A, lid]), `${label}: cannot favorite on someone else's behalf`);

  ok(await fails(db, A, `insert into public.messages (sender_id, receiver_id, listing_id, content) values ($1, $2, $3, 'hi')`, [B, A, lid]), `${label}: cannot send a message as someone else`);
  const msg = await as(db, A, `insert into public.messages (sender_id, receiver_id, listing_id, content) values ($1, $2, $3, 'Is it available?') returning id`, [A, B, lid]);
  const mid = msg.rows[0].id;
  ok((await as(db, C, `select * from public.messages`)).rows.length === 0, `${label}: third party cannot read messages`);
  ok((await as(db, null, `select * from public.messages`)).rows.length === 0, `${label}: anon cannot read messages`);
  ok((await as(db, B, `select * from public.messages where id = $1`, [mid])).rows.length === 1, `${label}: receiver can read the message`);
  ok((await as(db, B, `update public.messages set is_read = true where id = $1 returning id`, [mid])).rows.length === 1, `${label}: receiver can mark it read`);
  ok(await fails(db, B, `update public.messages set content = 'edited' where id = $1`, [mid]), `${label}: receiver cannot rewrite message content`);
  ok((await as(db, A, `update public.messages set is_read = true where id = $1 returning id`, [mid])).rows.length === 0, `${label}: sender cannot mark it read`);

  ok((await as(db, null, `select full_name from public.profiles where id = $1`, [B])).rows.length === 1, `${label}: profiles are publicly readable`);
  ok((await as(db, A, `update public.profiles set full_name = 'x' where id = $1 returning id`, [B])).rows.length === 0, `${label}: cannot edit someone else's profile`);
  await as(db, A, `insert into public.user_preferences (user_id, max_rent) values ($1, 1200)`, [A]);
  ok((await as(db, B, `select * from public.user_preferences`)).rows.length === 0, `${label}: preferences are private`);

  ok(!(await fails(db, A, `insert into storage.objects (bucket_id, name) values ('listing-images', '${A}/photo.jpg')`)), `${label}: upload into own folder`);
  ok(await fails(db, A, `insert into storage.objects (bucket_id, name) values ('listing-images', '${B}/photo.jpg')`), `${label}: cannot upload into another user's folder`);
  ok(await fails(db, A, `insert into storage.objects (bucket_id, name) values ('listing-images', 'public/${A}/photo.jpg')`), `${label}: old "public/<id>/" path is rejected`);

  await db.exec(`delete from auth.users where id = '${C}'`);
  ok(true, `${label}: deleting a user works (old broken deletion trigger removed)`);
}

// Scenario 1: an existing project that was set up from the old hand-run db/schema.sql.
{
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec(STUB);
  await db.exec(fs.readFileSync(path.join(repo, 'supabase', 'tests', 'fixtures', 'legacy-schema.sql'), 'utf8'));
  const legacyUser = '00000000-0000-0000-0000-0000000000ff';
  await db.exec(`insert into auth.users (id, email) values ('${legacyUser}', 'legacy@test.dev');
    insert into public.listings (title, description, price, property_type, bedrooms, bathrooms, address, city, state, zip_code, user_id)
    values ('Legacy condo', 'Old row', 1500, 'condo', 1, 1, '9 Old Rd', 'Town', 'ST', '00000', '${legacyUser}');`);
  await applyMigrations(db, 'upgrade');
  await applyMigrations(db, 'upgrade re-run');
  const legacy = await db.query(`select property_type from public.listings where title = 'Legacy condo'`);
  ok(legacy.rows[0].property_type === 'apartment', 'upgrade: legacy property types are normalised');
  ok((await db.query(`select 1 from public.profiles where id = '${legacyUser}'`)).rows.length === 1, 'upgrade: existing users get a backfilled profile');
  await rlsChecks(db, 'upgrade');
}

// Scenario 2: a brand-new project, plus the seed file if present.
{
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec(STUB);
  await applyMigrations(db, 'fresh');
  if (fs.existsSync(seedPath)) {
    await db.exec(fs.readFileSync(seedPath, 'utf8'));
    const n = await db.query('select count(*)::int as n from public.listings');
    const u = await db.query(`select count(*)::int as n from auth.users u join auth.identities i on i.user_id = u.id`);
    const demo = await db.query(`select 1 from auth.users where email = 'demo.student@letmeknock.app'
      and encrypted_password = extensions.crypt('letmeknock-demo', encrypted_password)`);
    ok(n.rows[0].n >= 30, `seed: ${n.rows[0].n} listings inserted`);
    ok(u.rows[0].n >= 3, `seed: ${u.rows[0].n} users with email identities`);
    ok(demo.rows.length === 1, 'seed: demo student password verifies');
    await db.exec(fs.readFileSync(seedPath, 'utf8'));
    const n2 = await db.query('select count(*)::int as n from public.listings');
    ok(n2.rows[0].n === n.rows[0].n, 'seed: re-running the seed does not duplicate rows');
  }
  await rlsChecks(db, 'fresh');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

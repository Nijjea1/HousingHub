// A PGlite database (Postgres compiled to WASM) with a minimal stand-in for
// Supabase's auth and storage schemas and roles, plus PostGIS. Shared by the
// database test suites and the search benchmark.
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { postgis } from '@electric-sql/pglite-postgis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const migDir = path.join(repo, 'supabase', 'migrations');
export const migrations = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()
  .map(f => [f, fs.readFileSync(path.join(migDir, f), 'utf8')]);
export const seedPath = path.join(repo, 'supabase', 'seed.sql');

export const STUB = `
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

/** A new in-memory database with the Supabase stand-in applied, ready for migrations. */
export async function createDb() {
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto, postgis } });
  await db.exec(STUB);
  return db;
}

/** Runs every migration in order. */
export async function migrate(db) {
  for (const [, sql] of migrations) await db.exec(sql);
}

/** Runs a query as a signed-in user (uid) or as anon (null), the way PostgREST would. */
export async function as(db, uid, sql, params) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`
                    : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role;'); }
}
export async function fails(db, uid, sql, params) {
  try { await as(db, uid, sql, params); return false; } catch { return true; }
}

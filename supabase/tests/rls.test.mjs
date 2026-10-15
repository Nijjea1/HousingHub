// Applies the Supabase migrations to PGlite (Postgres compiled to WASM) on top
// of a minimal stand-in for Supabase's auth/storage schemas and roles, then
// checks the row level security policies. Run with `npm run test:db`.
import fs from 'node:fs';
import path from 'node:path';
import { as, createDb, fails, migrations, repo, seedPath } from './db.mjs';

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

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
  ok(await fails(db, B, `update public.listings set location = 'POINT(0 0)' where id = $1`, [lid]), `${label}: location is generated, never written`);
  await as(db, B, `update public.listings set latitude = 43.262, longitude = -79.9106 where id = $1`, [lid]);
  const near = await as(db, null, `select (listing).id, distance_m from public.search_listings(center_lat => 43.2609, center_lng => -79.9192, radius_m => 2000)`);
  ok(near.rows.some(r => r.id === lid && r.distance_m > 600 && r.distance_m < 800), `${label}: anon can search by distance and gets metres back`);
  const far = await as(db, null, `select 1 from public.search_listings(center_lat => 43.6532, center_lng => -79.3832, radius_m => 2000)`);
  ok(far.rows.length === 0, `${label}: a listing outside the radius is not returned`);
  ok((await as(db, null, `select id from public.universities where is_active`)).rows.length >= 1, `${label}: anon can read active universities`);
  ok(await fails(db, A, `insert into public.universities (id, name, short_name, city, province, latitude, longitude) values ('x', 'X', 'X', 'X', 'ON', 0, 0)`), `${label}: users cannot add universities`);

  await as(db, A, `insert into public.favorites (user_id, listing_id, collection_name) values ($1, $2, 'Top picks')`, [A, lid]);
  ok((await as(db, C, `select * from public.favorites`)).rows.length === 0, `${label}: favorites are private`);
  ok(await fails(db, C, `insert into public.favorites (user_id, listing_id) values ($1, $2)`, [A, lid]), `${label}: cannot favorite on someone else's behalf`);

  const startConv = `insert into public.conversations (listing_id, student_id, landlord_id) values ($1, $2, $3) returning id`;
  ok(await fails(db, A, startConv, [lid, A, C]), `${label}: cannot open a conversation with someone who doesn't own the listing`);
  ok(await fails(db, A, startConv, [lid, C, B]), `${label}: cannot open a conversation on someone else's behalf`);
  ok(await fails(db, B, startConv, [lid, B, B]), `${label}: cannot open a conversation with yourself`);
  ok(await fails(db, null, startConv, [lid, A, B]), `${label}: anon cannot open a conversation`);
  const cid = (await as(db, A, startConv, [lid, A, B])).rows[0].id;
  ok(!!cid, `${label}: a student can open a conversation with the listing's owner`);
  ok(await fails(db, A, startConv, [lid, A, B]), `${label}: one conversation per listing per student`);
  ok((await as(db, C, `select * from public.conversations`)).rows.length === 0, `${label}: third party cannot read the conversation`);
  ok((await as(db, B, `select * from public.conversations where id = $1`, [cid])).rows.length === 1, `${label}: landlord can read the conversation`);
  ok(await fails(db, A, `update public.conversations set landlord_id = $1 where id = $2`, [C, cid]), `${label}: participants cannot rewrite a conversation`);

  const send = `insert into public.messages (conversation_id, sender_id, receiver_id, listing_id, content) values ($1, $2, $3, $4, $5) returning id`;
  ok(await fails(db, A, send, [cid, B, A, lid, 'hi']), `${label}: cannot send a message as someone else`);
  ok(await fails(db, C, send, [cid, C, B, lid, 'hi']), `${label}: outsider cannot post into a conversation`);
  ok(await fails(db, A, send, [cid, A, C, lid, 'hi']), `${label}: a message must go to the other participant`);
  ok(await fails(db, A, `insert into public.messages (sender_id, receiver_id, listing_id, content) values ($1, $2, $3, 'hi')`, [A, B, lid]), `${label}: a message needs a conversation`);
  const before = (await db.query(`select last_message_at from public.conversations where id = $1`, [cid])).rows[0].last_message_at;
  const msg = await as(db, A, send, [cid, A, B, lid, 'Is it available?']);
  const after = (await db.query(`select last_message_at from public.conversations where id = $1`, [cid])).rows[0].last_message_at;
  ok(after >= before, `${label}: sending bumps the conversation's last_message_at`);
  ok((await as(db, B, send, [cid, B, A, lid, 'Yes, from September'])).rows.length === 1, `${label}: the landlord can reply`);
  const mid = msg.rows[0].id;
  const inboxA = (await as(db, A, `select * from public.my_conversations()`)).rows;
  const inboxB = (await as(db, B, `select * from public.my_conversations()`)).rows;
  ok(inboxA.length === 1 && inboxA[0].other_user_id === B && inboxA[0].last_message === 'Yes, from September' && inboxA[0].unread_count === 1,
    `${label}: inbox shows the other person, the last message and the student's unread count`);
  ok(inboxB.length === 1 && inboxB[0].other_name === 'Ava Student' && inboxB[0].unread_count === 1, `${label}: inbox shows the landlord their unread count`);
  ok((await as(db, C, `select * from public.my_conversations()`)).rows.length === 0, `${label}: an outsider's inbox does not include the conversation`);
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

  await as(db, A, `insert into public.user_presence (user_id) values ($1) on conflict (user_id) do update set last_seen_at = now()`, [A]);
  ok((await as(db, A, `select * from public.user_presence`)).rows.length === 1, `${label}: users can record when they were last seen`);
  ok((await as(db, B, `select * from public.user_presence`)).rows.length === 0, `${label}: last seen times are private`);
  ok(await fails(db, B, `insert into public.user_presence (user_id) values ($1)`, [C]), `${label}: cannot create someone else's last seen time`);
  ok((await as(db, B, `update public.user_presence set last_seen_at = now() where user_id = $1 returning user_id`, [A])).rows.length === 0, `${label}: cannot change someone else's last seen time`);

  await db.exec(`delete from auth.users where id = '${C}'`);
  ok(true, `${label}: deleting a user works (old broken deletion trigger removed)`);
}

// Scenario 1: an existing project that was set up from the old hand-run db/schema.sql.
{
  const db = await createDb();
  await db.exec(fs.readFileSync(path.join(repo, 'supabase', 'tests', 'fixtures', 'legacy-schema.sql'), 'utf8'));
  const legacyUser = '00000000-0000-0000-0000-0000000000ff';
  await db.exec(`insert into auth.users (id, email) values ('${legacyUser}', 'legacy@test.dev');
    insert into public.listings (title, description, price, property_type, bedrooms, bathrooms, address, city, state, zip_code, user_id)
    values ('Legacy condo', 'Old row', 1500, 'condo', 1, 1, '9 Old Rd', 'Town', 'ST', '00000', '${legacyUser}');`);
  // Messages from before conversations existed: one about the listing, one between two people who don't own it.
  const legacyAsker = '00000000-0000-0000-0000-0000000000fe';
  const legacyOther = '00000000-0000-0000-0000-0000000000fd';
  await db.exec(`insert into auth.users (id, email) values ('${legacyAsker}', 'asker@test.dev'), ('${legacyOther}', 'other@test.dev');
    insert into public.messages (sender_id, receiver_id, listing_id, content)
      select '${legacyAsker}', '${legacyUser}', id, 'Still available?' from public.listings where title = 'Legacy condo';
    insert into public.messages (sender_id, receiver_id, listing_id, content)
      select '${legacyUser}', '${legacyAsker}', id, 'Yes' from public.listings where title = 'Legacy condo';
    insert into public.messages (sender_id, receiver_id, listing_id, content)
      select '${legacyAsker}', '${legacyOther}', id, 'Seen this?' from public.listings where title = 'Legacy condo';`);
  await applyMigrations(db, 'upgrade');
  await applyMigrations(db, 'upgrade re-run');
  const legacy = await db.query(`select property_type from public.listings where title = 'Legacy condo'`);
  ok(legacy.rows[0].property_type === 'apartment', 'upgrade: legacy property types are normalised');
  ok((await db.query(`select 1 from public.profiles where id = '${legacyUser}'`)).rows.length === 1, 'upgrade: existing users get a backfilled profile');
  const convs = await db.query(`select student_id, landlord_id, (select count(*)::int from public.messages m where m.conversation_id = c.id) as n from public.conversations c`);
  ok(convs.rows.length === 1 && convs.rows[0].student_id === legacyAsker && convs.rows[0].landlord_id === legacyUser && convs.rows[0].n === 2,
    'upgrade: old messages with the listing owner are grouped into one conversation');
  const loose = await db.query(`select count(*)::int as n from public.messages where conversation_id is null`);
  ok(loose.rows[0].n === 1, 'upgrade: messages between two non-owners stay unattached');
  await rlsChecks(db, 'upgrade');
}

// Scenario 2: a brand-new project, plus the seed file if present.
{
  const db = await createDb();
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

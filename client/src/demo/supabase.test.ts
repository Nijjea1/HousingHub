import { beforeEach, describe, expect, it, vi } from 'vitest';
import { favoriteFromRow, inboxEntryFromRow, savedListingFromRow, type FavoriteRow, type InboxRow, type ListingRow } from '@shared/mappers';
import { DEMO_PASSWORD } from '@shared/demo';
import { demoSupabase as supabase } from './supabase';
import { getState, reloadFromStorage, resetDemo } from './store';

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
  reloadFromStorage();
  resetDemo();
});

const signIn = (email: string) => supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
const studentId = () => getState().users.find((u) => u.email === 'demo-student@example.com')!.id;
const landlordId = () => getState().users.find((u) => u.email === 'demo-landlord@example.com')!.id;
// A listing the seeded student has not saved yet (the seed has one favorite).
const listingId = () => getState().listings.find((l) => !getState().favorites.some((f) => f.listing_id === l.id))!.id;

describe('auth', () => {
  it('signs the demo accounts in with the published password and refuses a wrong one', async () => {
    expect((await supabase.auth.signInWithPassword({ email: 'demo-student@example.com', password: 'nope' })).error?.message).toBe('Invalid login credentials');
    const { data, error } = await signIn('Demo-Student@example.com');
    expect(error).toBeNull();
    expect(data.user?.id).toBe(studentId());
    expect((await supabase.auth.getSession()).data.session?.user.email).toBe('demo-student@example.com');
  });

  it('tells listeners about the starting session, sign-in and sign-out', async () => {
    const events: string[] = [];
    const { data } = supabase.auth.onAuthStateChange((event) => events.push(event));
    await Promise.resolve();
    await signIn('demo-student@example.com');
    await supabase.auth.signOut();
    data.subscription.unsubscribe();
    await signIn('demo-student@example.com');
    expect(events).toEqual(['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT']);
    expect((await supabase.auth.getSession()).data.session).not.toBeNull();
  });

  it('signs up a new account with a profile, as the database trigger would, and signs it in', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'New@Example.com',
      password: 'long-enough-1',
      options: { data: { full_name: 'Nia New', role: 'landlord', university_id: 'not-a-school' } },
    });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
    const profile = getState().profiles.find((p) => p.id === data.user!.id)!;
    expect(profile).toMatchObject({ full_name: 'Nia New', role: 'landlord', university_id: null });
    await supabase.auth.signOut();
    expect((await supabase.auth.signInWithPassword({ email: 'new@example.com', password: 'long-enough-1' })).error).toBeNull();
  });

  it('refuses a duplicate email and a short password', async () => {
    expect((await supabase.auth.signUp({ email: 'demo-student@example.com', password: 'long-enough-1' })).error?.message).toBe('User already registered');
    expect((await supabase.auth.signUp({ email: 'x@example.com', password: 'short' })).error?.message).toMatch(/at least/);
  });
});

describe('tables, queried the way the hooks query them', () => {
  it('universities: active, by name', async () => {
    const { data, error } = await supabase.from('universities').select('*').eq('is_active', true).order('name');
    expect(error).toBeNull();
    expect((data as Array<{ id: string }>).map((u) => u.id)).toEqual(['mcmaster']);
  });

  it('profiles: maybeSingle finds one and returns null for none', async () => {
    expect(((await supabase.from('profiles').select('*').eq('id', landlordId()).maybeSingle()).data as { full_name: string }).full_name).toBe('Lee Landlord');
    expect((await supabase.from('profiles').select('*').eq('id', 'nobody').maybeSingle()).data).toBeNull();
  });

  it('profiles: update changes only the matching row', async () => {
    await supabase.from('profiles').update({ full_name: 'Sam S.' }).eq('id', studentId());
    expect(getState().profiles.find((p) => p.id === studentId())!.full_name).toBe('Sam S.');
    expect(getState().profiles.find((p) => p.id === landlordId())!.full_name).toBe('Lee Landlord');
  });

  it('user_preferences: upsert by user, then read back', async () => {
    const row = { user_id: studentId(), max_rent: 900, housing_types: ['house'], bedrooms: null, looking_for: null, wants_roommates: false };
    await supabase.from('user_preferences').upsert(row);
    await supabase.from('user_preferences').upsert({ ...row, max_rent: 1000 });
    const { data } = await supabase.from('user_preferences').select('*').eq('user_id', studentId()).maybeSingle();
    expect(data).toMatchObject({ max_rent: 1000 });
    expect(getState().user_preferences).toHaveLength(1);
  });

  it('favorites: insert with select().single(), refuse a duplicate, list, note, collection, delete', async () => {
    const id = listingId();
    const added = await supabase.from('favorites').insert({ user_id: studentId(), listing_id: id }).select().single();
    expect(added.error).toBeNull();
    expect(favoriteFromRow(added.data as FavoriteRow)).toMatchObject({ listingId: id, note: null, collectionName: null });

    const dup = await supabase.from('favorites').insert({ user_id: studentId(), listing_id: id }).select().single();
    expect(dup.error?.code).toBe('23505');

    await supabase.from('favorites').upsert({ user_id: studentId(), listing_id: id, note: 'Ask about parking' }, { onConflict: 'user_id,listing_id' });
    await supabase.from('favorites').upsert({ user_id: studentId(), listing_id: id, collection_name: 'Top picks' }, { onConflict: 'user_id,listing_id' });
    const mine = (await supabase.from('favorites').select('*').eq('user_id', studentId())).data as FavoriteRow[];
    const fav = mine.find((f) => f.listing_id === id)!;
    expect(fav).toMatchObject({ note: 'Ask about parking', collection_name: 'Top picks' });

    await supabase.from('favorites').delete().eq('user_id', studentId()).eq('listing_id', id);
    expect(getState().favorites.some((f) => f.listing_id === id && f.user_id === studentId())).toBe(false);
  });

  it('favorites: embeds the listing for the profile page, newest first', async () => {
    const id = listingId();
    await supabase.from('favorites').insert({ user_id: studentId(), listing_id: id, created_at: '2099-01-01T00:00:00.000Z' });
    const { data } = await supabase.from('favorites').select('*, listing:listings(*)').eq('user_id', studentId()).order('created_at', { ascending: false });
    const saved = (data as Array<FavoriteRow & { listing: ListingRow | null }>).map(savedListingFromRow);
    expect(saved[0]?.listing.id).toBe(id);
    expect(saved.every((s) => s !== null)).toBe(true);
  });

  it('messages: head count of unread, thread in order, and marking read', async () => {
    const conversation = getState().conversations[0];
    const unread = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', studentId())
      .eq('is_read', false)
      .not('conversation_id', 'is', null);
    expect(unread.data).toBeNull();
    expect(typeof unread.count).toBe('number');

    const thread = (await supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true })).data as Array<{ created_at: string }>;
    expect(thread.length).toBe(2);
    expect(thread[0].created_at <= thread[1].created_at).toBe(true);

    await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversation.id).eq('receiver_id', studentId()).eq('is_read', false);
    const after = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', studentId()).eq('is_read', false);
    expect(after.count).toBe(0);
  });

  it('user_presence: upsert is accepted and kept out of saved state', async () => {
    expect((await supabase.from('user_presence').upsert({ user_id: studentId(), last_seen_at: new Date().toISOString() })).error).toBeNull();
    expect(JSON.stringify(getState())).not.toContain('last_seen_at');
  });

  it('reports an unknown table as an error instead of throwing', async () => {
    const { error } = await supabase.from('payments').select('*');
    expect(error?.message).toMatch(/no table/);
  });
});

describe('the inbox function', () => {
  it('returns only the caller\'s conversations, with the other person and unread count', async () => {
    expect((await supabase.rpc('my_conversations')).data).toEqual([]);
    await signIn('demo-student@example.com');
    const rows = (await supabase.rpc('my_conversations')).data as InboxRow[];
    expect(rows).toHaveLength(1);
    const entry = inboxEntryFromRow(rows[0]);
    expect(entry).toMatchObject({ otherUserId: landlordId(), otherName: 'Lee Landlord', lastMessage: expect.any(String) });
    expect(entry.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it('answers an unknown function with an error', async () => {
    expect((await supabase.rpc('drop_everything')).error).not.toBeNull();
  });
});

describe('realtime', () => {
  it('delivers message inserts to a subscriber who sent or received them, and stops after removal', async () => {
    await signIn('demo-student@example.com');
    const heard: unknown[] = [];
    const ch = supabase.channel('messages:me').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p) => heard.push(p)).subscribe();
    const conversation = getState().conversations[0];
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: landlordId(),
      receiver_id: studentId(),
      listing_id: conversation.listing_id,
      content: 'Live hello',
    });
    await supabase.from('messages').insert({ conversation_id: null, sender_id: 'a', receiver_id: 'b', listing_id: conversation.listing_id, content: 'Not for you' });
    supabase.removeChannel(ch);
    await supabase.from('messages').insert({ conversation_id: conversation.id, sender_id: landlordId(), receiver_id: studentId(), listing_id: conversation.listing_id, content: 'After removal' });
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({ eventType: 'INSERT', new: { content: 'Live hello' } });
  });
});

describe('storage', () => {
  it('stores an upload and hands back a URL that removal clears', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' });
    const bucket = supabase.storage.from('listing-images');
    expect((await bucket.upload('me/photo.png', file)).error).toBeNull();
    const url = bucket.getPublicUrl('me/photo.png').data.publicUrl;
    expect(url).toMatch(/^data:image\/png;base64,/);
    await bucket.remove(['me/photo.png']);
    expect(bucket.getPublicUrl('me/photo.png').data.publicUrl).toBe('');
  });
});

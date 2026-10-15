-- Messaging: one conversation per listing per student, messages that belong to
-- a conversation, and a private "last seen" time for offline email alerts.

-- student_id is whoever asks about the listing; landlord_id is the listing's owner.
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id) on delete cascade,
    student_id uuid not null references auth.users(id) on delete cascade,
    landlord_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    last_message_at timestamptz not null default now(),
    unique (listing_id, student_id),
    constraint conversations_not_self_check check (student_id <> landlord_id)
);

create index if not exists idx_conversations_student on public.conversations(student_id, last_message_at desc);
create index if not exists idx_conversations_landlord on public.conversations(landlord_id, last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists "Participants can read their conversations" on public.conversations;
create policy "Participants can read their conversations" on public.conversations
    for select using (auth.uid() = student_id or auth.uid() = landlord_id);

-- You can only open a conversation as yourself, and only with the listing's real owner.
drop policy if exists "Users can start a conversation about a listing" on public.conversations;
create policy "Users can start a conversation about a listing" on public.conversations
    for insert with check (
        auth.uid() = student_id
        and landlord_id = (select l.user_id from public.listings l where l.id = listing_id)
    );

-- No update or delete policies: last_message_at is maintained by the trigger below.
revoke update, delete on public.conversations from anon, authenticated;

-- Messages join a conversation. Older messages are attached to one when the
-- conversation is clear (one side owns the listing); others stay unattached.
alter table public.messages add column if not exists conversation_id uuid
    references public.conversations(id) on delete cascade;
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_messages_unread on public.messages(receiver_id) where not is_read;

insert into public.conversations (listing_id, student_id, landlord_id, created_at, last_message_at)
select m.listing_id,
       case when m.sender_id = l.user_id then m.receiver_id else m.sender_id end,
       l.user_id,
       min(m.created_at),
       max(m.created_at)
from public.messages m
join public.listings l on l.id = m.listing_id
where m.conversation_id is null
  and l.user_id in (m.sender_id, m.receiver_id)
group by 1, 2, 3
on conflict (listing_id, student_id) do nothing;

update public.messages m set conversation_id = c.id
from public.conversations c, public.listings l
where m.conversation_id is null
  and l.id = m.listing_id
  and l.user_id in (m.sender_id, m.receiver_id)
  and c.listing_id = m.listing_id
  and c.landlord_id = l.user_id
  and c.student_id = case when m.sender_id = l.user_id then m.receiver_id else m.sender_id end;

alter table public.messages alter column is_read set default false;
update public.messages set is_read = false where is_read is null;
alter table public.messages alter column is_read set not null;

-- A new message must belong to a conversation the sender is in, go to the
-- other participant, and name the conversation's listing.
drop policy if exists "Users can send messages as themselves" on public.messages;
drop policy if exists "Participants can send messages in their conversations" on public.messages;
create policy "Participants can send messages in their conversations" on public.messages
    for insert with check (
        auth.uid() = sender_id
        and exists (
            select 1 from public.conversations c
            where c.id = conversation_id
              and c.listing_id = messages.listing_id
              and (
                  (c.student_id = sender_id and c.landlord_id = receiver_id)
                  or (c.landlord_id = sender_id and c.student_id = receiver_id)
              )
        )
    );

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
    return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
    after insert on public.messages
    for each row execute function public.touch_conversation();

-- The inbox in one query: each of the caller's conversations with its listing,
-- the other person's public profile, the last message and the caller's unread
-- count. security invoker (the default), so the policies above still apply.
create or replace function public.my_conversations()
returns table (
    id uuid,
    listing_id uuid,
    listing_title text,
    listing_image text,
    other_user_id uuid,
    other_name text,
    other_avatar_url text,
    last_message text,
    last_sender_id uuid,
    last_message_at timestamptz,
    unread_count integer
)
language sql
stable
set search_path = ''
as $$
    select c.id,
           c.listing_id,
           l.title::text,
           l.images[1],
           o.other_id,
           p.full_name::text,
           p.avatar_url::text,
           lm.content,
           lm.sender_id,
           c.last_message_at,
           (select count(*)::int from public.messages m
             where m.conversation_id = c.id and m.receiver_id = auth.uid() and not m.is_read)
    from public.conversations c
    join public.listings l on l.id = c.listing_id
    cross join lateral (
        select case when c.student_id = auth.uid() then c.landlord_id else c.student_id end as other_id
    ) o
    left join public.profiles p on p.id = o.other_id
    left join lateral (
        select m.content, m.sender_id from public.messages m
        where m.conversation_id = c.id
        order by m.created_at desc
        limit 1
    ) lm on true
    where auth.uid() in (c.student_id, c.landlord_id)
    order by c.last_message_at desc;
$$;

grant execute on function public.my_conversations to authenticated;

-- Last time each user had the app open. Private: only the owner reads or
-- writes it; the API's notifier reads it with the service role key.
create table if not exists public.user_presence (
    user_id uuid primary key references auth.users(id) on delete cascade,
    last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

drop policy if exists "Users manage their own presence" on public.user_presence;
create policy "Users manage their own presence" on public.user_presence
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live message updates through Supabase Realtime, which applies the select
-- policies above to every event. The publication only exists on Supabase itself.
do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        if not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
            alter publication supabase_realtime add table public.messages;
        end if;
    end if;
end;
$$;

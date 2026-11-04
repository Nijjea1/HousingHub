-- Saved searches, viewing requests, reviews and a commute cache.

-- A named set of search filters, private to its owner.
create table if not exists public.saved_searches (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name varchar(80) not null check (length(btrim(name)) > 0),
    params jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_saved_searches_user on public.saved_searches(user_id, created_at desc);

alter table public.saved_searches enable row level security;

drop policy if exists "Users manage their own saved searches" on public.saved_searches;
create policy "Users manage their own saved searches" on public.saved_searches
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A student proposes a time to see a listing; the owner accepts or declines.
-- landlord_id is the listing's owner, like conversations.
create table if not exists public.viewing_requests (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id) on delete cascade,
    student_id uuid not null references auth.users(id) on delete cascade,
    landlord_id uuid not null references auth.users(id) on delete cascade,
    proposed_at timestamptz not null,
    message text check (message is null or length(message) <= 500),
    status varchar(10) not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at timestamptz not null default now(),
    constraint viewing_requests_not_self_check check (student_id <> landlord_id)
);

create index if not exists idx_viewing_requests_student on public.viewing_requests(student_id, proposed_at);
create index if not exists idx_viewing_requests_landlord on public.viewing_requests(landlord_id, proposed_at);
create index if not exists idx_viewing_requests_listing on public.viewing_requests(listing_id);

alter table public.viewing_requests enable row level security;

drop policy if exists "Participants can read viewing requests" on public.viewing_requests;
create policy "Participants can read viewing requests" on public.viewing_requests
    for select using (auth.uid() = student_id or auth.uid() = landlord_id);

drop policy if exists "Students can request a viewing" on public.viewing_requests;
create policy "Students can request a viewing" on public.viewing_requests
    for insert with check (
        auth.uid() = student_id
        and status = 'pending'
        and landlord_id = (select l.user_id from public.listings l where l.id = listing_id)
    );

-- Only the listing's owner answers, and only the status can change.
drop policy if exists "Owners can answer viewing requests" on public.viewing_requests;
create policy "Owners can answer viewing requests" on public.viewing_requests
    for update using (auth.uid() = landlord_id) with check (auth.uid() = landlord_id);

revoke update on public.viewing_requests from anon, authenticated;
grant update (status) on public.viewing_requests to authenticated;
revoke delete on public.viewing_requests from anon, authenticated;

-- One review per person per listing, never by the listing's own owner.
create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id) on delete cascade,
    author_id uuid not null references auth.users(id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    body text not null check (length(btrim(body)) > 0 and length(body) <= 1000),
    created_at timestamptz not null default now(),
    unique (listing_id, author_id)
);

create index if not exists idx_reviews_listing on public.reviews(listing_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are publicly readable" on public.reviews;
create policy "Reviews are publicly readable" on public.reviews
    for select using (true);

drop policy if exists "Users can review a listing they do not own" on public.reviews;
create policy "Users can review a listing they do not own" on public.reviews
    for insert with check (
        auth.uid() = author_id
        and auth.uid() <> (select l.user_id from public.listings l where l.id = listing_id)
    );

drop policy if exists "Authors can edit their reviews" on public.reviews;
create policy "Authors can edit their reviews" on public.reviews
    for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Authors can delete their reviews" on public.reviews;
create policy "Authors can delete their reviews" on public.reviews
    for delete using (auth.uid() = author_id);

revoke update on public.reviews from anon, authenticated;
grant update (rating, body) on public.reviews to authenticated;

-- Commute from a listing to its campus, one row per mode. Written only by the
-- API with the service role key; geometry is an encoded polyline.
create table if not exists public.commute_cache (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id) on delete cascade,
    mode varchar(10) not null check (mode in ('walk', 'bike', 'drive', 'transit')),
    minutes numeric(6, 1) not null check (minutes >= 0),
    distance_m integer check (distance_m is null or distance_m >= 0),
    geometry text,
    fetched_at timestamptz not null default now(),
    unique (listing_id, mode)
);

alter table public.commute_cache enable row level security;

drop policy if exists "Commute times are publicly readable" on public.commute_cache;
create policy "Commute times are publicly readable" on public.commute_cache
    for select using (true);

revoke insert, update, delete on public.commute_cache from anon, authenticated;

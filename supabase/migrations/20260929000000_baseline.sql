-- Baseline: the schema that was previously hand-applied from db/schema.sql.
-- Written to be idempotent so it is a no-op on a project that already has it.

create table if not exists public.listings (
    id uuid primary key default gen_random_uuid(),
    title varchar(100) not null,
    description text not null,
    detailed_description text,
    price decimal(10,2) not null,
    property_type varchar(50) not null,
    bedrooms integer not null,
    bathrooms decimal(3,1) not null,
    square_feet integer,
    address text not null,
    city varchar(100) not null,
    state varchar(50) not null,
    zip_code varchar(20) not null,
    latitude decimal(10,8),
    longitude decimal(11,8),
    amenities text[] default '{}',
    images text[] default '{}',
    is_available boolean default true,
    available_from date,
    lease_term varchar(50),
    pets_allowed boolean,
    furnished boolean,
    utilities_included text[] default '{}',
    nearby_places text[] default '{}',
    distance_from_campus varchar(100),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    listing_id uuid not null references public.listings(id) on delete cascade,
    note text,
    created_at timestamptz not null default now(),
    unique (user_id, listing_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references auth.users(id) on delete cascade,
    receiver_id uuid not null references auth.users(id) on delete cascade,
    listing_id uuid not null references public.listings(id) on delete cascade,
    content text not null,
    is_read boolean default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_listings_user_id on public.listings(user_id);
create index if not exists idx_listings_city on public.listings(city);
create index if not exists idx_listings_price on public.listings(price);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_listing_id on public.favorites(listing_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_messages_listing_id on public.messages(listing_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists update_listings_updated_at on public.listings;
create trigger update_listings_updated_at
    before update on public.listings
    for each row execute function public.update_updated_at_column();

alter table public.listings enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "Listings are viewable by everyone" on public.listings;
create policy "Listings are viewable by everyone" on public.listings
    for select using (true);

drop policy if exists "Users can insert their own listings" on public.listings;
create policy "Users can insert their own listings" on public.listings
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own listings" on public.listings;
create policy "Users can update their own listings" on public.listings
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own listings" on public.listings;
create policy "Users can delete their own listings" on public.listings
    for delete using (auth.uid() = user_id);

drop policy if exists "Users can view their own favorites" on public.favorites;
create policy "Users can view their own favorites" on public.favorites
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites" on public.favorites
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own favorites" on public.favorites;
create policy "Users can update their own favorites" on public.favorites
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites" on public.favorites
    for delete using (auth.uid() = user_id);

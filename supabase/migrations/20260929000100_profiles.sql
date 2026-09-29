-- Public profile for every auth user, plus private per-user preferences.
-- auth.users is not reachable through the API, so app-level user data lives here.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text check (char_length(full_name) <= 100),
    university_id text references public.universities(id) on delete set null,
    avatar_url text,
    role text not null default 'student' check (role in ('student', 'landlord')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Kept separate from profiles because profiles are publicly readable
-- (a listing shows its landlord's name) but preferences are not.
create table if not exists public.user_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    max_rent integer check (max_rent is null or max_rent >= 0),
    housing_types text[] not null default '{}',
    bedrooms text,
    looking_for text,
    wants_roommates boolean not null default false,
    updated_at timestamptz not null default now()
);

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
    before update on public.profiles
    for each row execute function public.update_updated_at_column();

drop trigger if exists update_user_preferences_updated_at on public.user_preferences;
create trigger update_user_preferences_updated_at
    before update on public.user_preferences
    for each row execute function public.update_updated_at_column();

-- Create the profile row when someone signs up. Name, university and role come from
-- the metadata passed to supabase.auth.signUp({ options: { data } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name, university_id, role)
    values (
        new.id,
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        -- Ignore unknown ids instead of failing the signup on the foreign key.
        (select u.id from public.universities u where u.id = new.raw_user_meta_data ->> 'university_id'),
        case when new.raw_user_meta_data ->> 'role' = 'landlord' then 'landlord' else 'student' end
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- The old deletion trigger referenced a non-existent column
-- (collection_items.user_id), which made deleting a user fail. Foreign keys
-- with ON DELETE CASCADE already clean up everything it tried to.
drop trigger if exists on_user_deletion on auth.users;
drop function if exists public.handle_user_deletion();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
    for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can view their own preferences" on public.user_preferences;
create policy "Users can view their own preferences" on public.user_preferences
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences" on public.user_preferences
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences" on public.user_preferences
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

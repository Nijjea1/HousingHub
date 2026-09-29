-- Canadian universities the platform serves. Launching a new campus is a new
-- row here; listings and profiles point at a university by its slug id.

create table if not exists public.universities (
    id text primary key check (id ~ '^[a-z0-9-]+$'),
    name text not null,
    short_name text not null,
    city text not null,
    province char(2) not null check (province in ('AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT')),
    latitude decimal(10,8) not null,
    longitude decimal(11,8) not null,
    is_active boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.universities enable row level security;

drop policy if exists "Universities are viewable by everyone" on public.universities;
create policy "Universities are viewable by everyone" on public.universities
    for select using (true);

insert into public.universities (id, name, short_name, city, province, latitude, longitude, is_active)
values ('mcmaster', 'McMaster University', 'McMaster', 'Hamilton', 'ON', 43.26090000, -79.91920000, true)
on conflict (id) do update set
    name = excluded.name,
    short_name = excluded.short_name,
    city = excluded.city,
    province = excluded.province,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_active = excluded.is_active;

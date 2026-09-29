-- Listings: Canadian address fields, a link to the nearest campus, the
-- neighbourhood the UI shows, and constraints on values the app relies on.

do $$
begin
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'listings' and column_name = 'state') then
        alter table public.listings rename column state to province;
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'listings' and column_name = 'zip_code') then
        alter table public.listings rename column zip_code to postal_code;
    end if;
end;
$$;

alter table public.listings add column if not exists neighborhood varchar(100);
alter table public.listings add column if not exists university_id text
    references public.universities(id) on delete set null;
create index if not exists idx_listings_university_id on public.listings(university_id);

-- Drop the checks first: even NOT VALID constraints are enforced on UPDATE, so
-- the data clean-up below would fail on legacy rows if they were still in place.
alter table public.listings
    drop constraint if exists listings_province_check,
    drop constraint if exists listings_postal_code_check,
    drop constraint if exists listings_property_type_check,
    drop constraint if exists listings_price_check,
    drop constraint if exists listings_rooms_check,
    drop constraint if exists listings_images_check;

update public.listings set property_type = lower(property_type)
    where property_type <> lower(property_type);
update public.listings set property_type = 'apartment'
    where property_type not in ('apartment', 'house', 'dormitory', 'studio');

update public.listings set amenities = '{}' where amenities is null;
update public.listings set images = '{}' where images is null;
update public.listings set utilities_included = '{}' where utilities_included is null;
update public.listings set nearby_places = '{}' where nearby_places is null;
update public.listings set is_available = true where is_available is null;
update public.listings set pets_allowed = false where pets_allowed is null;
update public.listings set furnished = false where furnished is null;

alter table public.listings
    alter column amenities set not null,
    alter column images set not null,
    alter column utilities_included set not null,
    alter column nearby_places set not null,
    alter column is_available set not null,
    alter column pets_allowed set not null,
    alter column pets_allowed set default false,
    alter column furnished set not null,
    alter column furnished set default false;

alter table public.listings
    add constraint listings_property_type_check
        check (property_type in ('apartment', 'house', 'dormitory', 'studio')),
    add constraint listings_price_check check (price > 0),
    add constraint listings_rooms_check
        check (bedrooms >= 0 and bathrooms >= 0 and (square_feet is null or square_feet > 0)),
    add constraint listings_images_check check (cardinality(images) <= 10),
    -- NOT VALID: enforced for new and edited rows without rejecting legacy US test data.
    add constraint listings_province_check
        check (province in ('AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT')) not valid,
    add constraint listings_postal_code_check
        check (postal_code ~ '^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$') not valid;

create index if not exists idx_listings_created_at on public.listings(created_at desc);

-- Favorites: collections are tags on a favorite. The separate collections /
-- collection_items tables were never used by the app.

alter table public.favorites add column if not exists collection_name varchar(100);
drop table if exists public.collection_items;
drop table if exists public.collections;

-- Messages: row level security was never enabled, so any client holding the
-- public anon key could read every message.

alter table public.messages enable row level security;

alter table public.messages drop constraint if exists messages_not_self_check;
alter table public.messages add constraint messages_not_self_check
    check (sender_id <> receiver_id);

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check
    check (char_length(content) between 1 and 2000);

drop policy if exists "Participants can read their messages" on public.messages;
create policy "Participants can read their messages" on public.messages
    for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can send messages as themselves" on public.messages;
create policy "Users can send messages as themselves" on public.messages
    for insert with check (auth.uid() = sender_id);

drop policy if exists "Receivers can mark messages read" on public.messages;
create policy "Receivers can mark messages read" on public.messages
    for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

-- The update policy above is row-level; limit it to the is_read column so a
-- receiver cannot rewrite the content of a message they were sent.
revoke update on public.messages from anon, authenticated;
grant update (is_read) on public.messages to authenticated;

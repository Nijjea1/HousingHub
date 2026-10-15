-- Location search: a geography point per listing, a spatial index on it, and
-- one function that runs the radius search together with the browse filters.

set search_path = public, extensions;

create extension if not exists postgis with schema extensions;

-- Generated from latitude/longitude so the app never writes it and it can't
-- drift from the coordinates the geocoder stored.
alter table public.listings add column if not exists location geography(Point, 4326)
    generated always as (
        case when latitude is not null and longitude is not null
            then st_setsrid(st_makepoint(longitude::float8, latitude::float8), 4326)::geography
        end
    ) stored;

create index if not exists idx_listings_location on public.listings using gist (location);

-- Distances use a sphere (use_spheroid = false) so they match the haversine
-- formula in shared/search.ts; the difference from the spheroid is under 0.5%.
--
-- plpgsql rather than sql: each call is planned with the real argument values,
-- so "center is null or st_dwithin(...)" folds to plain st_dwithin and the
-- planner can use idx_listings_location.
create or replace function public.search_listings(
    center_lat double precision default null,
    center_lng double precision default null,
    radius_m double precision default null,
    min_price numeric default null,
    max_price numeric default null,
    min_bedrooms integer default null,
    min_bathrooms numeric default null,
    property_types text[] default null,
    required_amenities text[] default null,
    is_furnished boolean default null,
    allows_pets boolean default null,
    sort_by text default 'newest',
    max_results integer default 200
)
returns table (listing public.listings, distance_m double precision)
language plpgsql
stable
set search_path = public, extensions
as $$
declare
    center geography := case
        when center_lat is not null and center_lng is not null
            then st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography
    end;
begin
    return query
    select s.l, s.d
    from (
        select l, case when center is null then null else st_distance(l.location, center, false) end as d
        from public.listings l
        where l.is_available
          and (center is null or radius_m is null or st_dwithin(l.location, center, radius_m, false))
          and (min_price is null or l.price >= min_price)
          and (max_price is null or l.price <= max_price)
          and (min_bedrooms is null or l.bedrooms >= min_bedrooms)
          and (min_bathrooms is null or l.bathrooms >= min_bathrooms)
          and (property_types is null or cardinality(property_types) = 0 or l.property_type = any (property_types))
          and (is_furnished is null or l.furnished = is_furnished)
          and (allows_pets is null or l.pets_allowed = allows_pets)
          -- Every wanted amenity must be on the listing, ignoring case.
          and (required_amenities is null or not exists (
                select 1 from unnest(required_amenities) want
                where lower(want) <> all (select lower(have) from unnest(l.amenities) have)))
    ) s
    order by
        case when sort_by = 'distance' then s.d end asc nulls last,
        case when sort_by = 'price-low' then (s.l).price end asc,
        case when sort_by = 'price-high' then (s.l).price end desc,
        (s.l).created_at desc,
        (s.l).id
    limit least(greatest(coalesce(max_results, 200), 1), 500);
end;
$$;

grant execute on function public.search_listings to anon, authenticated;

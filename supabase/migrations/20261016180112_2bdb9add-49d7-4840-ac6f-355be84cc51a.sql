-- realestate schema app tables

create or replace function realestate.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create table realestate.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null default 'Belgrade',
  area text not null,
  price_eur numeric(10,2) not null,
  beds integer not null default 1,
  baths integer not null default 1,
  size_m2 numeric(8,2) not null,
  furnished boolean not null default false,
  image_url text,
  source text not null,
  source_url text,
  found_at timestamptz not null default now(),
  score integer not null default 0,
  risk text not null default 'low' check (risk in ('low','medium','high')),
  duplicate_count integer not null default 0,
  map_x numeric(5,2) not null default 50,
  map_y numeric(5,2) not null default 50,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table realestate.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references realestate.listings(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table realestate.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  areas text[] not null default '{}',
  min_price numeric(10,2),
  max_price numeric(10,2),
  property_type text,
  move_in_date date,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table realestate.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references realestate.listings(id) on delete cascade,
  saved_search_id uuid references realestate.saved_searches(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table realestate.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'not_configured',
  last_job_at timestamptz,
  quota_used integer not null default 0,
  quota_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table realestate.area_stats (
  id uuid primary key default gen_random_uuid(),
  area text,
  period text not null,
  avg_price numeric(10,2) not null,
  sample_size integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area, period)
);

-- grants (realestate is not public: explicit schema usage required)
grant usage on schema realestate to anon, authenticated, service_role;
grant select on realestate.listings to authenticated;
grant all on realestate.listings to service_role;
grant select, insert, update, delete on realestate.favorites to authenticated;
grant all on realestate.favorites to service_role;
grant select, insert, update, delete on realestate.saved_searches to authenticated;
grant all on realestate.saved_searches to service_role;
grant select, insert, update, delete on realestate.alerts to authenticated;
grant all on realestate.alerts to service_role;
grant select on realestate.sources to authenticated;
grant all on realestate.sources to service_role;
grant select on realestate.area_stats to authenticated;
grant all on realestate.area_stats to service_role;

alter table realestate.listings enable row level security;
alter table realestate.favorites enable row level security;
alter table realestate.saved_searches enable row level security;
alter table realestate.alerts enable row level security;
alter table realestate.sources enable row level security;
alter table realestate.area_stats enable row level security;

create policy "Signed-in users can view listings" on realestate.listings for select to authenticated using (true);
create policy "Users view own favorites" on realestate.favorites for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own favorites" on realestate.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own favorites" on realestate.favorites for delete to authenticated using (auth.uid() = user_id);
create policy "Users update own favorites" on realestate.favorites for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own saved searches" on realestate.saved_searches for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own saved searches" on realestate.saved_searches for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own saved searches" on realestate.saved_searches for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own saved searches" on realestate.saved_searches for delete to authenticated using (auth.uid() = user_id);
create policy "Users view own alerts" on realestate.alerts for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own alerts" on realestate.alerts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own alerts" on realestate.alerts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own alerts" on realestate.alerts for delete to authenticated using (auth.uid() = user_id);
create policy "Signed-in users can view sources" on realestate.sources for select to authenticated using (true);
create policy "Signed-in users can view area stats" on realestate.area_stats for select to authenticated using (true);

create trigger set_listings_updated_at before update on realestate.listings for each row execute function realestate.set_updated_at();
create trigger set_saved_searches_updated_at before update on realestate.saved_searches for each row execute function realestate.set_updated_at();
create trigger set_sources_updated_at before update on realestate.sources for each row execute function realestate.set_updated_at();
create trigger set_area_stats_updated_at before update on realestate.area_stats for each row execute function realestate.set_updated_at();

-- seed: the 6 sample apartments shown in the UI
insert into realestate.listings (id, title, area, price_eur, beds, baths, size_m2, furnished, source, found_at, score, risk, duplicate_count, map_x, map_y) values
('00000001-0000-0000-0000-000000000001', 'Bright 2BR with skyline view', 'Vračar', 950, 2, 1, 72, true, 'Halo Oglasi', now() - interval '4 minutes', 94, 'low', 2, 38, 30),
('00000001-0000-0000-0000-000000000002', 'Terrace apartment with pool', 'Dedinje', 2400, 3, 2, 140, true, 'Facebook group', now() - interval '12 minutes', 88, 'low', 0, 22, 62),
('00000001-0000-0000-0000-000000000003', 'High-rise loft near river', 'Belgrade Waterfront', 1350, 2, 2, 88, false, '4zida', now() - interval '31 minutes', 81, 'medium', 1, 55, 48),
('00000001-0000-0000-0000-000000000004', 'Cozy studio, quiet street', 'Dorćol', 480, 1, 1, 34, true, 'Reddit', now() - interval '1 hour', 76, 'high', 3, 62, 20),
('00000001-0000-0000-0000-000000000005', 'Renovated flat by the park', 'Novi Beograd', 720, 2, 1, 61, false, 'Nekretnine.rs', now() - interval '2 hours', 72, 'low', 0, 30, 80),
('00000001-0000-0000-0000-000000000006', 'Penthouse with two terraces', 'Senjak', 1800, 3, 2, 120, true, 'Instagram', now() - interval '3 hours', 69, 'medium', 1, 48, 70);

-- seed: admin sources
insert into realestate.sources (name, status) values
('Rental portals (scraper)', 'not_configured'),
('Facebook Graph API', 'credentials_needed'),
('Reddit API', 'credentials_needed'),
('X API', 'credentials_needed'),
('RSS feeds', 'not_configured');

-- seed: average rent by neighborhood (current month) + city-wide monthly trend
insert into realestate.area_stats (area, period, avg_price, sample_size) values
('Dedinje', '2026-10', 1900, 12),
('Senjak', '2026-10', 1500, 9),
('Belgrade Waterfront', '2026-10', 1350, 15),
('Vračar', '2026-10', 980, 28),
('Dorćol', '2026-10', 850, 22),
('Novi Beograd', '2026-10', 720, 31);

insert into realestate.area_stats (area, period, avg_price, sample_size) values
(null, '2025-11', 810, 210),
(null, '2025-12', 830, 218),
(null, '2026-01', 845, 224),
(null, '2026-02', 860, 231),
(null, '2026-03', 880, 240),
(null, '2026-04', 870, 236),
(null, '2026-05', 900, 248),
(null, '2026-06', 920, 255),
(null, '2026-07', 935, 261),
(null, '2026-08', 950, 268),
(null, '2026-09', 960, 272),
(null, '2026-10', 975, 278);
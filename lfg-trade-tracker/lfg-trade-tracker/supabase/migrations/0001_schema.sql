-- =====================================================================
-- LFG Trade Tracker — 0001 schema
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type public.user_role         as enum ('admin', 'standard');
create type public.finance_type      as enum ('lease', 'loan');
create type public.trade_status      as enum (
  'new', 'waiting_mmr', 'waiting_appraisal', 'appraised',
  'waiting_decision', 'completed', 'archived'
);
create type public.disposition_type  as enum (
  'pending', 'dealer_return', 'sold', 'customer_keeping',
  'lease_buyout', 'no_trade', 'other'
);

-- ---------------------------------------------------------------- users
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null,
  role        public.user_role not null default 'standard',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Mirror every new auth user into public.users.
-- The very first account to sign up becomes the admin.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role;
begin
  if (select count(*) from public.users) = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role, 'standard'
    );
  end if;

  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    assigned_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Role helper. security definer so policies can read the role without
-- recursing through public.users' own policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function public.current_user_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(name, ''), email) from public.users where id = auth.uid();
$$;

-- ------------------------------------------------------- lookup tables
create table public.brokers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.banks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- trades
create table public.trades (
  id                  uuid primary key default gen_random_uuid(),
  vin                 text not null check (char_length(vin) = 17),
  year                integer check (year between 1900 and 2100),
  make                text,
  model               text,
  trim                text,
  current_mileage     integer not null check (current_mileage >= 0),
  client_name         text not null check (char_length(btrim(client_name)) > 0),
  broker_id           uuid not null references public.brokers (id) on delete restrict,
  finance_type        public.finance_type not null,
  bank_id             uuid not null references public.banks (id) on delete restrict,
  current_payoff      numeric(12,2) check (current_payoff is null or current_payoff >= 0),
  payoff_good_through date,
  status              public.trade_status not null default 'new',
  disposition         public.disposition_type not null default 'pending',
  date_added          date not null default current_date,
  created_by          uuid references public.users (id),
  updated_by          uuid references public.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz
);

create index trades_date_added_idx  on public.trades (date_added desc);
create index trades_archived_idx    on public.trades (archived_at);
create index trades_vin_idx         on public.trades (vin);
create index trades_status_idx      on public.trades (status);
create index trades_disposition_idx on public.trades (disposition);
create index trades_broker_idx      on public.trades (broker_id);
create index trades_bank_idx        on public.trades (bank_id);
create index trades_client_idx      on public.trades (lower(client_name));

-- ---------------------------------------------------------- mmr entries
create table public.mmr_entries (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references public.trades (id) on delete cascade,
  mmr_value    numeric(12,2) not null check (mmr_value >= 0),
  checked_date date not null default current_date,
  mileage      integer check (mileage is null or mileage >= 0),
  notes        text,
  entered_by   uuid references public.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index mmr_entries_trade_idx on public.mmr_entries (trade_id, checked_date desc, created_at desc);

-- ---------------------------------------------------- appraisal entries
create table public.appraisal_entries (
  id              uuid primary key default gen_random_uuid(),
  trade_id        uuid not null references public.trades (id) on delete cascade,
  appraised_value numeric(12,2) not null check (appraised_value >= 0),
  appraisal_date  date not null default current_date,
  mileage         integer check (mileage is null or mileage >= 0),
  notes           text,
  appraised_by    uuid references public.users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index appraisal_entries_trade_idx on public.appraisal_entries (trade_id, appraisal_date desc, created_at desc);

-- --------------------------------------------------------- dispositions
create table public.dispositions (
  id                  uuid primary key default gen_random_uuid(),
  trade_id            uuid not null unique references public.trades (id) on delete cascade,
  disposition_type    public.disposition_type not null,
  destination_name    text,
  dealer_location     text,
  disposition_date    date,
  sale_price          numeric(12,2) check (sale_price is null or sale_price >= 0),
  confirmation_number text,
  contact_information text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------- trade notes
create table public.trade_notes (
  id         uuid primary key default gen_random_uuid(),
  trade_id   uuid not null references public.trades (id) on delete cascade,
  note       text not null check (char_length(btrim(note)) > 0),
  created_by uuid references public.users (id),
  created_at timestamptz not null default now()
);
create index trade_notes_trade_idx on public.trade_notes (trade_id, created_at desc);

-- -------------------------------------------------------- activity logs
create table public.activity_logs (
  id             uuid primary key default gen_random_uuid(),
  trade_id       uuid references public.trades (id) on delete cascade,
  user_id        uuid references public.users (id),
  action         text not null,
  field_label    text,
  previous_value text,
  new_value      text,
  created_at     timestamptz not null default now()
);
create index activity_logs_trade_idx on public.activity_logs (trade_id, created_at desc);

-- --------------------------------------------------- application settings
create table public.application_settings (
  id            uuid primary key default gen_random_uuid(),
  setting_key   text not null unique,
  setting_value text,
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------ updated_at glue
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trades_touch            before update on public.trades            for each row execute function public.touch_updated_at();
create trigger mmr_touch               before update on public.mmr_entries       for each row execute function public.touch_updated_at();
create trigger appraisal_touch         before update on public.appraisal_entries for each row execute function public.touch_updated_at();
create trigger dispositions_touch      before update on public.dispositions      for each row execute function public.touch_updated_at();
create trigger settings_touch          before update on public.application_settings for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- the view
-- One row per trade with the latest + previous MMR and appraisal already
-- resolved, so the dashboard is a single query.
create view public.trade_list
with (security_invoker = on) as
select
  t.id,
  t.vin,
  t.year,
  t.make,
  t.model,
  t.trim,
  t.current_mileage,
  t.client_name,
  t.broker_id,
  br.name  as broker_name,
  t.finance_type,
  t.bank_id,
  bk.name  as bank_name,
  t.current_payoff,
  t.payoff_good_through,
  t.status,
  t.disposition,
  t.date_added,
  t.created_at,
  t.updated_at,
  t.archived_at,
  cu.name  as created_by_name,
  uu.name  as updated_by_name,
  m.latest_mmr,
  m.latest_mmr_date,
  m.previous_mmr,
  a.latest_appraisal,
  a.latest_appraisal_date,
  a.previous_appraisal,
  case
    when m.latest_mmr is not null and a.latest_appraisal is not null
    then a.latest_appraisal - m.latest_mmr
  end as spread,
  d.destination_name,
  d.dealer_location,
  d.disposition_date,
  d.sale_price
from public.trades t
left join public.brokers br on br.id = t.broker_id
left join public.banks   bk on bk.id = t.bank_id
left join public.users   cu on cu.id = t.created_by
left join public.users   uu on uu.id = t.updated_by
left join public.dispositions d on d.trade_id = t.id
left join lateral (
  select
    (array_agg(e.mmr_value order by e.checked_date desc, e.created_at desc))[1] as latest_mmr,
    (array_agg(e.checked_date order by e.checked_date desc, e.created_at desc))[1] as latest_mmr_date,
    (array_agg(e.mmr_value order by e.checked_date desc, e.created_at desc))[2] as previous_mmr
  from public.mmr_entries e where e.trade_id = t.id
) m on true
left join lateral (
  select
    (array_agg(e.appraised_value order by e.appraisal_date desc, e.created_at desc))[1] as latest_appraisal,
    (array_agg(e.appraisal_date  order by e.appraisal_date desc, e.created_at desc))[1] as latest_appraisal_date,
    (array_agg(e.appraised_value order by e.appraisal_date desc, e.created_at desc))[2] as previous_appraisal
  from public.appraisal_entries e where e.trade_id = t.id
) a on true;

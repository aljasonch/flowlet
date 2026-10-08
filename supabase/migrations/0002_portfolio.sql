-- USD to IDR rate, set manually by the user (v1 has no FX provider)
alter table public.profiles
  add column usd_idr_rate numeric(18,4)
    check (usd_idr_rate is null or usd_idr_rate > 0),
  add column usd_idr_rate_updated_at timestamptz;

-- holdings: one row per position (not per trade)
create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_type text not null
    check (asset_type in ('stock','crypto','fund','gold','bond','other')),
  symbol text not null check (char_length(symbol) between 1 and 40),   -- display ticker, e.g. BTC
  name text not null check (char_length(name) between 1 and 100),
  platform text check (platform is null or char_length(platform) <= 50), -- broker or exchange, optional
  quantity numeric(38,12) not null check (quantity > 0),
  avg_cost numeric(38,12) not null check (avg_cost >= 0),               -- per unit, in price_currency
  price_currency text not null default 'IDR' check (price_currency in ('IDR','USD')),
  price_source text not null default 'manual' check (price_source in ('manual','coingecko')),
  provider_ref text,                                                     -- e.g. CoinGecko coin id
  manual_price numeric(38,12) check (manual_price is null or manual_price >= 0),
  manual_price_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holdings_provider_rules check (
    (price_source = 'manual' and provider_ref is null)
    or (price_source = 'coingecko' and asset_type = 'crypto' and provider_ref is not null)
  )
);

create index holdings_user_idx on public.holdings (user_id);

-- cached quotes from price providers (written by the refresh route, as the logged-in user)
create table public.price_quotes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null check (source in ('coingecko')),
  ref text not null,                                  -- provider id, e.g. 'bitcoin'
  currency text not null check (currency in ('IDR','USD')),
  price numeric(38,12) not null check (price > 0),
  fetched_at timestamptz not null default now(),
  primary key (user_id, source, ref, currency)
);

-- track when a manual price last changed
create or replace function public.touch_manual_price()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.manual_price is not null then
      new.manual_price_updated_at = now();
    end if;
  elsif new.manual_price is distinct from old.manual_price then
    new.manual_price_updated_at = now();
  end if;
  return new;
end $$;

create trigger holdings_touch_price before insert or update on public.holdings
  for each row execute function public.touch_manual_price();
create trigger holdings_updated before update on public.holdings
  for each row execute function public.set_updated_at();

alter table public.holdings     enable row level security;
alter table public.price_quotes enable row level security;

create policy holdings_own on public.holdings for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy price_quotes_own on public.price_quotes for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Valuation per holding. SECURITY INVOKER, so RLS applies.
-- Gains are computed in the asset's own currency; IDR figures use the CURRENT usd_idr_rate
-- for both value and cost (historical FX is not tracked in v1).
-- A holding with no price, or a USD holding with no rate, has NULL values and is flagged as unpriced.
create or replace function public.portfolio_holdings()
returns table (
  id uuid, asset_type text, symbol text, name text, platform text,
  quantity numeric, avg_cost numeric, price_currency text, price_source text,
  current_price numeric, price_as_of timestamptz,
  value_native numeric, cost_native numeric, gain_native numeric, gain_pct numeric,
  value_idr bigint, cost_idr bigint, gain_idr bigint
)
language sql stable as $$
  with fx as (
    select usd_idr_rate from public.profiles where user_id = (select auth.uid())
  ),
  priced as (
    select
      h.id as h_id, h.asset_type as h_type, h.symbol as h_symbol, h.name as h_name,
      h.platform as h_platform, h.quantity as h_qty, h.avg_cost as h_cost,
      h.price_currency as h_ccy, h.price_source as h_src,
      case h.price_source when 'manual' then h.manual_price else q.price end as px,
      case h.price_source when 'manual' then h.manual_price_updated_at else q.fetched_at end as px_at,
      case h.price_currency when 'IDR' then 1::numeric
           else (select usd_idr_rate from fx) end as rate
    from public.holdings h
    left join public.price_quotes q
      on q.user_id = h.user_id
     and q.source = h.price_source
     and q.ref = h.provider_ref
     and q.currency = h.price_currency
    where h.user_id = (select auth.uid())
  )
  select
    p.h_id, p.h_type, p.h_symbol, p.h_name, p.h_platform,
    p.h_qty, p.h_cost, p.h_ccy, p.h_src,
    p.px, p.px_at,
    p.h_qty * p.px,
    p.h_qty * p.h_cost,
    p.h_qty * p.px - p.h_qty * p.h_cost,
    case when p.h_cost > 0 and p.px is not null
         then (p.px - p.h_cost) / p.h_cost * 100 end,
    round(p.h_qty * p.px * p.rate)::bigint,
    round(p.h_qty * p.h_cost * p.rate)::bigint,
    round(p.h_qty * p.px * p.rate)::bigint - round(p.h_qty * p.h_cost * p.rate)::bigint
  from priced p
  order by p.h_name;
$$;

-- Totals over priced holdings only
create or replace function public.portfolio_summary()
returns table (
  total_value_idr bigint, total_cost_idr bigint, total_gain_idr bigint,
  priced_count int, unpriced_count int
)
language sql stable as $$
  select
    coalesce(sum(value_idr), 0)::bigint,
    coalesce(sum(cost_idr) filter (where value_idr is not null), 0)::bigint,
    coalesce(sum(gain_idr), 0)::bigint,
    (count(*) filter (where value_idr is not null))::int,
    (count(*) filter (where value_idr is null))::int
  from public.portfolio_holdings();
$$;

-- Allocation by asset type (priced holdings only)
create or replace function public.portfolio_allocation()
returns table (asset_type text, value_idr bigint, share_pct numeric)
language sql stable as $$
  with by_type as (
    select h.asset_type as t, sum(h.value_idr)::bigint as v
    from public.portfolio_holdings() h
    where h.value_idr is not null
    group by h.asset_type
  )
  select t, v, round(v * 100.0 / nullif(sum(v) over (), 0), 2)
  from by_type
  order by v desc;
$$;

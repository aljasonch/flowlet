-- Migration 0004: Dashboard RPCs with optional month_start_day parameter
-- Allows callers to omit or pass p_start_day explicitly.
-- If p_start_day is null or omitted, falls back to public.profiles.month_start_day, or 1 if not set.
-- Preserves backwards compatibility with callers passing (p_year, p_month).
-- 1. month_summary
drop function if exists public.month_summary(int, int);
drop function if exists public.month_summary(int, int, int);

create or replace function public.month_summary(
  p_year int,
  p_month int,
  p_start_day int default null
)
returns table (total_income bigint, total_expense bigint, net bigint)
language sql stable security invoker as $$
  with user_prof as (
    select coalesce(
      p_start_day,
      (select month_start_day from public.profiles where user_id = (select auth.uid())),
      1
    )::int as start_day
  ),
  p as (
    select public.period_start(p_year, p_month, (select start_day from user_prof)) as s,
           public.period_end(p_year, p_month, (select start_day from user_prof))   as e
  )
  select
    coalesce(sum(t.amount) filter (where t.type = 'income'),  0)::bigint,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::bigint,
    (coalesce(sum(t.amount) filter (where t.type = 'income'),  0)
   - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0))::bigint
  from p
  left join public.transactions t
    on t.user_id = (select auth.uid())
   and t.date between p.s and p.e;
$$;

-- 2. spending_by_category
drop function if exists public.spending_by_category(int, int);
drop function if exists public.spending_by_category(int, int, int);

create or replace function public.spending_by_category(
  p_year int,
  p_month int,
  p_start_day int default null
)
returns table (category_id uuid, name text, total bigint)
language sql stable security invoker as $$
  with user_prof as (
    select coalesce(
      p_start_day,
      (select month_start_day from public.profiles where user_id = (select auth.uid())),
      1
    )::int as start_day
  ),
  p as (
    select public.period_start(p_year, p_month, (select start_day from user_prof)) as s,
           public.period_end(p_year, p_month, (select start_day from user_prof))   as e
  )
  select
    c.id as category_id,
    c.name,
    sum(t.amount)::bigint as total
  from p
  join public.transactions t
    on t.user_id = (select auth.uid())
   and t.date between p.s and p.e
   and t.type = 'expense'
  join public.categories c on c.id = t.category_id
  where c.user_id = (select auth.uid())
  group by c.id, c.name
  order by total desc, c.name asc;
$$;

-- 3. income_by_source
drop function if exists public.income_by_source(int, int);
drop function if exists public.income_by_source(int, int, int);

create or replace function public.income_by_source(
  p_year int,
  p_month int,
  p_start_day int default null
)
returns table (source_id uuid, name text, total bigint)
language sql stable security invoker as $$
  with user_prof as (
    select coalesce(
      p_start_day,
      (select month_start_day from public.profiles where user_id = (select auth.uid())),
      1
    )::int as start_day
  ),
  p as (
    select public.period_start(p_year, p_month, (select start_day from user_prof)) as s,
           public.period_end(p_year, p_month, (select start_day from user_prof))   as e
  )
  select
    s.id as source_id,
    s.name,
    sum(t.amount)::bigint as total
  from p
  join public.transactions t
    on t.user_id = (select auth.uid())
   and t.date between p.s and p.e
   and t.type = 'income'
  join public.income_sources s on s.id = t.source_id
  where s.user_id = (select auth.uid())
  group by s.id, s.name
  order by total desc, s.name asc;
$$;

-- 4. monthly_trend
drop function if exists public.monthly_trend(int, int, int, int);
drop function if exists public.monthly_trend(int, int, int);
drop function if exists public.monthly_trend(int, int);

create or replace function public.monthly_trend(
  p_year int,
  p_month int,
  p_months int default 6,
  p_start_day int default null
)
returns table (year int, month int, total_income bigint, total_expense bigint)
language sql stable security invoker as $$
  with user_prof as (
    select coalesce(
      p_start_day,
      (select month_start_day from public.profiles where user_id = (select auth.uid())),
      1
    )::int as start_day
  ),
  periods as (
    select
      extract(year from dt)::int as yr,
      extract(month from dt)::int as mo,
      public.period_start(extract(year from dt)::int, extract(month from dt)::int, (select start_day from user_prof)) as s,
      public.period_end(extract(year from dt)::int, extract(month from dt)::int, (select start_day from user_prof)) as e
    from generate_series(
      make_date(p_year, p_month, 1) - ((p_months - 1) * interval '1 month'),
      make_date(p_year, p_month, 1),
      interval '1 month'
    ) as dt
  )
  select
    p.yr as year,
    p.mo as month,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::bigint as total_income,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::bigint as total_expense
  from periods p
  left join public.transactions t
    on t.user_id = (select auth.uid())
   and t.date between p.s and p.e
  group by p.yr, p.mo, p.s
  order by p.s asc;
$$;

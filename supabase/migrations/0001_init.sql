-- Helper: keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- profiles (exception to the "id" rule: user_id is the primary key)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'IDR',
  month_start_day smallint not null default 1
    check (month_start_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- expense categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- income sources
create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  date date not null,
  note text check (note is null or char_length(note) <= 500),
  category_id uuid references public.categories(id) on delete restrict,
  source_id uuid references public.income_sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_type_ref check (
    (type = 'expense' and category_id is not null and source_id is null) or
    (type = 'income'  and source_id  is not null and category_id is null)
  )
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);

-- updated_at triggers
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger income_sources_updated before update on public.income_sources
  for each row execute function public.set_updated_at();
create trigger transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.income_sources enable row level security;
alter table public.transactions   enable row level security;

create policy profiles_own on public.profiles for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy categories_own on public.categories for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy income_sources_own on public.income_sources for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy transactions_own on public.transactions for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- New user: create profile and default categories/sources
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id);

  insert into public.categories (user_id, name)
  select new.id, n from unnest(array[
    'Food','Transport','Housing','Bills','Health','Entertainment','Shopping','Other'
  ]) as n;

  insert into public.income_sources (user_id, name)
  select new.id, n from unnest(array['Salary','Freelance','Other']) as n;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reporting period helpers.
-- A period is labeled by the (year, month) in which it STARTS.
-- It starts on p_start_day of that month (clamped to the month's last day)
-- and ends the day before the next period starts (inclusive end date).
create or replace function public.period_start(p_year int, p_month int, p_start_day int)
returns date language sql immutable as $$
  select make_date(
    p_year, p_month,
    least(
      p_start_day,
      extract(day from (make_date(p_year, p_month, 1) + interval '1 month - 1 day'))::int
    )
  );
$$;

create or replace function public.period_end(p_year int, p_month int, p_start_day int)
returns date language sql immutable as $$
  select public.period_start(
    extract(year  from (make_date(p_year, p_month, 1) + interval '1 month'))::int,
    extract(month from (make_date(p_year, p_month, 1) + interval '1 month'))::int,
    p_start_day
  ) - 1;
$$;

-- Aggregate RPC: month_summary (SECURITY INVOKER, so RLS applies)
create or replace function public.month_summary(p_year int, p_month int)
returns table (total_income bigint, total_expense bigint, net bigint)
language sql stable as $$
  with p as (
    select public.period_start(p_year, p_month, month_start_day) as s,
           public.period_end(p_year, p_month, month_start_day)   as e
    from public.profiles
    where user_id = (select auth.uid())
  )
  select
    coalesce(sum(t.amount) filter (where t.type = 'income'),  0)::bigint,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::bigint,
    (coalesce(sum(t.amount) filter (where t.type = 'income'),  0)
   - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0))::bigint
  from p
  left join public.transactions t on t.date between p.s and p.e;
$$;

-- Aggregate RPC: spending_by_category (SECURITY INVOKER, expenses only, ordered by total desc)
create or replace function public.spending_by_category(p_year int, p_month int)
returns table (category_id uuid, name text, total bigint)
language sql stable as $$
  with p as (
    select public.period_start(p_year, p_month, month_start_day) as s,
           public.period_end(p_year, p_month, month_start_day)   as e
    from public.profiles
    where user_id = (select auth.uid())
  )
  select
    c.id as category_id,
    c.name,
    sum(t.amount)::bigint as total
  from p
  join public.transactions t on t.date between p.s and p.e and t.type = 'expense'
  join public.categories c on c.id = t.category_id
  where t.user_id = (select auth.uid())
  group by c.id, c.name
  order by total desc, c.name asc;
$$;

-- Aggregate RPC: income_by_source (SECURITY INVOKER, income only, ordered by total desc)
create or replace function public.income_by_source(p_year int, p_month int)
returns table (source_id uuid, name text, total bigint)
language sql stable as $$
  with p as (
    select public.period_start(p_year, p_month, month_start_day) as s,
           public.period_end(p_year, p_month, month_start_day)   as e
    from public.profiles
    where user_id = (select auth.uid())
  )
  select
    s.id as source_id,
    s.name,
    sum(t.amount)::bigint as total
  from p
  join public.transactions t on t.date between p.s and p.e and t.type = 'income'
  join public.income_sources s on s.id = t.source_id
  where t.user_id = (select auth.uid())
  group by s.id, s.name
  order by total desc, s.name asc;
$$;

-- Aggregate RPC: monthly_trend (SECURITY INVOKER, oldest first, includes 0 activity periods)
create or replace function public.monthly_trend(p_year int, p_month int, p_months int default 6)
returns table (year int, month int, total_income bigint, total_expense bigint)
language sql stable as $$
  with user_prof as (
    select month_start_day from public.profiles where user_id = (select auth.uid())
  ),
  periods as (
    select
      extract(year from dt)::int as yr,
      extract(month from dt)::int as mo,
      public.period_start(extract(year from dt)::int, extract(month from dt)::int, (select month_start_day from user_prof)) as s,
      public.period_end(extract(year from dt)::int, extract(month from dt)::int, (select month_start_day from user_prof)) as e
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

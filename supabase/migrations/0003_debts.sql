-- debts: tracks money owed to others (debt) or owed by others (receivable)
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('debt', 'receivable')),
  person_name text not null check (char_length(person_name) between 1 and 100),
  amount bigint not null check (amount > 0),
  date date not null,
  due_date date,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index debts_user_date_idx on public.debts (user_id, date desc);

create trigger debts_updated before update on public.debts
  for each row execute function public.set_updated_at();

alter table public.debts enable row level security;

create policy debts_own on public.debts for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- debt_payments: tracks partial or full settlement payments
create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),
  payment_date date not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index debt_payments_debt_idx on public.debt_payments (debt_id);
create index debt_payments_user_idx on public.debt_payments (user_id);

alter table public.debt_payments enable row level security;

create policy debt_payments_own on public.debt_payments for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- RPC: debts_with_balance (SECURITY INVOKER)
-- Computes paid amount, remaining amount, status, and overdue flag for current user
create or replace function public.debts_with_balance()
returns table (
  id uuid,
  type text,
  person_name text,
  amount bigint,
  date date,
  due_date date,
  note text,
  created_at timestamptz,
  paid_amount bigint,
  remaining_amount bigint,
  status text,
  is_overdue boolean
)
language sql stable security invoker as $$
  with paid as (
    select
      debt_id,
      coalesce(sum(amount), 0)::bigint as total_paid
    from public.debt_payments
    where user_id = (select auth.uid())
    group by debt_id
  )
  select
    d.id,
    d.type,
    d.person_name,
    d.amount,
    d.date,
    d.due_date,
    d.note,
    d.created_at,
    coalesce(p.total_paid, 0)::bigint as paid_amount,
    greatest(0, d.amount - coalesce(p.total_paid, 0))::bigint as remaining_amount,
    case
      when coalesce(p.total_paid, 0) >= d.amount then 'settled'
      when coalesce(p.total_paid, 0) > 0 then 'partially_paid'
      else 'pending'
    end as status,
    case
      when d.due_date is not null and d.due_date < current_date and (d.amount - coalesce(p.total_paid, 0)) > 0
      then true
      else false
    end as is_overdue
  from public.debts d
  left join paid p on p.debt_id = d.id
  where d.user_id = (select auth.uid())
  order by d.date desc, d.created_at desc;
$$;

-- RPC: debts_summary (SECURITY INVOKER)
-- Computes aggregated totals of active debts & receivables for current user
create or replace function public.debts_summary()
returns table (
  total_unpaid_debt bigint,
  total_unpaid_receivable bigint,
  unpaid_debt_count int,
  unpaid_receivable_count int,
  overdue_count int
)
language sql stable security invoker as $$
  with computed as (
    select * from public.debts_with_balance()
  )
  select
    coalesce(sum(remaining_amount) filter (where type = 'debt' and remaining_amount > 0), 0)::bigint,
    coalesce(sum(remaining_amount) filter (where type = 'receivable' and remaining_amount > 0), 0)::bigint,
    count(*) filter (where type = 'debt' and remaining_amount > 0)::int,
    count(*) filter (where type = 'receivable' and remaining_amount > 0)::int,
    count(*) filter (where is_overdue = true)::int
  from computed;
$$;

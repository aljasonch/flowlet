-- Migration 0005: Optimize transactions indexes
create index if not exists transactions_user_date_created_idx
  on public.transactions (user_id, date desc, created_at desc);

drop index if exists public.transactions_user_date_idx;

create index if not exists transactions_category_idx
  on public.transactions (category_id)
  where category_id is not null;

create index if not exists transactions_source_idx
  on public.transactions (source_id)
  where source_id is not null;

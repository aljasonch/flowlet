begin;
select plan(35);

-- 1. Test Row Level Security enabled on all 6 tables
select results_eq(
  $$ select count(*)::int from pg_tables where schemaname = 'public' and tablename in ('profiles', 'categories', 'income_sources', 'transactions', 'holdings', 'price_quotes') and rowsecurity = true $$,
  $$ values(6::int) $$,
  'All 6 public tables must have rowsecurity enabled'
);

-- 2. Test reporting period SQL helpers per Section 6.3
select is(public.period_start(2026, 10, 1), '2026-10-01'::date, 'period_start for day 1, 2026-10');
select is(public.period_end(2026, 10, 1),   '2026-10-31'::date, 'period_end for day 1, 2026-10');

select is(public.period_start(2026, 10, 25), '2026-10-25'::date, 'period_start for day 25, 2026-10');
select is(public.period_end(2026, 10, 25),   '2026-11-24'::date, 'period_end for day 25, 2026-10');

select is(public.period_start(2026, 12, 25), '2026-12-25'::date, 'period_start for day 25, 2026-12');
select is(public.period_end(2026, 12, 25),   '2027-01-24'::date, 'period_end for day 25, 2026-12');

select is(public.period_start(2026, 1, 31), '2026-01-31'::date, 'period_start for day 31, 2026-01');
select is(public.period_end(2026, 1, 31),   '2026-02-27'::date, 'period_end for day 31, 2026-01');

select is(public.period_start(2026, 2, 31), '2026-02-28'::date, 'period_start for day 31, 2026-02');
select is(public.period_end(2026, 2, 31),   '2026-03-30'::date, 'period_end for day 31, 2026-02');

select is(public.period_start(2028, 2, 31), '2028-02-29'::date, 'period_start for day 31, 2028-02 (leap year)');
select is(public.period_end(2028, 2, 31),   '2028-03-30'::date, 'period_end for day 31, 2028-02 (leap year)');

select is(public.period_start(2026, 4, 30), '2026-04-30'::date, 'period_start for day 30, 2026-04');
select is(public.period_end(2026, 4, 30),   '2026-05-29'::date, 'period_end for day 30, 2026-04');

-- 3. Test handle_new_user() trigger for profile, 8 categories, and 3 income sources
select tests.create_supabase_user('user_a@test.com') \gset user_a_
select tests.create_supabase_user('user_b@test.com') \gset user_b_

-- Authenticate as user A
select tests.authenticate_as('user_a@test.com');

select results_eq(
  $$ select count(*)::int from public.profiles where user_id = auth.uid() $$,
  $$ values(1::int) $$,
  'New user trigger creates exactly 1 profile for user A'
);

select results_eq(
  $$ select count(*)::int from public.categories where user_id = auth.uid() and is_archived = false $$,
  $$ values(8::int) $$,
  'New user trigger creates 8 default categories for user A'
);

select results_eq(
  $$ select count(*)::int from public.income_sources where user_id = auth.uid() and is_archived = false $$,
  $$ values(3::int) $$,
  'New user trigger creates 3 default income sources for user A'
);

-- Insert sample records as User A
insert into public.transactions (user_id, type, amount, date, category_id)
select auth.uid(), 'expense', 50000, '2026-10-05', id from public.categories where user_id = auth.uid() limit 1;

insert into public.holdings (user_id, asset_type, symbol, name, quantity, avg_cost, price_currency, price_source, manual_price)
values (auth.uid(), 'stock', 'BBCA', 'Bank Central Asia', 100, 9500, 'IDR', 'manual', 10000);

insert into public.price_quotes (user_id, source, ref, currency, price)
values (auth.uid(), 'coingecko', 'bitcoin', 'IDR', 1000000000);

-- Switch to user B and verify tenant isolation
select tests.authenticate_as('user_b@test.com');

select is_empty(
  $$ select * from public.profiles where user_id != auth.uid() $$,
  'User B cannot select User A profile'
);

select is_empty(
  $$ select * from public.categories where user_id != auth.uid() $$,
  'User B cannot select User A categories'
);

select is_empty(
  $$ select * from public.income_sources where user_id != auth.uid() $$,
  'User B cannot select User A income sources'
);

select is_empty(
  $$ select * from public.transactions where user_id != auth.uid() $$,
  'User B cannot select User A transactions'
);

select is_empty(
  $$ select * from public.holdings where user_id != auth.uid() $$,
  'User B cannot select User A holdings'
);

select is_empty(
  $$ select * from public.price_quotes where user_id != auth.uid() $$,
  'User B cannot select User A price quotes'
);

-- 4. Test portfolio_holdings() 5 pricing variants
select tests.authenticate_as('user_a@test.com');

-- Variant 1: Manual price IDR (BBCA already inserted)
-- Variant 2: CoinGecko quote
insert into public.holdings (user_id, asset_type, symbol, name, quantity, avg_cost, price_currency, price_source, provider_ref)
values (auth.uid(), 'crypto', 'BTC', 'Bitcoin', 0.5, 900000000, 'IDR', 'coingecko', 'bitcoin');

-- Variant 3: USD holding with rate
update public.profiles set usd_idr_rate = 16000 where user_id = auth.uid();
insert into public.holdings (user_id, asset_type, symbol, name, quantity, avg_cost, price_currency, price_source, manual_price)
values (auth.uid(), 'stock', 'AAPL', 'Apple Inc', 10, 200, 'USD', 'manual', 220);

-- Variant 4: USD holding without rate
select tests.authenticate_as('user_b@test.com');
-- User B has null usd_idr_rate by default
insert into public.holdings (user_id, asset_type, symbol, name, quantity, avg_cost, price_currency, price_source, manual_price)
values (auth.uid(), 'stock', 'MSFT', 'Microsoft Corp', 5, 400, 'USD', 'manual', 420);

-- Variant 5: Holding with no price (manual price null)
insert into public.holdings (user_id, asset_type, symbol, name, quantity, avg_cost, price_currency, price_source, manual_price)
values (auth.uid(), 'gold', 'ANTM', 'Antam Gold', 10, 1200000, 'IDR', 'manual', null);

-- Checks for User B (variants 4 & 5)
select is(
  (select value_idr from public.portfolio_holdings() where symbol = 'MSFT'),
  null::bigint,
  'USD holding without rate results in NULL value_idr'
);

select is(
  (select current_price from public.portfolio_holdings() where symbol = 'ANTM'),
  null::numeric,
  'Unpriced holding results in NULL current_price'
);

select is(
  (select unpriced_count from public.portfolio_summary()),
  2::int,
  'Unpriced count in portfolio_summary counts unpriced and USD-without-rate holdings'
);

-- Checks for User A (variants 1, 2, 3)
select tests.authenticate_as('user_a@test.com');

select is(
  (select value_idr from public.portfolio_holdings() where symbol = 'BBCA'),
  1000000::bigint,
  'Manual price IDR calculates correct value_idr (100 * 10,000)'
);

select is(
  (select value_idr from public.portfolio_holdings() where symbol = 'BTC'),
  500000000::bigint,
  'CoinGecko quote IDR calculates correct value_idr (0.5 * 1,000,000,000)'
);

select is(
  (select value_idr from public.portfolio_holdings() where symbol = 'AAPL'),
  35200000::bigint,
  'USD holding with rate calculates correct value_idr (10 * 220 * 16,000)'
);

select * from finish();
rollback;

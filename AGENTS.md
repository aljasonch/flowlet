<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Personal Money Manager: Agent Build Spec

*Version 0.4 (agent edition) · October 5, 2026 · Supersedes v0.3*

**What changed in v0.4:** Next.js (App Router) replaces Vite; a portfolio feature (stocks, crypto and other assets) is added; a glassmorphism design system with enforced anti-"AI slop" rules; defined transition animations; and a PLAN.md workflow for the agent.

**How to use this file:** save it in the repository root as `AGENTS.md` (or `CLAUDE.md` for Claude Code). Read it fully before writing code. Follow the workflow in section 13: write a plan before each task. Do not build anything listed under "Out of Scope". If something is ambiguous or listed under "Open Decisions", stop and ask the human instead of guessing.

---

## 1. Product Context

- A private, single-user web app with two parts: (1) **cash flow tracking** (income and expenses with monthly summaries) and (2) a **portfolio snapshot** (current holdings such as stocks, crypto, funds and gold, with current value and unrealized gain or loss).
- The owner uses it mostly on a phone browser. **Fast transaction entry is the top priority** (target: under 10 seconds from opening the app).
- Reporting currency: Indonesian Rupiah (IDR). Some portfolio assets may be priced in USD and are converted to IDR with a manually set rate.
- The user chooses the day the reporting month starts (for example payday). Cash-flow reports must respect it.
- Built so more users could be added later, which is why every table has `user_id` and Row Level Security.

## 2. Hard Rules (never violate)

1. **Cash-flow money is an integer.** Transaction amounts are `bigint` rupiah. Never use floats for them.
2. **Portfolio quantities and unit prices are exact decimals.** Use Postgres `numeric` in the database and `decimal.js` (as strings) in TypeScript. Never use JavaScript floating-point arithmetic on money, quantities or prices. Do valuation math in SQL; the frontend only formats results.
3. **Row Level Security is enabled on every table** in the `public` schema, with policies restricting rows to `user_id = auth.uid()`.
4. **This project never uses the Supabase `service_role` key.** All database access runs as the logged-in user.
5. **Secrets stay server-side.** Only the Supabase URL and anon key may use the `NEXT_PUBLIC_` prefix. Price-provider API keys have no `NEXT_PUBLIC_` prefix and are read only in server code (Route Handlers, Server Actions). Never commit `.env` files; commit `.env.example` with placeholders.
6. **All schema changes go through migration files** in `supabase/migrations/`.
7. **Dates are plain `YYYY-MM-DD` strings.** Never use `new Date("YYYY-MM-DD")` for logic (it parses as UTC and shifts days).
8. **Aggregations happen in SQL** (RPC functions), never by downloading all rows into the app to sum them.
9. **Validate all input on the server with `zod`.** Client-side validation is for user experience only.
10. **Authorize on the server.** Every Server Action and Route Handler calls `supabase.auth.getUser()` (verified against the Auth server) and rejects when there is no user. Middleware and the cached `getUser()` helper in `src/lib/supabase/server.ts` use `supabase.auth.getClaims()` (local JWT verification, no network round trip) and expose only the user id (`claims.sub`); this is for read-only page rendering and redirects. Never use `getSession()` for authorization. Enable asymmetric JWT signing keys in Supabase, otherwise `getClaims()` falls back to a network call.
11. **Check the docs for installed versions.** Next.js and `@supabase/ssr` APIs change between versions. Read the current official docs for the installed versions before writing auth, middleware/proxy, caching or route-handler code. Do not rely on memory for API names.
12. **No gradients and no emojis, anywhere.** Enforced by `npm run check:design` (section 9.6).
13. **Do not add dependencies** beyond the approved list in section 3 without asking.
14. **Do not implement features outside the current task.**
15. **Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` before declaring any task done.** Fix failures; never skip or disable checks.

## 3. Tech Stack (decided, do not substitute)

- **Framework:** Next.js (latest stable) with the App Router, React, TypeScript (strict)
- **Rendering model:** pages are Server Components; mutations are Server Actions; client components only for forms, charts, dialogs, navigation state and animation
- **Supabase:** `@supabase/supabase-js` and `@supabase/ssr` (cookie-based sessions)
- **Styling:** Tailwind CSS plus CSS variables for design tokens
- **Forms and validation:** `react-hook-form` and `zod`
- **Charts:** `recharts`
- **Dates:** `date-fns`
- **Decimals:** `decimal.js`
- **Icons:** `lucide-react` (the only icon source)
- **Animation:** CSS for route and simple transitions; `motion` (the Motion library, formerly Framer Motion) for dialogs, toasts, list changes and the sliding toggle indicator
- **Font:** IBM Plex Sans via `next/font/google` (weights 400, 500, 600)
- **Testing:** `vitest`, `@testing-library/react`; database tests with pgTAP via `supabase test db`
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Hosting:** Vercel
- **PWA (v1.1 only):** follow the official Next.js PWA guidance (`app/manifest.ts` plus a minimal service worker). Do not add a PWA dependency without asking.

## 4. Repository Layout

```
.
├── AGENTS.md
├── PLAN.md                         # written and maintained by the agent (section 13)
├── README.md
├── .env.example
├── next.config.ts
├── middleware.ts                   # or proxy.ts, depending on the installed Next.js version
├── scripts/
│   ├── check-design-rules.mjs
│   └── seed-perf.ts                # test data only, never run in production
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0002_portfolio.sql
│   └── tests/
│       └── rls.test.sql
└── src/
    ├── app/
    │   ├── layout.tsx              # fonts, tokens, background shapes
    │   ├── template.tsx            # remounts on navigation to replay enter animations
    │   ├── globals.css             # design tokens, .glass, animation keyframes
    │   ├── login/page.tsx
    │   ├── (app)/                  # authenticated route group
    │   │   ├── layout.tsx          # app shell: sidebar / bottom tabs
    │   │   ├── loading.tsx
    │   │   ├── page.tsx            # dashboard
    │   │   ├── transactions/       # page.tsx, new/page.tsx, [id]/edit/page.tsx
    │   │   ├── portfolio/          # page.tsx, new/page.tsx, [id]/edit/page.tsx
    │   │   └── settings/page.tsx
    │   └── api/prices/refresh/route.ts
    ├── actions/                    # transactions.ts, holdings.ts, settings.ts
    ├── components/
    │   ├── ui/                     # Button, Input, Select, SegmentedToggle, Dialog, Toast, Skeleton
    │   └── charts/
    ├── lib/
    │   ├── supabase/               # server.ts, client.ts
    │   ├── format.ts               # formatIDR, formatUSD, formatQuantity, formatPercent
    │   ├── parse.ts                # parseAmountInput (integer), parseDecimalInput
    │   ├── period.ts               # reporting-period logic (mirrors SQL)
    │   ├── today.ts                # today's date from the tz cookie
    │   └── prices/                 # types.ts, coingecko.ts, index.ts
    └── types/database.ts           # generated: supabase gen types typescript
```

## 5. Environment Variables

`.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
COINGECKO_API_KEY=            # server-only; needed from task T9
```

Required npm scripts: `dev`, `build`, `start`, `lint` (ESLint plus `check:design`), `typecheck`, `test`, `check:design`.

## 6. Database Schema

### 6.1 `supabase/migrations/0001_init.sql` (cash flow)

```sql
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

-- Example aggregate RPC (SECURITY INVOKER, so RLS applies)
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
```

Additional cash-flow RPC functions to write (same pattern as `month_summary`; all `security invoker`, take the period label `(p_year, p_month)`, use `period_start`/`period_end` with the user's `month_start_day`):

| Function | Returns | Notes |
|---|---|---|
| `spending_by_category(p_year int, p_month int)` | `category_id uuid, name text, total bigint` | Expenses only, ordered by `total` descending, include archived categories that have spend |
| `income_by_source(p_year int, p_month int)` | `source_id uuid, name text, total bigint` | Income only, ordered by `total` descending |
| `monthly_trend(p_year int, p_month int, p_months int default 6)` | `year int, month int, total_income bigint, total_expense bigint` | Ends at the given period, oldest first, includes periods with zero activity |

### 6.2 `supabase/migrations/0002_portfolio.sql`

```sql
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
```

### 6.3 Reporting-period test cases (must pass in both SQL and `src/lib/period.ts`)

| start_day | label (year-month) | period start | period end |
|---|---|---|---|
| 1 | 2026-10 | 2026-10-01 | 2026-10-31 |
| 25 | 2026-10 | 2026-10-25 | 2026-11-24 |
| 25 | 2026-12 | 2026-12-25 | 2027-01-24 |
| 31 | 2026-01 | 2026-01-31 | 2026-02-27 |
| 31 | 2026-02 | 2026-02-28 | 2026-03-30 |
| 31 | 2028-02 | 2028-02-29 | 2028-03-30 |
| 30 | 2026-04 | 2026-04-30 | 2026-05-29 |

**Current period rule:** the current period is the `(year, month)` label whose `[start, end]` range contains today's date. Check the current month's label first; if today is before that label's start date, use the previous month's label.

## 7. Price Providers

- **Manual prices (all asset types):** the user types the current unit price on the holding. Shown with its "as of" time.
- **Automatic prices (crypto only in v1):** CoinGecko. For `price_source = 'coingecko'`, `provider_ref` holds the CoinGecko coin id (for example `bitcoin`) and `symbol` holds the display ticker.
- **Stocks, funds, gold and bonds are manual in v1.** No reliable free official price feed has been verified for these, especially for Indonesian stocks. Do not scrape websites or use unofficial endpoints. Choosing an automated stock provider is an Open Decision (section 16).
- **Before implementing CoinGecko (task T9),** read CoinGecko's current API documentation and report to the human: whether a free Demo API key is required, the header name for the key, current rate limits and monthly call limits, and any attribution requirement. Sources disagreed on whether a key is required; do not assume.
- **Provider interface** (`src/lib/prices/types.ts`). Prices are decimal strings to preserve precision:

```ts
export type PriceCurrency = "IDR" | "USD";

export interface Quote {
  ref: string;
  currency: PriceCurrency;
  price: string;      // decimal string, e.g. "1250000.5"
  fetchedAt: string;  // ISO timestamp
}

export interface PriceProvider {
  id: "coingecko";
  fetchPrices(refs: string[], currency: PriceCurrency): Promise<Quote[]>;
}
```

- **Refresh route** `POST /api/prices/refresh` (`src/app/api/prices/refresh/route.ts`):
  - Requires an authenticated session; otherwise return 401.
  - Loads the user's holdings with `price_source = 'coingecko'`, groups refs by `price_currency`, and makes one provider request per currency (batched ids).
  - Upserts results into `price_quotes` as the logged-in user.
  - Throttle: if the newest quote is under 60 seconds old, return `{ refreshed: false, reason: "throttled" }` without calling the provider.
  - Provider timeout: 10 seconds. On provider failure, keep existing cached quotes untouched and return `{ refreshed: false, reason: "provider_error" }`. **Never overwrite a price with zero or null.**
  - Success response: `{ refreshed: true, updated: number, failed: string[], fetchedAt: string }`.
- **When prices refresh:** when the portfolio page opens and the newest quote is older than 15 minutes, and when the user presses "Refresh prices". There is no scheduled job in v1 (a scheduler has no user session, and this project does not use the service-role key).
- **Staleness:** show every price with its "as of" time. Flag a price as stale when an automatic quote is older than 24 hours or a manual price is older than 30 days. Stale prices still count toward totals but carry a visible "Stale" label.

## 8. Domain Rules

**Cash flow**

- An `expense` must have `category_id` and no `source_id`. An `income` must have `source_id` and no `category_id`. The database enforces this; the form must too.
- Amounts: positive integers, maximum `9_999_999_999_999`. The form strips non-digit characters and displays thousand separators.
- Display format: `new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })` (for example `Rp 1.250.000`) in `formatIDR`.
- Categories and income sources are archived, never deleted. Archived items are hidden from add-form dropdowns but still shown on existing transactions and in filters.
- Duplicate names show a friendly message ("That name already exists").
- Cash-flow currency is fixed to IDR; show it read-only in Settings.
- Changing the month start day never modifies stored transactions; reports recompute.

**Today's date and timezone**

- A small client component sets a `tz` cookie with the browser's IANA timezone on first load. Server code derives today's date from that cookie in `src/lib/today.ts` (fall back to UTC if the cookie is missing). Server code never calls `new Date()` directly to decide "today".
- The add-transaction form defaults its date from the browser's local date.

**Portfolio**

- **Holdings, not trades.** One row per position. The user edits quantity and average cost to reflect buys and sells. No trade history, realized gains, dividends, fees or taxes in v1.
- **Decimal input** (`parseDecimalInput` in `src/lib/parse.ts`, unit tested): comma is the decimal separator (Indonesian convention); dots are ignored as thousand separators; a dot is never treated as a decimal point. Show a live preview under the field (for example "= 1.250,5") so the parsed value is unambiguous. Return a decimal string, never a float.
- **Display:** values in IDR use `formatIDR`; USD prices use `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`; quantities show up to 8 decimals with trailing zeros trimmed; percentages show 2 decimals with an explicit sign.
- **Gains and losses** are shown with sign, color and an arrow icon. Never color alone.
- **USD holdings need a rate.** If a USD holding exists and `usd_idr_rate` is not set, show a banner linking to Settings, and treat the holding as unpriced for IDR totals.
- **Unpriced holdings** are excluded from totals and counted ("2 holdings have no price").
- Portfolio and cash flow are independent: buying an asset does not create an expense, and no link exists in v1.
- Show a small note on the portfolio page: "Prices may be delayed or inaccurate. This is not financial advice."

**Server Actions and URLs**

- Filters and pagination live in URL search params (shareable, back-button friendly). "Load more" increases a `limit` param by 50.
- After each mutation, call `revalidatePath` for affected routes.

## 9. Design System: Glassmorphism Without AI Slop

### 9.1 Principles

- Calm, precise, content-first. Glass is the surface treatment; the data is the design.
- Every visual decision must serve readability of numbers. If glass hurts legibility, increase surface opacity.
- Fewer elements, better aligned. Left-align data; right-align and tabulate numbers.

### 9.2 Banned (enforced where possible)

- **Gradients of any kind:** `linear-gradient`, `radial-gradient`, `conic-gradient`, Tailwind `bg-gradient-*`, `from-*`/`via-*`/`to-*`, gradient text, gradient borders, gradient buttons, gradient chart fills, shimmer skeletons built on gradients.
- **Emojis** in UI text, placeholders, toasts, empty states, code comments, README and commit messages.
- **Fake depth and glow:** colored shadows, glowing borders, neon accents, blurred color blobs made with `filter: blur()`.
- **Template tells:** icon-in-a-colored-circle stat cards, centered hero headlines, "card soup" (a panel around every small element), rainbow chart palettes, pill-shaped everything, decorative illustrations.
- **Marketing copy** inside the app: words like "supercharge", "unlock", "seamless", "effortless", "journey", exclamation marks, lorem ipsum.

### 9.3 Tokens (`src/app/globals.css`)

These are starting values. Verify text contrast is at least 4.5:1 on every surface (3:1 for large text and UI boundaries) and adjust if not.

```css
:root {
  --bg: #E9EDF1;
  --shape-a: #BFCBD8;
  --shape-b: #D9D0C3;
  --shape-c: #C6D5CB;

  --glass: rgba(255, 255, 255, 0.60);
  --glass-strong: rgba(255, 255, 255, 0.84);
  --glass-border: rgba(255, 255, 255, 0.70);
  --glass-shadow: 0 8px 32px rgba(20, 30, 45, 0.10);
  --blur: 16px;

  --text: #14181D;
  --text-muted: #4A5560;
  --accent: #1F5FBF;
  --accent-contrast: #FFFFFF;
  --positive: #1B7A4B;
  --negative: #B3261E;

  --chart-1: #1F5FBF;
  --chart-2: #6B7C8F;
  --chart-3: #8FA3B8;
  --chart-4: #A68A57;
  --chart-5: #5E8C74;

  --radius-panel: 16px;
  --radius-control: 10px;

  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 150ms;
  --dur-base: 220ms;
  --dur-slow: 320ms;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0E1216;
    --shape-a: #1E2C3B;
    --shape-b: #2E2A25;
    --shape-c: #1F3029;

    --glass: rgba(24, 30, 37, 0.58);
    --glass-strong: rgba(20, 25, 31, 0.86);
    --glass-border: rgba(255, 255, 255, 0.12);
    --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);

    --text: #EDF1F5;
    --text-muted: #A3AFBB;
    --accent: #7FB0F5;
    --accent-contrast: #0E1216;
    --positive: #5FCB92;
    --negative: #F28B82;

    --chart-1: #7FB0F5;
    --chart-2: #94A3B3;
    --chart-3: #6E8196;
    --chart-4: #C9AD78;
    --chart-5: #7FB59A;
  }
}
```

Follow the system color scheme only. No theme toggle in v1.

### 9.4 Glass surface recipe

```css
.glass {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(140%);
  backdrop-filter: blur(var(--blur)) saturate(140%);
}

.glass-strong { background: var(--glass-strong); }

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--glass-strong); }
}

@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--glass-strong);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
```

- Use `.glass-strong` for text-dense surfaces: tables, transaction rows, forms, charts, dialogs.
- Use `.glass` for navigation, summary panels and containers with large type.
- Maximum nesting: one glass panel inside the page; inner content uses hairline dividers (1px `--glass-border`), not more glass.

### 9.5 Background (no gradients)

Glass only reads as glass when something sits behind it. Provide that with **flat shapes**, not gradients:

- A fixed, full-viewport, `aria-hidden`, `pointer-events: none` container rendered once in the root layout.
- Three solid-color shapes (`--shape-a`, `--shape-b`, `--shape-c`): circles or rounded rectangles, 40 to 60 vmin, partially off-screen, static (never animated), no `filter: blur()`.
- The blur appears only where glass panels overlap the shapes, which is the intended effect.
- The container must not be inside an element that animates opacity (see section 10.4).

### 9.6 Enforcement script

`scripts/check-design-rules.mjs` runs as part of `npm run lint` and `npm run check:design`. It scans `src/` (and `README.md`) and exits non-zero if it finds:

- the substring `gradient` (case-insensitive) in any `.css`, `.ts`, `.tsx` or `.md` file, or Tailwind classes matching `bg-gradient-`, `from-`, `via-`, `to-` used as gradient stops
- any character matching `\p{Extended_Pictographic}` (with the `u` flag)

If a legitimate typographic character is flagged (for example a copyright sign or an arrow), add it to a small allowlist inside the script and tell the human.

### 9.7 Typography and layout

- One typeface: IBM Plex Sans via `next/font/google`, weights 400, 500, 600. No second family.
- Scale: 12, 14, 16, 20, 28, 40 px. Page titles 28. The single hero number on a screen may use 40.
- Utility class `.num` applies `font-variant-numeric: tabular-nums` and is used on every amount, quantity and percentage.
- Sentence case everywhere. No all-caps labels with wide letter-spacing.
- Icons: `lucide-react` only, stroke width 1.75, sizes 18 or 20 px. Icon-only buttons need an `aria-label`.
- **App shell:** persistent glass sidebar at 1024px and wider; on mobile a glass bottom tab bar with five slots in a fixed-height row: Dashboard, Transactions, a centre "Add" button, Debts, Portfolio. Settings is reached from the icon in the mobile top bar. The tab bar pads for `env(safe-area-inset-bottom)`, so the root layout exports `viewport` with `viewportFit: "cover"`. The "Add" action is reachable within one tap from every screen.
- **Toasts:** on mobile they span the viewport width (`inset-x-3`) at the top, below the safe area, so they never cover the tab bar or form buttons; from 640px up they sit bottom-right with `max-w-sm`.
- **Privacy (eye) toggle:** state lives in `src/lib/privacy.ts` (localStorage plus `useSyncExternalStore`). Dashboard cards and charts read it themselves via `usePrivacyMode()` when no `hideNumbers` prop is passed, because streamed server widgets cannot receive it from `DashboardView`. Any new component that shows money must honor it.
- **Navigation speed:** `next.config.ts` sets `experimental.staleTimes` (`dynamic: 30`, `static: 180`) so recently visited pages come from the client cache. Every Server Action that mutates data must call `revalidatePath`, which purges that cache. Keep the number of sequential Supabase round trips per page to a minimum and run independent queries in `Promise.all`.
- **Components:**
  - Primary button: solid `--accent` fill, `--accent-contrast` text. Secondary: glass with 1px border. One primary action per screen.
  - Accent color only for primary actions, links, active navigation, focus rings and the first chart series.
  - Two radii only (`--radius-panel`, `--radius-control`). One shadow token only.
  - Stat blocks: small muted label, large number, optional small change text. No icon badges.
  - Charts: flat solid fills from `--chart-1` to `--chart-5`, hairline gridlines, no 3D, no glow, labels placed directly on or next to marks where possible. `--positive` and `--negative` are reserved for gains and losses.
  - Empty states: one plain sentence and one action. No illustration.
  - Focus rings: 2px `--accent`, visible on glass.

### 9.8 Accessibility and performance

- WCAG AA contrast on all text over glass, in light and dark mode, including over the places where background shapes pass behind panels.
- Do not rely on color alone for meaning (gains and losses, stale labels, errors).
- Keep at most two layers of `backdrop-filter` visible at once. If scrolling or transitions stutter on a mid-range phone, reduce `--blur` (try 10px) rather than removing animation.
- Respect `prefers-reduced-transparency` and `prefers-reduced-motion` (section 10).

### 9.9 Design review checklist (run at the end of tasks T4 to T10)

- [ ] `npm run check:design` passes
- [ ] No panel inside a panel inside a panel
- [ ] All numbers use `.num` and align
- [ ] Only one accent color is visible besides gain/loss colors
- [ ] Looks correct in light and dark mode at 360px and 1280px widths
- [ ] Text remains readable where shapes pass behind glass

## 10. Motion and Transitions

Goal: moving between screens feels smooth, not abrupt, without drawing attention to itself.

### 10.1 Tokens

`--ease: cubic-bezier(0.2, 0, 0, 1)`; durations: fast 150ms (hover, press), base 220ms (enter, fades), slow 320ms (dialogs, sheets). Nothing exceeds 400ms.

### 10.2 Required behaviors

| Where | Behavior | Implementation |
|---|---|---|
| Route change | Page content fades in and rises 8px over 220ms; the app shell does not re-animate | CSS class `.enter` applied to each page's top-level panels (staggered by 30ms, max 8 steps); `app/template.tsx` remounts content on navigation so animations replay |
| Route loading | Skeleton blocks shaped like the final content | `loading.tsx`; skeleton uses a plain opacity pulse (1 to 0.6), never a gradient shimmer |
| Lists | New rows fade and rise in; removed rows fade out and neighbors slide into place | `motion` with `layout` and `AnimatePresence` |
| Dialogs and confirms | Overlay fades; panel fades and scales from 0.98 to 1 | `motion`; overlay and panel are siblings, not parent and child |
| Mobile sheets | Slide up 24px with fade | `motion` |
| Toasts | Slide in from the edge with fade; fade out on dismiss | `motion` |
| Segmented toggles (income/expense, period tabs) | A sliding indicator moves between options | `motion` `layoutId` |
| Buttons and rows | Hover background change (150ms); press scale to 0.98 | CSS transitions on `background-color` and `transform` |
| Dashboard period change | Numbers and charts crossfade (150ms); no count-up counters | CSS or `motion`; Recharts animation only on first mount |
| Saving a transaction or holding | List updates immediately, rolls back with an error toast on failure | React `useOptimistic` |

Starter CSS:

```css
@keyframes enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

.enter {
  animation: enter var(--dur-base) var(--ease) both;
  animation-delay: calc(var(--i, 0) * 30ms);
}

@media (prefers-reduced-motion: reduce) {
  .enter { animation: none; }
}
```

### 10.3 Rules

1. Animate only `transform` and `opacity`. Never animate `backdrop-filter`, blur radius, `box-shadow`, `width`, `height`, `top` or `left`.
2. Respect `prefers-reduced-motion: reduce`: remove movement and scaling; keep fades at 100ms or less, or none.
3. No looping animation except the skeleton opacity pulse. No bounce or overshoot.
4. Never block interaction while a transition runs.
5. Do not use `AnimatePresence` for route exit animations; it is unreliable with the App Router. Enter-only route transitions are the standard. Adopt the View Transitions API only if the installed Next.js docs describe a stable integration, and only as progressive enhancement.
6. Do not add decorative animation (floating shapes, parallax, animated backgrounds).

### 10.4 Glass and animation interaction

An ancestor with `opacity` below 1, `filter`, `mask` or `clip-path` can stop descendant `backdrop-filter` from seeing the page background, so the glass would flash flat during the animation. Therefore:

- Apply opacity animations directly to glass panels, or to wrappers that contain no glass.
- Never animate opacity on a wrapper that contains glass panels or the background shapes.
- `transform`-only animation on a wrapper is acceptable.
- Verify in Chrome and Safari that panels keep their blur during every transition.

## 11. Routes

| Path | Screen | Auth |
|---|---|---|
| `/login` | Login (email and password only; no sign-up link) | Public |
| `/` | Dashboard | Required |
| `/transactions` | Transaction list with filters and search | Required |
| `/transactions/new` | Add transaction | Required |
| `/transactions/[id]/edit` | Edit transaction | Required |
| `/portfolio` | Holdings, totals, allocation, refresh prices | Required |
| `/portfolio/new` | Add holding | Required |
| `/portfolio/[id]/edit` | Edit holding (including manual price) | Required |
| `/settings` | Month start day, USD to IDR rate, categories, income sources | Required |
| `POST /api/prices/refresh` | Refresh crypto prices | Required |

Unauthenticated users are redirected to `/login`. Authenticated users visiting `/login` are redirected to `/`.

## 12. Implementation Tasks

Do these in order, one commit per task. Follow the PLAN.md workflow (section 13) before each task. Do not start a task until the previous one's "Done when" checks pass.

### T0: Scaffold

Create the Next.js (App Router, TypeScript strict) project with Tailwind, ESLint, Prettier, Vitest, the folder layout from section 4, `.env.example`, `scripts/check-design-rules.mjs` and a README with setup instructions.

**Done when:**
- [ ] `npm run dev` shows a placeholder page
- [ ] `lint`, `typecheck`, `test`, `build` and `check:design` all pass
- [ ] `.env*` files (except `.env.example`) are git-ignored
- [ ] `check:design` fails when a test file with a gradient or an emoji is temporarily added, and passes again when removed

### T1: Database and security

Write `0001_init.sql` and `0002_portfolio.sql` from section 6, plus the three additional cash-flow RPC functions. Apply them to the Supabase project and generate `src/types/database.ts`. Ask the human to disable public sign-ups in Supabase Auth settings and create the single user manually.

**Done when:**
- [ ] `pg_tables` shows `rowsecurity = true` for all six tables
- [ ] pgTAP tests prove user B cannot select, insert, update or delete user A's rows in every table
- [ ] The new-user trigger created a profile, 8 categories and 3 income sources
- [ ] The reporting-period test cases pass in SQL
- [ ] pgTAP tests for `portfolio_holdings()` cover: manual price, CoinGecko quote, USD holding with a rate, USD holding without a rate (NULL IDR values), and a holding with no price

### T2: Authentication (SSR)

Build Supabase SSR clients, session refresh in middleware (or proxy), login page, protected route group and logout. Follow the current `@supabase/ssr` docs for the installed version.

**Done when:**
- [ ] Wrong credentials show an error message; correct credentials land on `/`
- [ ] Refreshing the page keeps the session
- [ ] Protected routes redirect to `/login` when logged out
- [ ] Server Actions and Route Handlers reject requests with no authenticated user

### T3: Core libraries

Implement `formatIDR`, `formatUSD`, `formatQuantity`, `formatPercent`, `parseAmountInput`, `parseDecimalInput`, `period.ts` and `today.ts`.

**Done when:**
- [ ] Unit tests cover every row of the reporting-period table and the current-period rule
- [ ] `formatIDR(1250000)` returns the Indonesian-formatted rupiah string
- [ ] `parseAmountInput("Rp 1.250.000")` returns `1250000`
- [ ] `parseDecimalInput("1.250,5")` returns `"1250.5"` and `parseDecimalInput("0,0054")` returns `"0.0054"`
- [ ] No test or implementation uses floating-point arithmetic on money

### T4: Design system and app shell

Implement the tokens, background shapes, `.glass` classes, `enter` animation, `template.tsx`, `loading.tsx`, the UI components (Button, Input, Select, SegmentedToggle, Dialog, Toast, Skeleton) and the app shell (sidebar and mobile tab bar). Build a temporary `/dev/styleguide` route to review components, and remove it before T11.

**Done when:**
- [ ] The design review checklist (9.9) passes
- [ ] Navigating between routes plays the enter animation, and panels keep their blur during it
- [ ] With reduced motion enabled, no movement occurs
- [ ] With reduced transparency enabled, surfaces are opaque and readable
- [ ] `check:design` passes

### T5: Settings

Build settings: month start day (1 to 31), read-only IDR currency, USD to IDR rate (optional, shows last updated time), and add/rename/archive/unarchive for categories and income sources.

**Done when:**
- [ ] Changing the month start day persists and shows a note that reports recompute
- [ ] The USD to IDR rate persists, rejects zero or negative values, and records the update time
- [ ] Duplicate names show the friendly error
- [ ] Archived items disappear from add-transaction dropdowns but stay visible under "Archived" in settings

### T6: Transactions

Add, edit, delete, list, filter and search.

Add/edit form:
- Field order: amount (autofocus, `inputMode="numeric"`), income/expense toggle, category or source select (switches with the toggle), date (browser-local today by default), note.
- Remember the last-used category and source (localStorage is acceptable for this convenience only).
- On save: optimistic list update, toast, return to the previous screen.

List:
- Newest first, 50 per page with "Load more".
- Filters in URL params: reporting month (default current period), type, and a category-or-source select shown only when a type is chosen.
- Case-insensitive search on `note`.
- Delete asks for confirmation.

**Done when:**
- [ ] Expense with category and income with source both save correctly
- [ ] The form blocks zero, negative, empty and over-maximum amounts, and the server rejects them too
- [ ] Edit and delete update the list without a full reload and with animation
- [ ] The month filter honors a custom start day (test with day 25)
- [ ] Loading, empty and error states exist

### T7: Dashboard (cash flow)

Use the RPC functions.

Contents:
- Period selector (previous/next and a label showing the actual date range).
- Income, expenses and net.
- Spending-by-category chart, income-by-source breakdown, 6-month trend (income vs expenses).
- A prominent "Add transaction" button.

**Done when:**
- [ ] Numbers match a manual SQL check on seed data
- [ ] Empty periods show zeros and an empty-state message, not errors
- [ ] Charts are readable at 360px width, in dark mode, and use only flat token colors
- [ ] Dashboard loads in under 2 seconds with 3,000 seeded transactions (use `scripts/seed-perf.ts`)

### T8: Portfolio (manual prices)

Holdings add, edit and delete; valuation from `portfolio_holdings()`; totals from `portfolio_summary()`; allocation chart from `portfolio_allocation()`; a Portfolio card on the dashboard (total value, unrealized gain or loss as amount and percent, link to `/portfolio`).

Holding form: asset type, symbol, name, platform (optional), quantity, average cost, price currency (IDR or USD), manual price. Crypto holdings show an extra "Price source" choice (manual or CoinGecko) that is enabled in T9.

**Done when:**
- [ ] Add, edit and delete work, with animation and optimistic updates
- [ ] Values, gains and percentages match the expected results of the pgTAP fixtures
- [ ] Decimal quantities such as `0,0054` save and display exactly
- [ ] Unpriced holdings are excluded from totals and counted; USD holdings without a rate show the banner
- [ ] Gains and losses show sign, color and icon
- [ ] Stale flags appear per section 7
- [ ] Allocation chart uses flat token colors

### T9: Automatic crypto prices

Read CoinGecko's current docs and report findings to the human (section 7) before coding. Then implement the provider, `POST /api/prices/refresh`, auto-refresh on portfolio open, and the "Refresh prices" button.

**Done when:**
- [ ] The API key exists only in server code; searching the production build output for the key and for `service_role` finds nothing
- [ ] Tests (with a mocked provider) cover: success, throttling, provider failure keeping cached prices, and unauthenticated 401
- [ ] A provider failure never shows a price of zero; the last known price shows with an "as of" time
- [ ] The refresh button shows a loading state and a result toast

### T10: Polish and documentation

Finish responsive layout, accessibility (labels, focus states, contrast), consistent loading and error handling, and the README: setup, environment variables, running migrations, creating the first user, deployment, and the backup procedure (periodic Supabase backup or SQL export).

**Done when:**
- [ ] All screens are usable one-handed at 360px width
- [ ] Light and dark mode both pass the design review checklist
- [ ] A new developer could set up the project from the README alone

### T11: Deploy

Deploy to Vercel with the environment variables. Remove `/dev/styleguide`.

**Done when:**
- [ ] The production URL loads, login works, and refreshing on `/transactions` and `/portfolio` does not 404
- [ ] No secrets appear in the client bundle other than the public Supabase URL and anon key

---

### v1.1 tasks (do not start until the human confirms v1 is in use)

**T12: PWA.** Add `app/manifest.ts` (name, icons, `display: standalone`) and a minimal service worker that caches the app shell only, following the official Next.js PWA guide. Add a home-screen shortcut to `/transactions/new`. **Done when:** the app is installable on a phone and launches full screen. Offline data entry is not supported; show a clear "You are offline" message instead of failing silently.

**T13: Accounts and transfers.** Ask the human to confirm the open decision about transfers (section 16) first.

**T14: CSV export.** Export transactions for a chosen date range and a holdings snapshot as CSV, with header rows, `YYYY-MM-DD` dates, integer rupiah amounts and exact decimal strings for quantities and prices.

## 13. Agent Workflow: PLAN.md

1. **Before each task, write a plan for that task only** to `PLAN.md` in the repository root: files to create or change, ordered steps, how it will be verified, risks, and questions. Keep it under 60 lines. Replace the previous task's plan, but keep a "Completed" log at the bottom with one line per finished task (task id, date, result of checks).
2. **Approval gates.** Stop and wait for the human to approve the plan before T0, T1 and T9, before any v1.1 task, and whenever the plan includes a new dependency, a schema change beyond this spec, or any deviation from this spec. For other tasks, write the plan and proceed.
3. Tick off steps in `PLAN.md` as they are completed.
4. When a task is done: run the checks from rule 15, update the "Completed" log, and commit.
5. If blocked, or the spec conflicts with how a library actually behaves, stop. Record it under "Blockers" in `PLAN.md` and ask the human.
6. Never edit `AGENTS.md` without asking.

## 14. Testing Requirements

- Unit tests: `format.ts`, `parse.ts`, `period.ts`, `today.ts`.
- Component tests: transaction form validation, holding form validation, decimal input preview.
- pgTAP: RLS on all six tables; `portfolio_holdings()`, `portfolio_summary()` and `portfolio_allocation()` fixtures.
- Route Handler tests with a mocked provider: success, throttle, provider failure, unauthenticated.
- Manual checks, recorded in the README: log in as a second user and confirm no data from the first user is visible; visual check of light and dark mode at 360px and 1280px; reduced-motion and reduced-transparency checks; blur stays intact during route transitions in Chrome and Safari.
- `check:design` runs with every lint.

## 15. Out of Scope (do not build)

- Public sign-up, password reset UI, email verification, multiple users, plans or billing
- Bank, broker or exchange syncing; wallet address scanning
- Trade history, lot tracking, realized gains, dividends, fees, taxes
- Portfolio history charts, price alerts, watchlists, news
- Automated prices for stocks, funds, gold or bonds; scraping or unofficial price sources
- Foreign-exchange providers (the USD to IDR rate is manual)
- Offline-first mode or background sync
- Budgets, recurring transactions, bill reminders, savings goals, CSV import, insights, "safe to spend" numbers
- A theme toggle, decorative animation, or any gradient or emoji
- Analytics, ads or tracking scripts
- Native mobile apps

## 16. Open Decisions (ask the human, do not decide)

1. Which backlog item comes first after v1.1: savings goals, CSV import or insights? (Budgets and recurring bills stay lower priority.)
2. Should transfers between wallets be excluded from income and expense totals? (Recommendation: yes, but confirm before T13.)
3. Should the dashboard get a "safe to spend today" figure once the month start day works?
4. Which provider, if any, should supply automated stock, fund and gold prices?
5. Should the portfolio keep a daily value history? (It needs a scheduled job; without the service-role key this would need a different design, so decide before building.)

## 17. Definition of Done (v1)

- [ ] Tasks T0 to T11 are complete and their checks pass
- [ ] RLS verified with a second user on all six tables
- [ ] No floating-point arithmetic on money, quantities or prices (search for `parseFloat`, `toFixed`, and `Number(` applied to money values)
- [ ] `npm run check:design` passes: zero gradients, zero emojis
- [ ] No secrets in the repository or the client bundle
- [ ] Reduced-motion and reduced-transparency behavior verified
- [ ] README is complete and accurate
- [ ] The owner can log a transaction in under 10 seconds on their phone and see an up-to-date portfolio value after a refresh

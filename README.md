# Personal Money Manager

A private web application for cash flow tracking (income and expenses with a configurable reporting month start day) and a portfolio snapshot (holdings, valuation math in SQL, manual prices, and automated crypto price feeds via CoinGecko).

## 1. Product Context & Core Rules

- **Reporting Currency:** Indonesian Rupiah (IDR). Cash flow amounts are stored and calculated strictly as integer Rupiah (`bigint`). Floating point math is never used on money.
- **Portfolio Precision:** Asset quantities, average costs, and unit prices are exact decimals stored as Postgres `numeric` and handled as strings via `decimal.js` in TypeScript.
- **Reporting Period:** The user configures their monthly reporting start day (e.g. 25th for payday). Reports, summaries, and charts automatically respect this boundary without altering stored transactions.
- **Fast Transaction Entry:** Optimized for quick logging on mobile browsers within 10 seconds.
- **Strict Tenant Isolation:** Row Level Security (RLS) is enabled on all tables (`user_id = auth.uid()`). The project never uses the Supabase `service_role` key under any circumstance.
- **Pure String Dates:** Dates are represented as plain `YYYY-MM-DD` strings to prevent timezone shifting artifacts.

## 2. Architecture & Technical Stack

- **Framework:** Next.js (App Router), React, TypeScript in strict mode.
- **Rendering Model:**
  - Pages and layouts are Server Components.
  - Mutations are executed via Server Actions with server-side `zod` validation.
  - Client Components are isolated strictly to interactive controls, forms, charts, dialogs, and animations.
- **Database & Auth:** Supabase (Postgres, SSR cookie auth). All aggregations and valuation mathematics occur inside SQL RPC functions (`SECURITY INVOKER`).
- **Styling:** Tailwind CSS with CSS variable design tokens.
- **Design System:** Content-first glassmorphism (`.glass`, `.glass-strong`) layered above flat solid-color background shapes.
- **Animation:** CSS keyframes for staggered entry (`.enter`) and Motion library for dialogs, toasts, and list transitions.
- **Charts:** Recharts with flat solid palette tokens (`--chart-1` through `--chart-5`).
- **Icons:** Lucide React (stroke width 1.75).
- **Automated Pricing:** CoinGecko API provider with server-side key management (`COINGECKO_API_KEY`), 60-second request throttling, 10-second timeout, and non-destructive cached quotes.

## 3. Database Schema & Security Model

The database architecture is defined in `supabase/migrations/`:

- `0001_init.sql`:
  - `profiles`: user preferences (reporting currency, `month_start_day`).
  - `categories`: expense categories with soft archiving.
  - `income_sources`: income sources with soft archiving.
  - `transactions`: ledger entries constrained to either an expense with category or income with source.
  - SQL RPCs: `period_start`, `period_end`, `month_summary`, `spending_by_category`, `income_by_source`, `monthly_trend`.
  - Trigger: `handle_new_user()` initializes profile, 8 default categories, and 3 income sources upon user creation.
- `0002_portfolio.sql`:
  - `profiles.usd_idr_rate`: manual exchange rate for foreign asset valuation.
  - `holdings`: position tracking per asset (stock, crypto, fund, gold, bond, other) with quantity, average cost, and price source.
  - `price_quotes`: cached provider price quotes.
  - SQL RPCs: `portfolio_holdings`, `portfolio_summary`, `portfolio_allocation`.
- `supabase/tests/rls.test.sql`:
  - Complete pgTAP test suite validating Row Level Security isolation between tenants across all public tables, reporting period date boundary edge cases, and portfolio valuation math.

## 4. Setup & Getting Started

### Prerequisites

- Node.js 20.9 or newer (Node 22 LTS recommended)
- npm 10 or newer
- A Supabase project instance

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

Populate the required server keys in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
COINGECKO_API_KEY=your-coingecko-demo-key
```

Note: Never prefix price provider keys with `NEXT_PUBLIC_`. Secrets remain strictly server-side.

3. Apply database migrations:

Execute `supabase/migrations/0001_init.sql` and `supabase/migrations/0002_portfolio.sql` in your Supabase SQL Editor. Disable public sign-ups in your Supabase Auth settings and manually create your user account.

4. Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to log in.

## 5. Performance Seeding & Benchmarks

To verify performance with high transaction volume, use the included benchmarking script:

```bash
npx tsx scripts/seed-perf.ts <user-email> <user-password>
```

This seeds 3,000 realistic transactions spread over categories and sources, then benchmarks all four Dashboard SQL RPC functions. All aggregation queries are designed to return in under 2,000 ms.

## 6. Available Scripts

- `npm run dev`: Start Next.js development server
- `npm run build`: Compile and optimize production build
- `npm run start`: Launch production web server
- `npm run lint`: Run ESLint and verify design rules
- `npm run typecheck`: Run TypeScript compiler type checking without emit
- `npm run test`: Run Vitest unit tests
- `npm run check:design`: Enforce strict anti-slop rules across source files and documentation

## 7. Design System & Anti-Slop Rationale

This project enforces a deliberate, calm, and readable aesthetic:

- **Surface Treatment:** Translucent glass panels with background blur (`backdrop-filter`) positioned over three flat, solid-color vector shapes. The shapes provide depth only where glass panels overlap.
- **Why Smooth Color Blends / Multi-color Ramps are Banned:** Smooth multi-color blends decrease numerical text contrast, create visual fatigue, and obscure tabular numbers. Every data visualization uses flat solid tokens (`--chart-1` through `--chart-5`).
- **Why Emojis are Banned:** Emojis add visual clutter and undermine professional precision in financial applications. All iconography is strictly sourced from Lucide React.
- **Typography:** IBM Plex Sans across the entire application with tabular numbers (`.num`, `font-variant-numeric: tabular-nums`) applied to every currency amount, quantity, and percentage.
- **Automated Enforcement:** `scripts/check-design-rules.mjs` scans all source files, styles, and markdown documentation during `npm run lint` and `npm run check:design` to guarantee compliance.

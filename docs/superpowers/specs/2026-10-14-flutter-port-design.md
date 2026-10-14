# Flowlet Flutter Port — Design Spec

Date: 2026-10-14
Status: Approved design, awaiting spec review
Scope: Full port of Next.js Flowlet to Flutter (mobile + desktop), shared Supabase backend, Flutter-optimized.

## 1. Context

Next.js source: `src/app/(app)/` (dashboard, transactions, portfolio, debts, settings), `src/lib/period.ts`, `src/lib/format.ts`, `src/lib/parse.ts`, `src/lib/today.ts`, `src/lib/staleness.ts`, `src/lib/privacy.ts`, `src/actions/*.ts`, Supabase RPCs in `supabase/migrations/0001_init.sql`, `0002_portfolio.sql`, `0003_debts.sql`.

Hard rules carried over (from AGENTS.md):
- Cash amounts are integer IDR (`bigint` in DB, `int` in Dart). Never `double`.
- Quantities/prices are exact decimals (`numeric` in DB, `decimal` package in Dart, strings over wire).
- RLS on all tables, `user_id = auth.uid()`. No `service_role` key in client.
- `COINGECKO_API_KEY` stays server-side in Next.js `POST /api/prices/refresh`. Flutter calls that endpoint with user JWT.
- Dates are `YYYY-MM-DD` strings. No UTC-shift parsing.
- Aggregations in SQL RPCs only.

## 2. Architecture

New Flutter app in `flowlet_flutter/` (separate pub package, same repo or sibling repo):

```
flowlet_flutter/
  lib/
    core/ (period, format, parse, today, staleness, privacy, supabase_client, theme, router)
    data/ (auth_repo, dashboard_repo, transactions_repo, portfolio_repo, debts_repo, settings_repo, prices_repo)
    features/ (auth, dashboard, transactions, portfolio, debts, settings, shared widgets)
  test/ (unit + widget + integration mirrors)
```

- State: Riverpod (AsyncNotifier per feature).
- Routing: go_router: `/login`, `/`, `/transactions`, `/transactions/new`, `/transactions/:id/edit`, `/portfolio`, `/portfolio/new`, `/portfolio/:id/edit`, `/debts`, `/settings`.
- Backend: same Supabase project URL + anon key. `supabase_flutter` for auth + `rpc()` + `from().select()`.
- Prices: `prices_repo.refresh()` does `POST {NEXT_PUBLIC_APP_URL}/api/prices/refresh` with `Authorization: Bearer <supabase access_token>`. Handles `{refreshed:false, reason: throttled|provider_error}`. Never writes zero/null prices.
- Desktop: same codebase, adaptive shell — `NavigationRail` >=1024px, `NavigationBar` 5 slots below.

## 3. Data Flow

- Auth: `supabase_flutter` email/password. Session in `flutter_secure_storage`. Unauthed -> `/login`.
- Dashboard: `Future.wait([month_summary, spending_by_category, income_by_source, monthly_trend])` with `(p_year, p_month)` label from `getCurrentPeriod(today, month_start_day)`. Period nav via `getAdjacentPeriod`.
- Transactions: list newest-first, `limit+1` pagination (50/page), filters (period, type, category/source, search sanitized via `escapeIlike` port). Mutations via direct table inserts/updates (RLS applies), then invalidate Riverpod providers. Optimistic UI with rollback + toast.
- Portfolio: `portfolio_holdings`, `portfolio_summary`, `portfolio_allocation` RPCs. CRUD on `holdings` table. Manual price writes `manual_price`; auto relies on `price_quotes`. USD holdings without `usd_idr_rate` -> banner + excluded from IDR totals (NULL handling per SQL).
- Debts: mirror existing debts table + partial payments + cash-flow sync behavior from Next.js actions.
- Settings: `profiles.month_start_day` (1-31), `usd_idr_rate` (>0, nullable, with `usd_idr_rate_updated_at`), categories/sources add/rename/archive.

## 4. Core Ports (exact)

- `period.dart`: `daysInMonth`, `periodStart`, `periodEnd`, `getCurrentPeriod`, `getAdjacentPeriod`, `formatPeriodRange`. Must pass all 7 cases from AGENTS.md 6.3.
- `format.dart`: `formatIDR` (NumberFormat `id_ID`, 0 decimals), `formatUSD` (`en_US`), `formatPrice(currency, maxDecimals 8)`, `formatQuantity` (8dp trim), `formatPercent` (explicit sign, 2dp). Use `decimal` + `intl`.
- `parse.dart`: `parseAmountInput` (strip non-digits, clamp 9_999_999_999_999), `parseDecimalInput` (dots ignored, single comma -> dot, regex `^\d+(\.\d+)?$`), `escapeIlike`.
- `today.dart`: `getTodayDate()` from device timezone, `YYYY-MM-DD`.
- `staleness.dart`: `isPriceStale(source, asOf)` manual >720h, auto >24h; `formatTimeAgo`.
- `privacy.dart`: `ValueNotifier<bool>` persisted in `SharedPreferences` (`hide_financial_numbers`), masks all money widgets.

## 5. UI / Theme (Flutter-optimized)

- Tokens from `src/app/globals.css`: bg, glass surfaces -> Flutter `Card` with `BackdropFilter` blur 16px (reduce to 10px if jank), 1px border, 16px panel / 10px control radii, single shadow.
- Type: IBM Plex Sans via `google_fonts`, sizes 12/14/16/20/28/40, tabular numbers (`FontFeature.tabularFigures()`).
- Colors: accent, positive `#1B7A4B` / negative `#B3261E` (dark variants), charts `--chart-1..5` flat fills via `fl_chart`. No gradients, no emojis. Sign + color + icon for gains.
- Motion: page fade+rises 8px/220ms, staggered 30ms max 8; dialogs scale 0.98->1; lists animated; segmented toggle sliding indicator; `prefers-reduced-motion` equivalent via `MediaQuery.disableAnimations`.
- Forms: amount autofocus numeric keyboard, income/expense segmented, category/source switch, live decimal preview (`= 1.250,5`), validation both client + server errors surfaced.

## 6. Error Handling

- Unauthed RPC -> redirect login.
- Validation errors -> inline field errors + friendly duplicate-name message.
- Provider failure -> keep cached quotes, show "as of" + Stale badge, toast.
- Offline -> blocking banner "You are offline", queue nothing in v1.
- Delete -> confirm dialog.

## 7. Testing

- `flutter test`: period (7 cases + current-period rule), format, parse, staleness, privacy.
- Widget tests: transaction form validation, holding form decimal preview.
- Integration (staging Supabase, second user): RLS isolation, portfolio math fixtures, refresh throttle/failure with mocked http.
- Manual checklist: second-user invisibility, 360px/1280px light/dark, reduced-motion, blur intact during transitions, no `service_role` / CoinGecko key in bundle (`strings` search).
- Perf: dashboard <2s with 3000 seeded rows (reuse `scripts/seed-perf.ts`).

## 8. Out of Scope

Same as AGENTS.md 15: sign-up/reset UI, bank sync, trade history/lots/dividends, stock auto-prices/scraping, FX providers, offline-first sync, budgets/recurring/goals/CSV import, theme toggle, analytics.

## 9. Open Decisions (deferred)

Per AGENTS.md 16: post-v1.1 backlog order, transfers, safe-to-spend, stock provider, daily history — not decided here.

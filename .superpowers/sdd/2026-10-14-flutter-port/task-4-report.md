# Task 4 Report: Dashboard (RPC parity)

## Status
Done. Commit `f86050f` on branch `feat/flutter-port`.

## Files changed
- Created `flowlet_flutter/lib/data/dashboard_repo.dart` — `MonthSummary`, `CatSpend`, `SrcIncome`, `TrendPoint`; `fetchMonthSummary`, `fetchSpendingByCategory`, `fetchIncomeBySource`, `fetchMonthlyTrend` calling exact RPC names with `p_year`/`p_month` (+ `p_months`, default 6). `int` money via `(x as num).toInt()`; aggregation in SQL only. Injectable `RpcCaller` typedef for tests, defaults to `db.rpc`.
- Created `flowlet_flutter/lib/features/dashboard/dashboard_screen.dart` — period prev/next with `formatPeriodRange`, hero Income/Expense/Net cards masked by Task-2 `privacyMode`, spending BarChart + income list + grouped 6-month trend via fl_chart with flat token colors only, loading/empty/error states, pull-to-refresh.
- Created `flowlet_flutter/test/data/dashboard_repo_test.dart` — 5 tests asserting RPC names, param maps, int parsing.
- Edited `flowlet_flutter/lib/core/router.dart` — `/` now builds `DashboardScreen` instead of `DashboardPlaceholder`.

## Build / verification
- TDD RED: `flutter test test/data/dashboard_repo_test.dart` failed before impl (missing `lib/data/dashboard_repo.dart`, method-not-found x4).
- TDD GREEN: same command after impl — 5/5 passed.
- Full suite: `flutter test test/core test/data/dashboard_repo_test.dart test/smoke_test.dart` — 31/31 passed.
- `flutter analyze` — no issues (fixed 9 initial errors: `IconButton.ariaLabel` removed, `fontVariantNumeric` replaced with `FontFeature.tabularFigures()`).
- RPC column names verified against `supabase/migrations/0001_init.sql` (`total_income/total_expense/net`, `category_id/name/total`, `source_id/name/total`, `year/month/total_income/total_expense`). No live-DB run (no seed env here); parsing matches migration fixtures.
- Self-review: no `gradient`/emoji/service_role/CoinGecko strings in new files; `.toDouble()` used only for chart bar heights, never money math.

## Concerns
- Bare `flutter test` (no args) discovers only `test/core/*` (25 tests) and silently skips `test/data/` + `test/smoke_test.dart` (pre-existing quirk — smoke test predates this task). Explicit paths run all 31. Worth a look by whoever owns test config.
- `git status` shows many `flowlet_flutter/` scaffold files still untracked (`android/`, `ios/`, `pubspec.lock`, etc.) from tasks 0-3 per-file `git add -f` commits. If that is unintentional, a follow-up should stage them.

## Fix round (2026-10-14)
- `lib/data/dashboard_repo.dart`: added `int _asInt(dynamic v)` (null to 0; num via `toInt()`; numeric String via `int.tryParse` with `double.tryParse` fallback, else 0) and used it for every total/income/expense/year/month mapping in all four fetchers. No `as num` casts remain.
- `lib/features/dashboard/dashboard_screen.dart`: added top-level `trendLabel(year, month)` producing `M/yy` (e.g. `10/26`, `1/27`) and used it for trend x-axis labels; `_TrendCard` renamed to public `TrendCard` (plus `super.key`) and now wraps the trend BarChart in a `ValueListenableBuilder` on `privacyMode` — hidden renders a 200px masked placeholder (`Rp ••••••`) instead of real magnitudes.
- Tests: 3 new repo tests (bigint-as-String summary, null-to-0 summary, String/null across category/source/trend); new `test/features/dashboard_screen_test.dart` (trendLabel M/yy incl. year boundary; widget tests for masked-hidden and labeled-visible trend states).
- Verification: `flutter test test/data/dashboard_repo_test.dart test/features/dashboard_screen_test.dart` — 11/11 passed. `flutter analyze` — no issues found.
- Commit: `4d0c324 fix(flutter): harden dashboard totals parsing, trend labels, privacy masking` (files: dashboard_repo.dart, dashboard_screen.dart, dashboard_repo_test.dart, dashboard_screen_test.dart).

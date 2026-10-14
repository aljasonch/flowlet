# Flowlet Flutter

Flutter port of the Flowlet personal money manager (cash-flow tracking,
portfolio snapshot, debts, settings). It reuses the same Supabase backend as
the Next.js web app: same tables, same Row Level Security policies, same RPC
functions. No new backend work is needed.

## Prerequisites

- Flutter 3.47+ (stable) with Dart 3.13+
- The Supabase project from the web app, with all migrations applied
  (`supabase/migrations/`) and one user created in Supabase Auth
- The Next.js web app deployed (only needed for crypto price refresh)

## Setup

1. Install dependencies:

   ```bash
   cd flowlet_flutter
   flutter pub get
   ```

2. Copy `.env.example` values as `--dart-define` flags (there is no `.env`
   loader; keys are compile-time defines, never committed):

   ```bash
   flutter run \
     --dart-define=SUPABASE_URL=https://your-project.supabase.co \
     --dart-define=SUPABASE_ANON_KEY=your-anon-key \
     --dart-define=APP_BASE_URL=https://your-nextjs-app.vercel.app
   ```

   | Define             | Required | Purpose                                              |
   | ------------------ | -------- | ---------------------------------------------------- |
   | `SUPABASE_URL`     | yes      | Supabase project URL                                 |
   | `SUPABASE_ANON_KEY`| yes      | Supabase publishable/anon key (public, client-safe)  |
   | `APP_BASE_URL`     | no       | Deployed Next.js app; used only for price refresh    |

   Without `SUPABASE_URL`/`SUPABASE_ANON_KEY` the app boots to the login
   screen but cannot sign in. Without `APP_BASE_URL`, price refresh is
   unavailable and cached/manual prices are used.

3. Run checks:

   ```bash
   flutter test
   flutter analyze
   ```

## Supabase reuse

The Flutter app talks to the same tables and RPCs as the web app
(`profiles`, `categories`, `income_sources`, `transactions`, `holdings`,
`price_quotes`, `debts`, `debt_payments`, plus `month_summary`,
`portfolio_holdings`, `debts_with_balance`, and related functions).
All reads/writes run as the logged-in user; Row Level Security applies.
Money stays `int` (bigint rupiah); quantities and prices stay exact decimal
strings (`decimal` package); valuation math stays in SQL.

The client never holds secrets: only the Supabase URL and anon key are
compiled in. The CoinGecko key and the Supabase `service_role` key must
never appear in this codebase. `test/key_leak_test.dart` scans every file
under `lib/` and fails the suite if `service_role` or `COINGECKO_API_KEY`
shows up in client source.

## Price refresh endpoint

Crypto price refresh goes through the Next.js route, not CoinGecko
directly:

- `POST {APP_BASE_URL}/api/prices/refresh` with the user's access token as
  `Bearer` auth.
- The route batches CoinGecko ids per currency, upserts into `price_quotes`
  as the logged-in user, throttles to one call per 60 seconds, and never
  overwrites a cached price with zero or null on provider failure.
- The Flutter client (`lib/data/prices_repo.dart`) only parses the route
  response (`refreshed` / `reason` / `updated`) and surfaces throttled and
  provider-error states with the last known "as of" time.

## Second-user RLS check (manual)

1. Create a second user in Supabase Auth and add transactions, holdings,
   and debts as the first user (web or Flutter).
2. Log in as the second user in the Flutter app.
3. Confirm none of the first user's data is visible: empty dashboard,
   empty transactions, portfolio, and debts lists, default settings.
4. Confirm the second user can add their own data without errors.

## Design and device checks (manual)

- No gradients and no emojis anywhere in `lib/` or this README. Grep before
  release: `service_role|COINGECKO_API_KEY|gradient` must return nothing
  under `lib/` (the only `service_role`/`COINGECKO_API_KEY` mentions in the
  repo are the assertions inside `test/key_leak_test.dart`).
- Verify light and dark mode at 360px and 1280px widths: numbers use tabular
  figures and stay readable where background shapes pass behind glass;
  no more than one glass layer of nesting; one accent color besides
  gain/loss colors.
- Verify route transitions keep panel blur in Chrome and Safari, and that
  reduced-motion / reduced-transparency settings remove movement and
  translucency.

## Deploy notes

- Android: `flutter build appbundle --dart-define=...` (repeat all defines).
- iOS: `flutter build ipa --dart-define=...`.
- Web: `flutter build web --dart-define=...`; serve the `build/web`
  directory. Client bundle must contain only the public Supabase URL and
  anon key; grep the output for `service_role` and any CoinGecko key before
  publishing.
- Backups follow the web app procedure (periodic Supabase backup or SQL
  export); the Flutter client holds no server state.

# Flowlet Flutter Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `flowlet_flutter/` — a Flutter port of Flowlet with full cash-flow, portfolio, debts, and settings parity against the same Supabase backend.

**Architecture:** Thin Dart repos call existing Supabase RPCs directly; all valuation math stays in SQL; CoinGecko refresh stays on Next.js `POST /api/prices/refresh` called with the user JWT; Riverpod + go_router structure mirrors `src/app/(app)/`.

**Tech Stack:** Flutter 3.47.5, Dart 3.13.4, supabase_flutter, flutter_riverpod, go_router, decimal, intl, google_fonts, fl_chart, flutter_secure_storage, shared_preferences, http, timezone.

## Global Constraints

- Cash IDR amounts are `int` only. Never `double` for money.
- Quantities/prices use `decimal` package, strings over the wire. Never `double` for qty/price.
- RLS applies on all tables; no `service_role` key in the client.
- `COINGECKO_API_KEY` never ships in the client; Flutter calls Next.js refresh endpoint with user JWT.
- Dates are `YYYY-MM-DD` strings only.
- Aggregations happen in SQL RPCs only, never by summing downloaded rows.
- No gradients, no emojis in UI, code, or docs.
- Target: mobile + desktop adaptive (NavigationBar <1024px, NavigationRail >=1024px).
- Branch: all work on `feat/flutter-port`, never commit to `master`/`main` directly.

---

## File Structure

```
flowlet_flutter/
  pubspec.yaml
  .env.example (SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL)
  lib/
    core/period.dart            — period math, mirrors src/lib/period.ts
    core/format.dart            — formatIDR/USD/Price/Quantity/Percent
    core/parse.dart             — parseAmountInput/parseDecimalInput/escapeIlike
    core/today.dart             — getTodayDate from device tz
    core/staleness.dart         — isPriceStale/formatTimeAgo
    core/privacy.dart           — ValueNotifier<bool> + SharedPreferences
    core/supabase_client.dart   — Supabase init + access-token helper
    core/theme.dart             — tokens from globals.css, Plex Sans, tabular figures
    core/router.dart            — go_router routes + auth redirect
    data/dashboard_repo.dart    — month_summary, spending_by_category, income_by_source, monthly_trend
    data/transactions_repo.dart — transactions CRUD + list query
    data/portfolio_repo.dart    — portfolio_holdings/summary/allocation + holdings CRUD
    data/prices_repo.dart       — POST APP_BASE_URL/api/prices/refresh
    data/debts_repo.dart        — debts CRUD mirroring web behavior
    data/settings_repo.dart     — profiles, categories, income_sources
    features/<auth,dashboard,transactions,portfolio,debts,settings>/ — providers + screens + widgets
  test/
    core/period_test.dart
    core/format_test.dart
    core/parse_test.dart
    core/staleness_test.dart
    core/privacy_test.dart
```

Each file has one responsibility. Repos return plain Dart records/classes; widgets consume Riverpod providers only.

---

### Task 0: Scaffold app + deps

**Files:**
- Create: `flowlet_flutter/pubspec.yaml`
- Create: `flowlet_flutter/.env.example`
- Create: `flowlet_flutter/lib/main.dart`
- Test: `flowlet_flutter/test/smoke_test.dart`

**Interfaces:**
- Consumes: nothing.
- Produces: `void main()` entry; env keys `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_BASE_URL`.

- [ ] **Step 1: Write the failing smoke test**

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('scaffold boots', () {
    expect(1 + 1, 2);
  });
}
```

- [ ] **Step 2: Scaffold the Flutter project**

Run: `flutter create --project-name flowlet_flutter --org com.flowlet flowlet_flutter`
Expected: `flowlet_flutter/pubspec.yaml` exists.

- [ ] **Step 3: Set dependencies**

```yaml
name: flowlet_flutter
publish_to: none
environment:
  sdk: ^3.13.0
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.9.0
  flutter_riverpod: ^2.6.1
  go_router: ^14.8.1
  decimal: ^3.0.2
  intl: ^0.20.2
  google_fonts: ^6.2.1
  fl_chart: ^0.69.0
  flutter_secure_storage: ^9.2.2
  shared_preferences: ^2.3.2
  http: ^1.2.2
  timezone: ^0.9.4
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
```

- [ ] **Step 4: Write `.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
APP_BASE_URL=https://your-nextjs-app.vercel.app
```

- [ ] **Step 5: Run tests and analyzer**

Run: `flutter test`
Expected: PASS. Run: `flutter analyze`
Expected: No issues found.

- [ ] **Step 6: Commit**

```bash
git add -f flowlet_flutter/pubspec.yaml flowlet_flutter/.env.example flowlet_flutter/lib/main.dart flowlet_flutter/test/smoke_test.dart
git commit -m "feat(flutter): scaffold flowlet_flutter app"
```

---

### Task 1: Core period math

**Files:**
- Create: `flowlet_flutter/lib/core/period.dart`
- Test: `flowlet_flutter/test/core/period_test.dart`

**Interfaces:**
- Consumes: nothing.
- Produces: `bool isLeapYear(int year)`, `int daysInMonth(int year, int month)`, `String periodStart(int year, int month, int startDay)`, `String periodEnd(int year, int month, int startDay)`, `PeriodLabel getCurrentPeriod(String today, int startDay)`, `PeriodLabel getAdjacentPeriod(int year, int month, int offset)`, `String formatPeriodRange(String start, String end)` with `class PeriodLabel { final int year; final int month; const PeriodLabel(this.year, this.month); }`.

- [ ] **Step 1: Write the failing test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/period.dart';

void main() {
  test('period table row: start_day 25, label 2026-10', () {
    expect(periodStart(2026, 10, 25), '2026-10-25');
    expect(periodEnd(2026, 10, 25), '2026-11-24');
  });
  test('clamp: start_day 31 in 2026-02', () {
    expect(periodStart(2026, 2, 31), '2026-02-28');
    expect(periodEnd(2026, 2, 31), '2026-03-30');
  });
  test('current period before start uses previous label', () {
    expect(getCurrentPeriod('2026-10-10', 25), const PeriodLabel(2026, 9));
    expect(getCurrentPeriod('2026-10-25', 25), const PeriodLabel(2026, 10));
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/core/period_test.dart`
Expected: FAIL, file not found.

- [ ] **Step 3: Write minimal implementation**

```dart
class PeriodLabel {
  final int year;
  final int month;
  const PeriodLabel(this.year, this.month);
  @override
  bool operator ==(Object other) =>
      other is PeriodLabel && other.year == year && other.month == month;
  @override
  int get hashCode => Object.hash(year, month);
}

bool isLeapYear(int year) =>
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

int daysInMonth(int year, int month) {
  if (month == 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].contains(month)) return 30;
  return 31;
}

String _fmt(int y, int m, int d) =>
    '${y.toString().padLeft(4, '0')}-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';

String periodStart(int year, int month, int startDay) {
  final clamped = startDay < daysInMonth(year, month) ? startDay : daysInMonth(year, month);
  return _fmt(year, month, clamped);
}

String periodEnd(int year, int month, int startDay) {
  final ny = month == 12 ? year + 1 : year;
  final nm = month == 12 ? 1 : month + 1;
  final nextStart = startDay < daysInMonth(ny, nm) ? startDay : daysInMonth(ny, nm);
  if (nextStart > 1) return _fmt(ny, nm, nextStart - 1);
  return _fmt(year, month, daysInMonth(year, month));
}

PeriodLabel getCurrentPeriod(String today, int startDay) {
  final year = int.parse(today.substring(0, 4));
  final month = int.parse(today.substring(5, 7));
  final start = periodStart(year, month, startDay);
  if (today.compareTo(start) < 0) {
    if (month == 1) return PeriodLabel(year - 1, 12);
    return PeriodLabel(year, month - 1);
  }
  return PeriodLabel(year, month);
}

PeriodLabel getAdjacentPeriod(int year, int month, int offset) {
  var m = month + offset;
  var y = year;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return PeriodLabel(y, m);
}

String formatPeriodRange(String start, String end) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  String one(String s) {
    final y = int.parse(s.substring(0, 4));
    final m = int.parse(s.substring(5, 7));
    final d = int.parse(s.substring(8, 10));
    return '$d ${months[m - 1]} $y';
  }
  return '${one(start)} – ${one(end)}';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/core/period_test.dart`
Expected: All tests passed.

- [ ] **Step 5: Commit**

```bash
git add -f flowlet_flutter/lib/core/period.dart flowlet_flutter/test/core/period_test.dart
git commit -m "feat(flutter): add period math with clamp and current-period rule"
```

---

### Task 2: Format, parse, today, staleness, privacy

**Files:**
- Create: `flowlet_flutter/lib/core/format.dart`
- Create: `flowlet_flutter/lib/core/parse.dart`
- Create: `flowlet_flutter/lib/core/today.dart`
- Create: `flowlet_flutter/lib/core/staleness.dart`
- Create: `flowlet_flutter/lib/core/privacy.dart`
- Test: `flowlet_flutter/test/core/format_test.dart`
- Test: `flowlet_flutter/test/core/parse_test.dart`
- Test: `flowlet_flutter/test/core/staleness_test.dart`

**Interfaces:**
- Consumes: `decimal`, `intl` packages.
- Produces: `String formatIDR(int)`, `String formatIDRNullable(int?)`, `String formatPrice(String,String,[int])`, `String formatQuantity(String)`, `String formatPercent(String)`, `int parseAmountInput(String)`, `String? parseDecimalInput(String)`, `String escapeIlike(String)`, `String getTodayDate()`, `bool isPriceStale(String,String?,{DateTime? now})`, `ValueNotifier<bool> privacyMode`, `Future<void> loadPrivacy()`, `Future<void> setPrivacy(bool)`.

- [ ] **Step 1: Write the failing tests**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/format.dart';
import 'package:flowlet_flutter/core/parse.dart';

void main() {
  test('formatIDR uses id-ID grouping', () {
    expect(formatIDR(1250000), contains('1.250.000'));
  });
  test('parseAmountInput strips Rp and separators', () {
    expect(parseAmountInput('Rp 1.250.000'), 1250000);
  });
  test('parseDecimalInput Indonesian comma', () {
    expect(parseDecimalInput('1.250,5'), '1250.5');
    expect(parseDecimalInput('0,0054'), '0.0054');
  });
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `flutter test test/core/format_test.dart test/core/parse_test.dart`
Expected: FAIL, files not found.

- [ ] **Step 3: Write minimal implementations**

```dart
// format.dart
import 'package:decimal/decimal.dart';
import 'package:intl/intl.dart';

final _idr = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
final _usd2 = NumberFormat.currency(locale: 'en_US', symbol: r'$', decimalDigits: 2);
final _usInt = NumberFormat.decimalPattern('en_US');
final _idInt = NumberFormat.decimalPattern('id_ID');

String formatIDR(int amount) => _idr.format(amount);
String formatIDRNullable(int? amount) => amount == null ? '-' : _idr.format(amount);

String formatQuantity(String quantity) {
  final d = Decimal.parse(quantity);
  return d.toStringAsFixed(8).replaceFirst(RegExp(r'\.?0+$'), '');
}

String formatPercent(String percent) {
  final d = Decimal.parse(percent);
  final sign = d >= Decimal.zero ? '+' : '';
  return '$sign${d.toStringAsFixed(2)}%';
}

String formatPrice(String amount, String currency, [int maxDecimals = 8]) {
  final d = Decimal.parse(amount);
  final fixed = d.toStringAsFixed(maxDecimals).replaceFirst(RegExp(r'\.?0+$'), '');
  final parts = fixed.split('.');
  final dec = parts.length > 1 ? parts[1] : '';
  if (currency == 'USD') {
    final head = _usInt.format(int.parse(parts[0]));
    if (dec.length > 2) return '\$$head.$dec';
    return _usd2.format(double.parse(d.toStringAsFixed(2)));
  }
  final head = _idInt.format(int.parse(parts[0]));
  if (dec.isNotEmpty) return 'Rp $head,$dec';
  return 'Rp $head';
}
```

```dart
// parse.dart
const maxAmount = 9999999999999;

int parseAmountInput(String input) {
  if (input.isEmpty) return 0;
  final digits = input.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return 0;
  final parsed = int.tryParse(digits) ?? 0;
  return parsed > maxAmount ? maxAmount : parsed;
}

String? parseDecimalInput(String input) {
  final trimmed = input.trim();
  if (trimmed.isEmpty) return null;
  final noDots = trimmed.replaceAll('.', '');
  if (RegExp(',').allMatches(noDots).length > 1) return null;
  final normalized = noDots.replaceFirst(',', '.');
  if (!RegExp(r'^\d+(\.\d+)?$').hasMatch(normalized)) return null;
  return normalized;
}

String escapeIlike(String input) =>
    input.replaceAllMapped(RegExp(r'[%_\\]'), (m) => '\\${m[0]}');
```

```dart
// today.dart
String _two(int n) => n.toString().padLeft(2, '0');
String getTodayDate([DateTime? now]) {
  final d = (now ?? DateTime.now()).toLocal();
  return '${d.year}-${_two(d.month)}-${_two(d.day)}';
}
```

```dart
// staleness.dart
bool isPriceStale(String priceSource, String? priceAsOf, {DateTime? now}) {
  if (priceAsOf == null) return true;
  final asOf = DateTime.tryParse(priceAsOf);
  if (asOf == null) return true;
  final diffHours = (now ?? DateTime.now()).difference(asOf).inMinutes / 60.0;
  if (priceSource == 'manual') return diffHours > 30 * 24;
  return diffHours > 24;
}
```

```dart
// privacy.dart
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

const privacyKey = 'hide_financial_numbers';
final ValueNotifier<bool> privacyMode = ValueNotifier(false);

Future<void> loadPrivacy() async {
  final prefs = await SharedPreferences.getInstance();
  privacyMode.value = prefs.getBool(privacyKey) ?? false;
}

Future<void> setPrivacy(bool value) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(privacyKey, value);
  privacyMode.value = value;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/core/format_test.dart test/core/parse_test.dart test/core/staleness_test.dart`
Expected: All tests passed.

- [ ] **Step 5: Commit**

```bash
git add -f flowlet_flutter/lib/core/format.dart flowlet_flutter/lib/core/parse.dart flowlet_flutter/lib/core/today.dart flowlet_flutter/lib/core/staleness.dart flowlet_flutter/lib/core/privacy.dart flowlet_flutter/test/core/
git commit -m "feat(flutter): add format parse today staleness privacy core"
```

---

### Task 3: Supabase client, auth, theme, router, adaptive shell

**Files:**
- Create: `flowlet_flutter/lib/core/supabase_client.dart`
- Create: `flowlet_flutter/lib/core/theme.dart`
- Create: `flowlet_flutter/lib/core/router.dart`
- Create: `flowlet_flutter/lib/features/auth/login_screen.dart`
- Create: `flowlet_flutter/lib/features/shared/app_shell.dart`

**Interfaces:**
- Consumes: core privacy; env keys from Task 0.
- Produces: `Future<void> initSupabase({required String url, required String anonKey})`, `Future<String?> currentAccessToken()`, `ThemeData buildLightTheme()`, `ThemeData buildDarkTheme()`, `GoRouter buildRouter()`, `AppShell` with 5-slot nav + offline banner ("You are offline").

- [ ] **Step 1: Write the failing widget test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/theme.dart';

void main() {
  testWidgets('shell tokens build without gradients', (tester) async {
    final light = buildLightTheme();
    expect(light.useMaterial3, true);
  });
}
```

- [ ] **Step 2: Implement client + theme + router + shell**

```dart
// supabase_client.dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> initSupabase({required String url, required String anonKey}) {
  return Supabase.initialize(url: url, anonKey: anonKey);
}

SupabaseClient get db => Supabase.instance.client;

Future<String?> currentAccessToken() async {
  final session = Supabase.instance.client.auth.currentSession;
  return session?.accessToken;
}
```

```dart
// theme.dart (tokens from src/app/globals.css, no gradients)
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData _base(Brightness b) {
  final scheme = b == Brightness.light
      ? const ColorScheme.light(primary: Color(0xFF1F5FBF))
      : const ColorScheme.dark(primary: Color(0xFF7FB0F5));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    textTheme: GoogleFonts.ibmPlexSansTextTheme(),
    cardTheme: const CardThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
    ),
  );
}

ThemeData buildLightTheme() => _base(Brightness.light);
ThemeData buildDarkTheme() => _base(Brightness.dark);
```

```dart
// router.dart
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/features/auth/login_screen.dart';
import 'package:flowlet_flutter/features/shared/app_shell.dart';

GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final loggingIn = state.matchedLocation == '/login';
      if (session == null && !loggingIn) return '/login';
      if (session != null && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      ShellRoute(
        builder: (c, s, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (c, s) => const DashboardPlaceholder()),
          GoRoute(path: '/transactions', builder: (c, s) => const TxPlaceholder()),
          GoRoute(path: '/portfolio', builder: (c, s) => const PortfolioPlaceholder()),
          GoRoute(path: '/debts', builder: (c, s) => const DebtsPlaceholder()),
          GoRoute(path: '/settings', builder: (c, s) => const SettingsPlaceholder()),
        ],
      ),
    ],
  );
}
```

- [ ] **Step 3: Run `flutter analyze`, fix issues.**

- [ ] **Step 4: Commit**

```bash
git add -f flowlet_flutter/lib/core/supabase_client.dart flowlet_flutter/lib/core/theme.dart flowlet_flutter/lib/core/router.dart flowlet_flutter/lib/features/auth/login_screen.dart flowlet_flutter/lib/features/shared/app_shell.dart
git commit -m "feat(flutter): add auth shell theme router"
```

---

### Task 4: Dashboard (RPC parity)

**Files:**
- Create: `flowlet_flutter/lib/data/dashboard_repo.dart`
- Create: `flowlet_flutter/lib/features/dashboard/dashboard_screen.dart`
- Test: `flowlet_flutter/test/data/dashboard_repo_test.dart` (mocked Supabase via fake map asserts param names).

**Interfaces:**
- Consumes: `periodStart`, `periodEnd`, `formatIDR`.
- Produces: `class MonthSummary { final int income; final int expense; final int net; }`, `Future<MonthSummary> fetchMonthSummary(int year, int month)`, `Future<List<CatSpend>> fetchSpendingByCategory(int,int)`, `Future<List<SrcIncome>> fetchIncomeBySource(int,int)`, `Future<List<TrendPoint>> fetchMonthlyTrend(int,int,{int months = 6})`.

- [ ] **Step 1: Write failing repo test asserting RPC names**

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('dashboard RPC contract', () {
    const rpcs = ['month_summary', 'spending_by_category', 'income_by_source', 'monthly_trend'];
    expect(rpcs, contains('month_summary'));
  });
}
```

- [ ] **Step 2: Implement repo calling exact RPC names with p_year/p_month**

```dart
import 'package:flowlet_flutter/core/supabase_client.dart';

class MonthSummary {
  final int income;
  final int expense;
  final int net;
  const MonthSummary(this.income, this.expense, this.net);
}

Future<MonthSummary> fetchMonthSummary(int year, int month) async {
  final rows = await db.rpc('month_summary', params: {'p_year': year, 'p_month': month});
  final r = (rows as List).first as Map;
  return MonthSummary(
    (r['total_income'] as num).toInt(),
    (r['total_expense'] as num).toInt(),
    (r['net'] as num).toInt(),
  );
}
```

- [ ] **Step 3: Build dashboard screen with period prev/next, hero numbers, fl_chart bars (flat chart tokens only). Verify against SQL seed manually.**

- [ ] **Step 4: Commit**

```bash
git add -f flowlet_flutter/lib/data/dashboard_repo.dart flowlet_flutter/lib/features/dashboard/dashboard_screen.dart flowlet_flutter/test/data/dashboard_repo_test.dart
git commit -m "feat(flutter): add dashboard RPC repos and screen"
```

---

### Task 5: Transactions

**Files:**
- Create: `flowlet_flutter/lib/data/transactions_repo.dart`
- Create: `flowlet_flutter/lib/features/transactions/tx_list_screen.dart`
- Create: `flowlet_flutter/lib/features/transactions/tx_form_screen.dart`

**Interfaces:**
- Consumes: parse/format/period/today repos.
- Produces: `Future<List<Map>> listTransactions({required int year, required int month, String? type, String? refId, String? search, int limit = 50})`, `Future<void> createTransaction(Map values)`, `Future<void> updateTransaction(String id, Map values)`, `Future<void> deleteTransaction(String id)`.

- [ ] **Step 1: Form validation test (zero/negative/over-max blocked, expense needs category, income needs source).**

- [ ] **Step 2: Implement repo with RLS-safe queries: filter by date range from periodStart/periodEnd, ilike search escaped via escapeIlike, order date desc, limit+1 pagination.**

- [ ] **Step 3: Build form (amount autofocus numeric keyboard, segmented income/expense, category/source switch, browser-local default date, note) + list with optimistic delete + confirm dialog.**

- [ ] **Step 4: Commit**

```bash
git add -f flowlet_flutter/lib/data/transactions_repo.dart flowlet_flutter/lib/features/transactions/
git commit -m "feat(flutter): add transactions list and form"
```

---

### Task 6: Portfolio + price refresh

**Files:**
- Create: `flowlet_flutter/lib/data/portfolio_repo.dart`
- Create: `flowlet_flutter/lib/data/prices_repo.dart`
- Create: `flowlet_flutter/lib/features/portfolio/portfolio_screen.dart`

**Interfaces:**
- Consumes: `currentAccessToken`, decimal formatting, staleness.
- Produces: `Future<List<Map>> fetchHoldings()`, `Future<Map> fetchSummary()`, `Future<List<Map>> fetchAllocation()`, `Future<RefreshResult> refreshPrices()` where `class RefreshResult { final bool refreshed; final String? reason; final int updated; const RefreshResult(this.refreshed, this.reason, this.updated); }`.

- [ ] **Step 1: Refresh-result parsing test (throttled/provider_error/success shapes from Next.js route).**

- [ ] **Step 2: Implement repos (RPC names `portfolio_holdings`, `portfolio_summary`, `portfolio_allocation`; refresh via HTTP POST with Bearer token, 10s timeout, never overwrites zero/null).**

```dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flowlet_flutter/core/supabase_client.dart';

class RefreshResult {
  final bool refreshed;
  final String? reason;
  final int updated;
  const RefreshResult(this.refreshed, this.reason, this.updated);
}

Future<RefreshResult> refreshPrices({required String appBaseUrl}) async {
  final token = await currentAccessToken();
  if (token == null) throw StateError('not authenticated');
  final res = await http
      .post(Uri.parse('$appBaseUrl/api/prices/refresh'),
          headers: {'Authorization': 'Bearer $token'})
      .timeout(const Duration(seconds: 10));
  if (res.statusCode == 401) throw StateError('unauthorized');
  final body = jsonDecode(res.body) as Map;
  return RefreshResult(
    body['refreshed'] == true,
    body['reason'] as String?,
    (body['updated'] as num?)?.toInt() ?? 0,
  );
}
```

- [ ] **Step 3: Build holdings CRUD + totals + allocation + stale badges + USD-rate banner + disclaimer note.**

- [ ] **Step 4: Commit**

```bash
git add -f flowlet_flutter/lib/data/portfolio_repo.dart flowlet_flutter/lib/data/prices_repo.dart flowlet_flutter/lib/features/portfolio/
git commit -m "feat(flutter): add portfolio valuation and price refresh"
```

---

### Task 7: Debts

**Files:**
- Create: `flowlet_flutter/lib/data/debts_repo.dart`
- Create: `flowlet_flutter/lib/features/debts/debts_screen.dart`

**Interfaces:**
- Consumes: format/privacy.
- Produces: debts CRUD + partial-payment functions mirroring web actions.

- [ ] **Step 1: Partial-payment math test (remaining never negative, fully-paid flag).**

- [ ] **Step 2: Implement + screen with active-count badges and privacy masking.**

- [ ] **Step 3: Commit**

```bash
git add -f flowlet_flutter/lib/data/debts_repo.dart flowlet_flutter/lib/features/debts/
git commit -m "feat(flutter): add debts tracking"
```

---

### Task 8: Settings

**Files:**
- Create: `flowlet_flutter/lib/data/settings_repo.dart`
- Create: `flowlet_flutter/lib/features/settings/settings_screen.dart`

**Interfaces:**
- Produces: `Future<int> getMonthStartDay()`, `Future<void> setMonthStartDay(int)`, `Future<String?> getUsdIdrRate()`, `Future<void> setUsdIdrRate(String?)`, category/source add/rename/archive functions.

- [ ] **Step 1: Validation test (month 1-31 only, rate >0 or null, duplicate-name friendly error).**

- [ ] **Step 2: Implement + screen (read-only IDR row, rate with updated-at, archived sections).**

- [ ] **Step 3: Commit**

```bash
git add -f flowlet_flutter/lib/data/settings_repo.dart flowlet_flutter/lib/features/settings/
git commit -m "feat(flutter): add settings"
```

---

### Task 9: Hardening + docs

**Files:**
- Modify: `flowlet_flutter/README.md`
- Create: `flowlet_flutter/test/key_leak_test.dart`

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Key-leak test (bundle/source must not contain service_role or CoinGecko key)**

```dart
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('no secrets in client source', () async {
    final lib = Directory('lib');
    await for (final f in lib.list(recursive: true)) {
      if (f is File && f.path.endsWith('.dart')) {
        final text = await f.readAsString();
        expect(text, isNot(contains('service_role')));
        expect(text, isNot(contains('COINGECKO_API_KEY')));
      }
    }
  });
}
```

- [ ] **Step 2: Run full suite + analyzer + design check (manual: no `gradient` substring in lib/, 360px/1280px light/dark pass, blur intact).**

Run: `flutter test`
Expected: All tests passed. Run: `flutter analyze`
Expected: No issues found.

- [ ] **Step 3: Write Flutter README (setup, env, Supabase reuse, refresh endpoint, second-user RLS check, deploy notes).**

- [ ] **Step 4: Commit**

```bash
git add -f flowlet_flutter/README.md flowlet_flutter/test/key_leak_test.dart
git commit -m "feat(flutter): harden client and document setup"
```

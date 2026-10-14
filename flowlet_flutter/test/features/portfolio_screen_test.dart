import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/data/portfolio_repo.dart';
import 'package:flowlet_flutter/data/prices_repo.dart';
import 'package:flowlet_flutter/features/portfolio/portfolio_screen.dart';

PortfolioHolding _holding({
  String id = 'h1',
  String symbol = 'BTC',
  String assetType = 'crypto',
  String priceCurrency = 'IDR',
  String priceSource = 'manual',
  String? currentPrice = '1050000000',
  String? priceAsOf = '2026-10-14T01:00:00Z',
  String? providerRef,
  int? valueIdr = 5670000,
  int? costIdr = 5130000,
  int? gainIdr = 540000,
  String? gainPct = '10.53',
}) {
  return PortfolioHolding(
    id: id,
    assetType: assetType,
    symbol: symbol,
    name: 'Bitcoin',
    platform: null,
    quantity: '0.0054',
    avgCost: '950000000',
    priceCurrency: priceCurrency,
    priceSource: priceSource,
    providerRef: providerRef,
    currentPrice: currentPrice,
    priceAsOf: priceAsOf,
    valueNative: currentPrice == null ? null : '5670000',
    costNative: '5130000',
    gainNative: gainPct == null ? null : '540000',
    gainPct: gainPct,
    valueIdr: valueIdr,
    costIdr: costIdr,
    gainIdr: gainIdr,
  );
}

Widget _screen({
  List<PortfolioHolding>? holdings,
  PortfolioSummary? summary,
  List<AllocationSlice>? allocation,
  String? usdRate = '16000',
  Future<RefreshResult> Function()? refresher,
  Future<String?> Function(String id)? providerRefFn,
}) {
  return MaterialApp(
    home: Scaffold(
      body: PortfolioScreen(
        holdingsFn: () async => holdings ?? [_holding()],
        summaryFn: () async =>
            summary ?? const PortfolioSummary(5670000, 5130000, 540000, 1, 0),
        allocationFn: () async =>
            allocation ?? const [AllocationSlice('crypto', 5670000, '100.00')],
        usdRateFn: () async => usdRate,
        refresher: refresher,
        providerRefFn: providerRefFn,
      ),
    ),
  );
}

void main() {
  testWidgets('shows totals, holding, allocation and disclaimer',
      (tester) async {
    await tester.pumpWidget(_screen());
    await tester.pumpAndSettle();
    expect(find.text('Portfolio'), findsOneWidget);
    expect(find.textContaining('5.670.000', findRichText: true),
        findsWidgets);
    expect(find.text('BTC'), findsOneWidget);
    expect(find.textContaining('Allocation by asset type'), findsOneWidget);
    expect(
        find.text(
            'Prices may be delayed or inaccurate. This is not financial advice.'),
        findsOneWidget);
  });

  testWidgets('shows USD-rate banner when USD holding has no rate',
      (tester) async {
    await tester.pumpWidget(_screen(
      holdings: [
        _holding(
            id: 'u1',
            symbol: 'AAPL',
            assetType: 'stock',
            priceCurrency: 'USD',
            currentPrice: '230',
            valueIdr: null,
            costIdr: null,
            gainIdr: null,
            gainPct: null),
      ],
      summary: const PortfolioSummary(0, 0, 0, 0, 1),
      allocation: const [],
      usdRate: null,
    ));
    await tester.pumpAndSettle();
    expect(
        find.text('USD to IDR exchange rate required'), findsOneWidget);
    expect(find.textContaining('excluded from valuation totals'),
        findsOneWidget);
  });

  testWidgets('flags stale prices with a Stale badge', (tester) async {
    await tester.pumpWidget(_screen(
      holdings: [
        _holding(priceAsOf: '2020-01-01T00:00:00Z'),
      ],
    ));
    await tester.pumpAndSettle();
    expect(find.text('Stale'), findsOneWidget);
  });

  testWidgets('gain shows sign, color and arrow icon', (tester) async {
    await tester.pumpWidget(_screen());
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.arrow_upward), findsWidgets);
    expect(find.textContaining('+Rp', findRichText: true), findsWidgets);
  });

  testWidgets('refresh button reports throttled state', (tester) async {
    await tester.pumpWidget(_screen(
      refresher: () async => const RefreshResult(false, 'throttled', 0),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Refresh prices'));
    await tester.pumpAndSettle();
    expect(
        find.text('Prices are already up to date'), findsOneWidget);
  });

  test('overallGainPct uses integer Decimal math', () {
    expect(overallGainPct(const PortfolioSummary(110, 100, 10, 1, 0)),
        '+10.00%');
    expect(overallGainPct(const PortfolioSummary(90, 100, -10, 1, 0)),
        '-10.00%');
    expect(overallGainPct(const PortfolioSummary(0, 0, 0, 0, 0)), isNull);
  });

  test('safeDatePrefix never throws on short or malformed input', () {
    expect(safeDatePrefix('2026-10-14T01:00:00Z'), '2026-10-14');
    expect(safeDatePrefix('2026-10-14'), '2026-10-14');
    expect(safeDatePrefix('2026'), '2026');
    expect(safeDatePrefix(''), '');
    expect(safeDatePrefix(null), '');
    expect(safeDatePrefix('   '), '');
  });

  testWidgets('privacy mode masks avg and price but keeps quantity visible',
      (tester) async {
    privacyMode.value = true;
    addTearDown(() => privacyMode.value = false);
    await tester.pumpWidget(_screen());
    await tester.pumpAndSettle();
    expect(find.textContaining('Qty: 0.0054'), findsWidgets);
    expect(find.textContaining('Avg: \u2022\u2022\u2022\u2022\u2022\u2022'),
        findsOneWidget);
    expect(find.textContaining('Px: \u2022\u2022\u2022\u2022\u2022\u2022'),
        findsOneWidget);
    expect(find.textContaining('950000000'), findsNothing);
  });

  testWidgets('edit dialog prefills provider ref fetched from holding row',
      (tester) async {
    await tester.pumpWidget(_screen(
      holdings: [
        _holding(
          id: 'cg1',
          priceSource: 'coingecko',
          currentPrice: '1050000000',
          priceAsOf: '2026-10-14T01:00:00Z',
          providerRef: null,
        ),
      ],
      providerRefFn: (_) async => 'bitcoin',
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit BTC'));
    await tester.pumpAndSettle();
    expect(find.text('bitcoin'), findsOneWidget);
  });

  testWidgets('edit dialog keeps provider ref already on the holding',
      (tester) async {
    await tester.pumpWidget(_screen(
      holdings: [
        _holding(
          id: 'cg2',
          priceSource: 'coingecko',
          currentPrice: '1050000000',
          priceAsOf: '2026-10-14T01:00:00Z',
          providerRef: 'ethereum',
        ),
      ],
      // Must not be consulted when the holding already carries its ref.
      providerRefFn: (_) async => throw StateError('should not be called'),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit BTC'));
    await tester.pumpAndSettle();
    expect(find.text('ethereum'), findsOneWidget);
  });

  testWidgets('coingecko save with empty coin id is blocked', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: HoldingDialog(
          existing: _holding(
            priceSource: 'coingecko',
            providerRef: null,
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();
    expect(find.text('Coin id is required'), findsOneWidget);
  });
}

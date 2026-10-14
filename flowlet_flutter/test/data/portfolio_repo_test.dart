import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/portfolio_repo.dart';

void main() {
  test('fetchHoldings uses exact RPC name portfolio_holdings', () async {
    String? fn;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      return [];
    }

    final rows = await fetchHoldings(rpc: fake);
    expect(fn, 'portfolio_holdings');
    expect(rows, isEmpty);
  });

  test('fetchHoldings maps all RPC columns, keeps decimals as String', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'id': 'h1',
          'asset_type': 'crypto',
          'symbol': 'BTC',
          'name': 'Bitcoin',
          'platform': 'Indodax',
          'quantity': '0.0054',
          'avg_cost': '950000000',
          'price_currency': 'IDR',
          'price_source': 'manual',
          'current_price': '1050000000',
          'price_as_of': '2026-10-14T01:00:00Z',
          'value_native': '5670000',
          'cost_native': '5130000',
          'gain_native': '540000',
          'gain_pct': '10.526315789473',
          'value_idr': 5670000,
          'cost_idr': 5130000,
          'gain_idr': 540000,
        },
      ];
    }

    final rows = await fetchHoldings(rpc: fake);
    expect(rows, hasLength(1));
    final h = rows.first;
    expect(h.id, 'h1');
    expect(h.assetType, 'crypto');
    expect(h.symbol, 'BTC');
    expect(h.name, 'Bitcoin');
    expect(h.platform, 'Indodax');
    expect(h.quantity, isA<String>());
    expect(h.quantity, '0.0054');
    expect(h.avgCost, '950000000');
    expect(h.currentPrice, '1050000000');
    expect(h.gainPct, '10.526315789473');
    expect(h.valueIdr, 5670000);
    expect(h.costIdr, 5130000);
    expect(h.gainIdr, 540000);
  });

  test('fetchHoldings parses bigint IDR totals arriving as String', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'id': 'h2',
          'asset_type': 'stock',
          'symbol': 'BBCA',
          'name': 'Bank BCA',
          'platform': null,
          'quantity': '10',
          'avg_cost': '9500',
          'price_currency': 'IDR',
          'price_source': 'manual',
          'current_price': '10200',
          'price_as_of': '2026-10-13T10:00:00Z',
          'value_native': '102000',
          'cost_native': '95000',
          'gain_native': '7000',
          'gain_pct': '7.368421052631579',
          'value_idr': '102000',
          'cost_idr': '95000',
          'gain_idr': '7000',
        },
      ];
    }

    final rows = await fetchHoldings(rpc: fake);
    final h = rows.first;
    expect(h.valueIdr, 102000);
    expect(h.costIdr, 95000);
    expect(h.gainIdr, 7000);
    expect(h.valueIdr, isA<int>());
  });

  test('fetchHoldings maps unpriced holding to null IDR values', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'id': 'h3',
          'asset_type': 'crypto',
          'symbol': 'ETH',
          'name': 'Ethereum',
          'platform': null,
          'quantity': '1.5',
          'avg_cost': '40000000',
          'price_currency': 'USD',
          'price_source': 'coingecko',
          'current_price': null,
          'price_as_of': null,
          'value_native': null,
          'cost_native': '60000000',
          'gain_native': null,
          'gain_pct': null,
          'value_idr': null,
          'cost_idr': null,
          'gain_idr': null,
        },
      ];
    }

    final rows = await fetchHoldings(rpc: fake);
    final h = rows.first;
    expect(h.currentPrice, isNull);
    expect(h.valueIdr, isNull);
    expect(h.costIdr, isNull);
    expect(h.gainIdr, isNull);
    expect(h.gainPct, isNull);
    expect(h.isPriced, isFalse);
  });

  test('fetchSummary uses exact RPC name and parses int totals', () async {
    String? fn;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      return [
        {
          'total_value_idr': '25000000',
          'total_cost_idr': 20000000,
          'total_gain_idr': '5000000',
          'priced_count': 3,
          'unpriced_count': 1,
        },
      ];
    }

    final s = await fetchSummary(rpc: fake);
    expect(fn, 'portfolio_summary');
    expect(s.totalValueIdr, 25000000);
    expect(s.totalCostIdr, 20000000);
    expect(s.totalGainIdr, 5000000);
    expect(s.pricedCount, 3);
    expect(s.unpricedCount, 1);
  });

  test('fetchSummary maps empty rows to zeros', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [];
    }

    final s = await fetchSummary(rpc: fake);
    expect(s.totalValueIdr, 0);
    expect(s.totalCostIdr, 0);
    expect(s.totalGainIdr, 0);
    expect(s.pricedCount, 0);
    expect(s.unpricedCount, 0);
  });

  test('fetchAllocation uses exact RPC name and keeps share as String',
      () async {
    String? fn;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      return [
        {'asset_type': 'crypto', 'value_idr': '15000000', 'share_pct': '60.00'},
        {'asset_type': 'stock', 'value_idr': 10000000, 'share_pct': 40},
      ];
    }

    final rows = await fetchAllocation(rpc: fake);
    expect(fn, 'portfolio_allocation');
    expect(rows, hasLength(2));
    expect(rows[0].assetType, 'crypto');
    expect(rows[0].valueIdr, 15000000);
    expect(rows[0].sharePct, isA<String>());
    expect(rows[1].sharePct, isA<String>());
  });

  test('decimal-string fields never pass through double', () async {    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'id': 'h4',
          'asset_type': 'crypto',
          'symbol': 'SAT',
          'name': 'Satoshi dust',
          'platform': null,
          'quantity': '0.00000001',
          'avg_cost': '0.00000002',
          'price_currency': 'USD',
          'price_source': 'manual',
          'current_price': '0.00000003',
          'price_as_of': '2026-10-14T01:00:00Z',
          'value_native': '0.0000000000000003',
          'cost_native': '0.0000000000000002',
          'gain_native': '0.0000000000000001',
          'gain_pct': '50.00',
          'value_idr': '1',
          'cost_idr': '1',
          'gain_idr': '0',
        },
      ];
    }

    final rows = await fetchHoldings(rpc: fake);
    final h = rows.first;
    expect(h.quantity, '0.00000001');
    expect(h.currentPrice, '0.00000003');
    expect(isValidDecimalString(h.quantity), isTrue);
    expect(isValidDecimalString(h.currentPrice!), isTrue);
  });

  test('fromRow maps provider_ref for CoinGecko holdings', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'id': 'h5',
          'asset_type': 'crypto',
          'symbol': 'BTC',
          'name': 'Bitcoin',
          'platform': null,
          'quantity': '0.1',
          'avg_cost': '900000000',
          'price_currency': 'IDR',
          'price_source': 'coingecko',
          'provider_ref': 'bitcoin',
          'current_price': '1050000000',
          'price_as_of': '2026-10-14T01:00:00Z',
          'value_native': '105000000',
          'cost_native': '90000000',
          'gain_native': '15000000',
          'gain_pct': '16.67',
          'value_idr': '105000000',
          'cost_idr': '90000000',
          'gain_idr': '15000000',
        },
      ];
    }

    final rows = await fetchHoldings(rpc: fake);
    expect(rows.first.providerRef, 'bitcoin');
  });

  test('fetchHoldingProviderRef returns ref, null when missing or blank',
      () async {
    Future<Map?> withRef(String id) async => {'provider_ref': 'bitcoin'};
    Future<Map?> missing(String id) async => null;
    Future<Map?> blank(String id) async => {'provider_ref': '  '};

    expect(await fetchHoldingProviderRef('h1', fetcher: withRef), 'bitcoin');
    expect(await fetchHoldingProviderRef('h1', fetcher: missing), isNull);
    expect(await fetchHoldingProviderRef('h1', fetcher: blank), isNull);
  });

  test('IDR parsing uses Decimal, never double: truncates, never throws',
      () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'total_value_idr': '123.9',
          'total_cost_idr': 'not-a-number',
          'total_gain_idr': '  7000  ',
          'priced_count': 45.9,
          'unpriced_count': null,
        },
      ];
    }

    final s = await fetchSummary(rpc: fake);
    expect(s.totalValueIdr, 123);
    expect(s.totalCostIdr, 0);
    expect(s.totalGainIdr, 7000);
    expect(s.pricedCount, 45);
    expect(s.unpricedCount, 0);
  });

  test('nullable IDR parsing preserves null, never collapses to zero',
      () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'id': 'h6',
          'asset_type': 'stock',
          'symbol': 'BBCA',
          'name': 'Bank BCA',
          'platform': null,
          'quantity': '10',
          'avg_cost': '9500',
          'price_currency': 'IDR',
          'price_source': 'manual',
          'current_price': '10200',
          'price_as_of': '2026-10-14T01:00:00Z',
          'value_native': '102000',
          'cost_native': '95000',
          'gain_native': '7000',
          'gain_pct': '7.37',
          'value_idr': '102000.9',
          'cost_idr': '',
          'gain_idr': 'abc',
        },
      ];
    }

    final rows = await fetchHoldings(rpc: fake);
    final h = rows.first;
    expect(h.valueIdr, 102000);
    expect(h.costIdr, isNull);
    expect(h.gainIdr, isNull);
  });

  test('decimalToString handles int exactly and normalizes doubles', () {
    expect(decimalToString(40), '40');
    expect(decimalToString('60.00'), '60.00');
    expect(decimalToString(null), isNull);
    expect(decimalToString(''), isNull);
    final tiny = decimalToString(1e-7);
    expect(tiny, isNotNull);
    expect(isValidDecimalString(tiny!), isTrue);
  });
}

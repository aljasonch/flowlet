import 'package:decimal/decimal.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';

typedef RpcCaller = Future<dynamic> Function(
  String fn, {
  Map<String, dynamic>? params,
});

Future<dynamic> _defaultRpc(String fn, {Map<String, dynamic>? params}) {
  return db.rpc(fn, params: params);
}

/// Tolerant bigint-IDR parsing. Assumption: PostgREST encodes bigint as
/// String; small ints may arrive as num in hand-built maps. Both routes use
/// integer/Decimal math only — never double arithmetic on money.
/// A fractional String (should not occur for bigint columns) truncates toward
/// zero; unparseable input maps to 0.
int _asInt(dynamic v) => _asInteger(v) ?? 0;

/// Nullable variant: null stays null so unpriced holdings are detectable.
/// Never collapses a real value to zero; only null/blank maps to null.
int? _asIntNullable(dynamic v) {
  if (v == null) return null;
  if (v is String && v.trim().isEmpty) return null;
  return _asInteger(v);
}

int? _asInteger(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is double) {
    return Decimal.tryParse(v.toString())?.toBigInt().toInt();
  }
  if (v is String) {
    final s = v.trim();
    if (s.isEmpty) return null;
    return int.tryParse(s) ?? Decimal.tryParse(s)?.toBigInt().toInt();
  }
  return null;
}

/// Decimal-typed RPC columns (quantity, prices, percents) arrive as numeric
/// Strings. Kept as String verbatim — never parsed through double.
String? _asDecimalString(dynamic v) => decimalToString(v);

/// Normalizes one decoded-JSON scalar that should be a decimal literal.
/// Assumption: PostgREST returns numerics as Strings; `num` only arrives in
/// hand-built maps/tests. ints stringify exactly; doubles go through Decimal
/// so exponent forms (e.g. 1e-7) normalize without float math.
String? decimalToString(dynamic v) {
  if (v == null) return null;
  if (v is int) return v.toString();
  if (v is double) {
    return Decimal.tryParse(v.toString())?.toString() ?? v.toString();
  }
  if (v is String) {
    final s = v.trim();
    return s.isEmpty ? null : s;
  }
  return null;
}

/// True when [s] is a valid decimal literal (no float involved).
bool isValidDecimalString(String s) => Decimal.tryParse(s) != null;

class PortfolioHolding {
  final String id;
  final String assetType;
  final String symbol;
  final String name;
  final String? platform;
  final String quantity;
  final String avgCost;
  final String priceCurrency;
  final String priceSource;
  final String? providerRef;
  final String? currentPrice;
  final String? priceAsOf;
  final String? valueNative;
  final String? costNative;
  final String? gainNative;
  final String? gainPct;
  final int? valueIdr;
  final int? costIdr;
  final int? gainIdr;

  const PortfolioHolding({
    required this.id,
    required this.assetType,
    required this.symbol,
    required this.name,
    required this.platform,
    required this.quantity,
    required this.avgCost,
    required this.priceCurrency,
    required this.priceSource,
    required this.providerRef,
    required this.currentPrice,
    required this.priceAsOf,
    required this.valueNative,
    required this.costNative,
    required this.gainNative,
    required this.gainPct,
    required this.valueIdr,
    required this.costIdr,
    required this.gainIdr,
  });

  bool get isPriced => valueIdr != null;

  factory PortfolioHolding.fromRow(Map row) {
    return PortfolioHolding(
      id: '${row['id']}',
      assetType: '${row['asset_type']}',
      symbol: '${row['symbol']}',
      name: '${row['name']}',
      platform: row['platform'] as String?,
      quantity: _asDecimalString(row['quantity']) ?? '0',
      avgCost: _asDecimalString(row['avg_cost']) ?? '0',
      priceCurrency: '${row['price_currency']}',
      priceSource: '${row['price_source']}',
      // portfolio_holdings() does not select provider_ref; null here means
      // "unknown, fetch the holding row" (see fetchHoldingProviderRef).
      providerRef: row['provider_ref'] as String?,
      currentPrice: _asDecimalString(row['current_price']),
      priceAsOf: row['price_as_of'] as String?,
      valueNative: _asDecimalString(row['value_native']),
      costNative: _asDecimalString(row['cost_native']),
      gainNative: _asDecimalString(row['gain_native']),
      gainPct: _asDecimalString(row['gain_pct']),
      valueIdr: _asIntNullable(row['value_idr']),
      costIdr: _asIntNullable(row['cost_idr']),
      gainIdr: _asIntNullable(row['gain_idr']),
    );
  }
}

class PortfolioSummary {
  final int totalValueIdr;
  final int totalCostIdr;
  final int totalGainIdr;
  final int pricedCount;
  final int unpricedCount;

  const PortfolioSummary(
    this.totalValueIdr,
    this.totalCostIdr,
    this.totalGainIdr,
    this.pricedCount,
    this.unpricedCount,
  );

  factory PortfolioSummary.fromRow(Map row) {
    return PortfolioSummary(
      _asInt(row['total_value_idr']),
      _asInt(row['total_cost_idr']),
      _asInt(row['total_gain_idr']),
      _asInt(row['priced_count']),
      _asInt(row['unpriced_count']),
    );
  }
}

class AllocationSlice {
  final String assetType;
  final int valueIdr;
  final String sharePct;

  const AllocationSlice(this.assetType, this.valueIdr, this.sharePct);

  factory AllocationSlice.fromRow(Map row) {
    return AllocationSlice(
      '${row['asset_type']}',
      _asInt(row['value_idr']),
      _asDecimalString(row['share_pct']) ?? '0',
    );
  }
}

/// Valuation rows mapped from SQL only; no client-side valuation math.
Future<List<PortfolioHolding>> fetchHoldings({RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call('portfolio_holdings') as List;
  return [
    for (final row in rows) PortfolioHolding.fromRow(row as Map),
  ];
}

Future<PortfolioSummary> fetchSummary({RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call('portfolio_summary') as List;
  if (rows.isEmpty) return const PortfolioSummary(0, 0, 0, 0, 0);
  return PortfolioSummary.fromRow(rows.first as Map);
}

Future<List<AllocationSlice>> fetchAllocation({RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call('portfolio_allocation') as List;
  return [
    for (final row in rows) AllocationSlice.fromRow(row as Map),
  ];
}

typedef HoldingDetailFetcher = Future<Map?> Function(String id);

Future<Map?> _defaultHoldingDetail(String id) {
  return db.from('holdings').select('provider_ref').eq('id', id).maybeSingle();
}

/// CoinGecko coin id for one holding. portfolio_holdings() does not select
/// provider_ref, so the edit dialog fetches the holding row for it.
/// Returns null when the row is missing or the ref is blank.
Future<String?> fetchHoldingProviderRef(
  String id, {
  HoldingDetailFetcher? fetcher,
}) async {
  final row = await (fetcher ?? _defaultHoldingDetail)(id);
  final ref = row?['provider_ref'];
  if (ref == null) return null;
  final s = '$ref'.trim();
  return s.isEmpty ? null : s;
}

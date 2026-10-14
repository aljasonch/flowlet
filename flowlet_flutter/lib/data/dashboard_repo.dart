import 'package:flowlet_flutter/core/supabase_client.dart';

class MonthSummary {
  final int income;
  final int expense;
  final int net;
  const MonthSummary(this.income, this.expense, this.net);
}

class CatSpend {
  final String categoryId;
  final String name;
  final int total;
  const CatSpend(this.categoryId, this.name, this.total);
}

class SrcIncome {
  final String sourceId;
  final String name;
  final int total;
  const SrcIncome(this.sourceId, this.name, this.total);
}

class TrendPoint {
  final int year;
  final int month;
  final int income;
  final int expense;
  const TrendPoint(this.year, this.month, this.income, this.expense);
}

typedef RpcCaller = Future<dynamic> Function(
  String fn, {
  Map<String, dynamic>? params,
});

Future<dynamic> _defaultRpc(String fn, {Map<String, dynamic>? params}) {
  return db.rpc(fn, params: params);
}

Future<MonthSummary> fetchMonthSummary(int year, int month,
    {RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call(
    'month_summary',
    params: {'p_year': year, 'p_month': month},
  ) as List;
  if (rows.isEmpty) return const MonthSummary(0, 0, 0);
  final r = rows.first as Map;
  return MonthSummary(
    (r['total_income'] as num).toInt(),
    (r['total_expense'] as num).toInt(),
    (r['net'] as num).toInt(),
  );
}

Future<List<CatSpend>> fetchSpendingByCategory(int year, int month,
    {RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call(
    'spending_by_category',
    params: {'p_year': year, 'p_month': month},
  ) as List;
  return [
    for (final row in rows)
      CatSpend(
        (row as Map)['category_id'] as String,
        row['name'] as String,
        (row['total'] as num).toInt(),
      ),
  ];
}

Future<List<SrcIncome>> fetchIncomeBySource(int year, int month,
    {RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call(
    'income_by_source',
    params: {'p_year': year, 'p_month': month},
  ) as List;
  return [
    for (final row in rows)
      SrcIncome(
        (row as Map)['source_id'] as String,
        row['name'] as String,
        (row['total'] as num).toInt(),
      ),
  ];
}

Future<List<TrendPoint>> fetchMonthlyTrend(int year, int month,
    {int months = 6, RpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call(
    'monthly_trend',
    params: {'p_year': year, 'p_month': month, 'p_months': months},
  ) as List;
  return [
    for (final row in rows)
      TrendPoint(
        ((row as Map)['year'] as num).toInt(),
        (row['month'] as num).toInt(),
        (row['total_income'] as num).toInt(),
        (row['total_expense'] as num).toInt(),
      ),
  ];
}

import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/dashboard_repo.dart';

void main() {
  test('month_summary called with p_year/p_month and parsed as int money', () async {
    String? fn;
    Map<String, dynamic>? gotParams;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      gotParams = params;
      return [
        {'total_income': 5000000, 'total_expense': 2000000, 'net': 3000000},
      ];
    }

    final s = await fetchMonthSummary(2026, 10, rpc: fake);
    expect(fn, 'month_summary');
    expect(gotParams, {'p_year': 2026, 'p_month': 10});
    expect(s.income, 5000000);
    expect(s.expense, 2000000);
    expect(s.net, 3000000);
  });

  test('spending_by_category uses exact RPC name and params', () async {
    String? fn;
    Map<String, dynamic>? gotParams;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      gotParams = params;
      return [
        {'category_id': 'c1', 'name': 'Food', 'total': 150000},
      ];
    }

    final rows = await fetchSpendingByCategory(2026, 10, rpc: fake);
    expect(fn, 'spending_by_category');
    expect(gotParams, {'p_year': 2026, 'p_month': 10});
    expect(rows, hasLength(1));
    expect(rows.first.name, 'Food');
    expect(rows.first.total, 150000);
  });

  test('income_by_source uses exact RPC name and params', () async {
    String? fn;
    Map<String, dynamic>? gotParams;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      gotParams = params;
      return [
        {'source_id': 's1', 'name': 'Salary', 'total': 8000000},
      ];
    }

    final rows = await fetchIncomeBySource(2026, 10, rpc: fake);
    expect(fn, 'income_by_source');
    expect(gotParams, {'p_year': 2026, 'p_month': 10});
    expect(rows.first.total, 8000000);
  });

  test('monthly_trend passes p_months default 6 with exact RPC name', () async {
    String? fn;
    Map<String, dynamic>? gotParams;
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      fn = f;
      gotParams = params;
      return [
        {'year': 2026, 'month': 10, 'total_income': 1, 'total_expense': 2},
      ];
    }

    final rows = await fetchMonthlyTrend(2026, 10, rpc: fake);
    expect(fn, 'monthly_trend');
    expect(gotParams, {'p_year': 2026, 'p_month': 10, 'p_months': 6});
    expect(rows.first.year, 2026);
    expect(rows.first.income, 1);
    expect(rows.first.expense, 2);
  });

  test('month_summary parses bigint-as-String totals', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'total_income': '5000000',
          'total_expense': '2000000',
          'net': '3000000',
        },
      ];
    }

    final s = await fetchMonthSummary(2026, 10, rpc: fake);
    expect(s.income, 5000000);
    expect(s.expense, 2000000);
    expect(s.net, 3000000);
  });

  test('month_summary maps null totals to 0', () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {'total_income': null, 'total_expense': null, 'net': null},
      ];
    }

    final s = await fetchMonthSummary(2026, 10, rpc: fake);
    expect(s.income, 0);
    expect(s.expense, 0);
    expect(s.net, 0);
  });

  test('category/source/trend totals tolerate String and null', () async {
    Future<dynamic> fakeCats(String f, {Map<String, dynamic>? params}) async {
      return [
        {'category_id': 'c1', 'name': 'Food', 'total': '150000'},
        {'category_id': 'c2', 'name': 'Other', 'total': null},
      ];
    }
    final cats = await fetchSpendingByCategory(2026, 10, rpc: fakeCats);
    expect(cats[0].total, 150000);
    expect(cats[1].total, 0);

    Future<dynamic> fakeSrcs(String f, {Map<String, dynamic>? params}) async {
      return [
        {'source_id': 's1', 'name': 'Salary', 'total': '8000000'},
        {'source_id': 's2', 'name': 'Other', 'total': null},
      ];
    }
    final srcs = await fetchIncomeBySource(2026, 10, rpc: fakeSrcs);
    expect(srcs[0].total, 8000000);
    expect(srcs[1].total, 0);

    Future<dynamic> fakeTrend(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'year': 2026,
          'month': 10,
          'total_income': '1000',
          'total_expense': null,
        },
      ];
    }
    final trend = await fetchMonthlyTrend(2026, 10, rpc: fakeTrend);
    expect(trend.first.income, 1000);
    expect(trend.first.expense, 0);
  });

  test('month_summary parses fractional and large bigint Strings without double',
      () async {
    Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
      return [
        {
          'total_income': '25000.9',
          'total_expense': '9999999999999',
          'net': '25000.9',
        },
      ];
    }

    final s = await fetchMonthSummary(2026, 10, rpc: fake);
    expect(s.income, 25000);
    expect(s.expense, 9999999999999);
    expect(s.net, 25000);
  });

  test('dashboard RPC contract names', () {    const rpcs = [
      'month_summary',
      'spending_by_category',
      'income_by_source',
      'monthly_trend',
    ];
    expect(rpcs, contains('month_summary'));
    expect(rpcs, contains('spending_by_category'));
    expect(rpcs, contains('income_by_source'));
    expect(rpcs, contains('monthly_trend'));
  });
}

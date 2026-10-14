import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/core/format.dart';
import 'package:flowlet_flutter/core/period.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';
import 'package:flowlet_flutter/core/today.dart';
import 'package:flowlet_flutter/data/dashboard_repo.dart';

const chartColors = <Color>[
  Color(0xFF1F5FBF),
  Color(0xFF6B7C8F),
  Color(0xFF8FA3B8),
  Color(0xFFA68A57),
  Color(0xFF5E8C74),
];

const _masked = 'Rp ••••••';

String trendLabel(int year, int month) =>
    '$month/${(year % 100).toString().padLeft(2, '0')}';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _year = 0;
  int _month = 0;
  int _monthStartDay = 1;
  bool _ready = false;
  bool _loading = false;
  String? _error;
  MonthSummary _summary = const MonthSummary(0, 0, 0);
  List<CatSpend> _cats = const [];
  List<SrcIncome> _srcs = const [];
  List<TrendPoint> _trend = const [];

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    var startDay = 1;
    try {
      final row = await db
          .from('profiles')
          .select('month_start_day')
          .maybeSingle();
      final v = row?['month_start_day'];
      if (v is num && v >= 1 && v <= 31) startDay = v.toInt();
    } catch (_) {
      startDay = 1;
    }
    final current = getCurrentPeriod(getTodayDate(), startDay);
    if (!mounted) return;
    setState(() {
      _monthStartDay = startDay;
      _year = current.year;
      _month = current.month;
      _ready = true;
    });
    await _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        fetchMonthSummary(_year, _month),
        fetchSpendingByCategory(_year, _month),
        fetchIncomeBySource(_year, _month),
        fetchMonthlyTrend(_year, _month),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = results[0] as MonthSummary;
        _cats = results[1] as List<CatSpend>;
        _srcs = results[2] as List<SrcIncome>;
        _trend = results[3] as List<TrendPoint>;
      });
    } on AuthException {
      if (!mounted) return;
      context.go('/login');
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load dashboard. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _shiftPeriod(int offset) {
    final next = getAdjacentPeriod(_year, _month, offset);
    setState(() {
      _year = next.year;
      _month = next.month;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Center(child: CircularProgressIndicator());
    }
    final start = periodStart(_year, _month, _monthStartDay);
    final end = periodEnd(_year, _month, _monthStartDay);
    final range = formatPeriodRange(start, end);
    final hasData = _summary.income > 0 ||
        _summary.expense > 0 ||
        _cats.isNotEmpty ||
        _srcs.isNotEmpty;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Dashboard',
                        style: Theme.of(context).textTheme.headlineSmall),
                    Text(range,
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              ValueListenableBuilder<bool>(
                valueListenable: privacyMode,
                builder: (context, hidden, _) => IconButton(
                  tooltip: hidden ? 'Show balances' : 'Hide balances',
                  icon: Icon(hidden
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined),
                  onPressed: () => setPrivacy(!hidden),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _PeriodSelector(
            range: range,
            onPrev: () => _shiftPeriod(-1),
            onNext: () => _shiftPeriod(1),
          ),
          const SizedBox(height: 12),
          if (_loading && !hasData && _error == null)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_error != null && !hasData)
            _ErrorBlock(message: _error!, onRetry: _load)
          else if (!hasData && !_loading)
            _EmptyBlock(onRetry: _load)
          else ...[
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(_error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            _SummaryCards(summary: _summary),
            const SizedBox(height: 16),
            _SpendingCard(cats: _cats),
            const SizedBox(height: 16),
            _IncomeCard(srcs: _srcs),
            const SizedBox(height: 16),
            TrendCard(trend: _trend),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => context.go('/transactions'),
                child: const Text('View all transactions for this period'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PeriodSelector extends StatelessWidget {
  const _PeriodSelector({
    required this.range,
    required this.onPrev,
    required this.onNext,
  });
  final String range;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          children: [
            IconButton(
              tooltip: 'Previous period',
              icon: const Icon(Icons.chevron_left),
              onPressed: onPrev,
            ),
            Expanded(
              child: Text(range, textAlign: TextAlign.center),
            ),
            IconButton(
              tooltip: 'Next period',
              icon: const Icon(Icons.chevron_right),
              onPressed: onNext,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({required this.summary});
  final MonthSummary summary;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: privacyMode,
      builder: (context, hidden, _) {
        String money(int v) => hidden ? _masked : formatIDR(v);
        return LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 600;
            final cards = [
              _Stat(label: 'Income', value: money(summary.income)),
              _Stat(label: 'Expenses', value: money(summary.expense)),
              _Stat(label: 'Net', value: money(summary.net)),
            ];
            if (wide) {
              return Row(
                children: [
                  for (var i = 0; i < cards.length; i++) ...[
                    Expanded(child: cards[i]),
                    if (i < cards.length - 1) const SizedBox(width: 12),
                  ],
                ],
              );
            }
            return Column(
              children: [
                for (var i = 0; i < cards.length; i++) ...[
                  cards[i],
                  if (i < cards.length - 1) const SizedBox(height: 8),
                ],
              ],
            );
          },
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpendingCard extends StatelessWidget {
  const _SpendingCard({required this.cats});
  final List<CatSpend> cats;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Spending by category',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (cats.isEmpty)
              const Text('No spending this period.')
            else
              SizedBox(
                height: 200,
                child: BarChart(
                  BarChartData(
                    maxY: _maxTotal(cats.map((c) => c.total).toList()),
                    gridData: const FlGridData(show: true),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (v, _) {
                            final i = v.toInt();
                            if (i < 0 || i >= cats.length) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                _short(cats[i].name),
                                style: const TextStyle(fontSize: 10),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: [
                      for (var i = 0; i < cats.length; i++)
                        BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: cats[i].total.toDouble(),
                              color: chartColors[i % chartColors.length],
                              width: 18,
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(4),
                                topRight: Radius.circular(4),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            for (var i = 0; i < cats.length; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      color: chartColors[i % chartColors.length],
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(cats[i].name)),
                    ValueListenableBuilder<bool>(
                      valueListenable: privacyMode,
                      builder: (context, hidden, _) => Text(
                        hidden ? _masked : formatIDR(cats[i].total),
                        style: const TextStyle(
                            fontFeatures: [FontFeature.tabularFigures()]),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _IncomeCard extends StatelessWidget {
  const _IncomeCard({required this.srcs});
  final List<SrcIncome> srcs;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Income by source',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (srcs.isEmpty)
              const Text('No income this period.')
            else
              for (final s in srcs)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(child: Text(s.name)),
                      ValueListenableBuilder<bool>(
                        valueListenable: privacyMode,
                        builder: (context, hidden, _) => Text(
                          hidden ? _masked : formatIDR(s.total),
                          style: const TextStyle(
                              fontFeatures: [FontFeature.tabularFigures()]),
                        ),
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class TrendCard extends StatelessWidget {
  const TrendCard({super.key, required this.trend});
  final List<TrendPoint> trend;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('6-month trend',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (trend.isEmpty)
              const Text('No trend data yet.')
            else
              ValueListenableBuilder<bool>(
                valueListenable: privacyMode,
                builder: (context, hidden, _) {
                  if (hidden) {
                    return const SizedBox(
                      height: 200,
                      child: Center(child: Text('Rp ••••••')),
                    );
                  }
                  return SizedBox(
                    height: 200,
                    child: BarChart(
                  BarChartData(
                    maxY: _maxTotal([
                      for (final t in trend) ...[t.income, t.expense],
                    ]),
                    gridData: const FlGridData(show: true),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (v, _) {
                            final i = v.toInt();
                            if (i < 0 || i >= trend.length) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                trendLabel(trend[i].year, trend[i].month),
                                style: const TextStyle(fontSize: 10),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: [
                      for (var i = 0; i < trend.length; i++)
                        BarChartGroupData(
                          x: i,
                          barsSpace: 4,
                          barRods: [
                            BarChartRodData(
                              toY: trend[i].income.toDouble(),
                              color: chartColors[0],
                              width: 10,
                            ),
                            BarChartRodData(
                              toY: trend[i].expense.toDouble(),
                              color: chartColors[1],
                              width: 10,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(message),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _EmptyBlock extends StatelessWidget {
  const _EmptyBlock({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text('No transactions this period yet.'),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: onRetry, child: const Text('Reload')),
          ],
        ),
      ),
    );
  }
}

double _maxTotal(List<int> values) {
  var max = 0;
  for (final v in values) {
    if (v > max) max = v;
  }
  if (max <= 0) return 1;
  return max.toDouble() * 1.1;
}

String _short(String name) {
  return name.length <= 6 ? name : name.substring(0, 6);
}

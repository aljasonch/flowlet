import 'package:decimal/decimal.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/core/format.dart';
import 'package:flowlet_flutter/core/parse.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/core/staleness.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';
import 'package:flowlet_flutter/data/portfolio_repo.dart';
import 'package:flowlet_flutter/data/prices_repo.dart';

const _masked = 'Rp ••••••';
const _maskedShort = '••••••';

Color _gainColor(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF5FCB92)
        : const Color(0xFF1B7A4B);

Color _lossColor(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFF28B82)
        : const Color(0xFFB3261E);

String _safeQuantity(String q) {
  try {
    return formatQuantity(q);
  } catch (_) {
    return q;
  }
}

String _safePrice(String p, String currency) {
  try {
    return formatPrice(p, currency);
  } catch (_) {
    return p;
  }
}

String _safePercent(String p) {
  try {
    return formatPercent(p);
  } catch (_) {
    return p;
  }
}

/// First 10 chars (YYYY-MM-DD) of an ISO timestamp. Tolerant of short or
/// malformed values — never throws on substring; '' means "no usable date".
String safeDatePrefix(String? iso) {
  if (iso == null) return '';
  final s = iso.trim();
  if (s.isEmpty) return '';
  return s.length >= 10 ? s.substring(0, 10) : s;
}

/// Display-only overall return from summary ints (mirrors the web view).
/// Integer Decimal math; valuation itself stays in SQL.
String? overallGainPct(PortfolioSummary s) {
  if (s.totalCostIdr <= 0) return null;
  final pct = (Decimal.fromInt(s.totalGainIdr) *
          Decimal.fromInt(100) /
          Decimal.fromInt(s.totalCostIdr))
      .toDecimal(scaleOnInfinitePrecision: 8);
  final fixed = pct.toStringAsFixed(2);
  return '${fixed.startsWith('-') ? '' : '+'}$fixed%';
}

/// Sign of a decimal-string percent: 1, -1, 0, or null when unparseable.
int? gainSign(String? gainPct) {
  if (gainPct == null) return null;
  final d = Decimal.tryParse(gainPct.trim());
  if (d == null) return null;
  if (d > Decimal.zero) return 1;
  if (d < Decimal.zero) return -1;
  return 0;
}

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({
    super.key,
    this.holdingsFn,
    this.summaryFn,
    this.allocationFn,
    this.usdRateFn,
    this.refresher,
    this.providerRefFn,
    this.appBaseUrl,
  });

  final Future<List<PortfolioHolding>> Function()? holdingsFn;
  final Future<PortfolioSummary> Function()? summaryFn;
  final Future<List<AllocationSlice>> Function()? allocationFn;
  final Future<String?> Function()? usdRateFn;
  final Future<RefreshResult> Function()? refresher;
  final Future<String?> Function(String id)? providerRefFn;
  final String? appBaseUrl;

  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  bool _loading = false;
  bool _refreshing = false;
  bool _autoRefreshed = false;
  String? _error;
  PortfolioSummary _summary = const PortfolioSummary(0, 0, 0, 0, 0);
  List<PortfolioHolding> _holdings = const [];
  List<AllocationSlice> _allocation = const [];
  String? _usdRate;
  bool _loadedOnce = false;

  Future<List<PortfolioHolding>> _getHoldings() =>
      widget.holdingsFn != null ? widget.holdingsFn!() : fetchHoldings();
  Future<PortfolioSummary> _getSummary() =>
      widget.summaryFn != null ? widget.summaryFn!() : fetchSummary();
  Future<List<AllocationSlice>> _getAllocation() =>
      widget.allocationFn != null ? widget.allocationFn!() : fetchAllocation();
  Future<String?> _getUsdRate() async {
    if (widget.usdRateFn != null) return widget.usdRateFn!();
    final row = await db.from('profiles').select('usd_idr_rate').maybeSingle();
    // usd_idr_rate is numeric: arrives as String; num handled defensively.
    return decimalToString(row?['usd_idr_rate']);
  }

  Future<RefreshResult> _doRefresh() {
    if (widget.refresher != null) return widget.refresher!();
    final base = widget.appBaseUrl ??
        const String.fromEnvironment('APP_BASE_URL');
    return refreshPrices(appBaseUrl: base);
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _getHoldings(),
        _getSummary(),
        _getAllocation(),
        _getUsdRate(),
      ]);
      if (!mounted) return;
      setState(() {
        _holdings = results[0] as List<PortfolioHolding>;
        _summary = results[1] as PortfolioSummary;
        _allocation = results[2] as List<AllocationSlice>;
        _usdRate = results[3] as String?;
        _loadedOnce = true;
      });
      _maybeAutoRefresh();
    } on AuthException {
      if (!mounted) return;
      context.go('/login');
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load portfolio. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Auto-refresh when the page opens and the newest crypto quote is older
  /// than 15 minutes. Silent on failure; cached prices stay visible.
  Future<void> _maybeAutoRefresh() async {
    if (_autoRefreshed) return;
    final crypto = _holdings.where((h) => h.priceSource == 'coingecko');
    if (crypto.isEmpty) return;
    _autoRefreshed = true;
    DateTime? newest;
    for (final h in crypto) {
      final asOf =
          h.priceAsOf == null ? null : DateTime.tryParse(h.priceAsOf!);
      if (asOf != null && (newest == null || asOf.isAfter(newest))) {
        newest = asOf;
      }
    }
    final stale = newest == null ||
        DateTime.now().difference(newest).inMinutes >= 15;
    if (!stale) return;
    try {
      final r = await _doRefresh();
      if (!mounted) return;
      if (r.refreshed) _load();
    } catch (_) {
      // Keep cached prices visible; manual refresh can retry.
    }
  }

  Future<void> _manualRefresh() async {
    setState(() => _refreshing = true);
    try {
      final r = await _doRefresh();
      if (!mounted) return;
      if (r.refreshed) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Prices updated (${r.updated})')),
        );
        await _load();
      } else if (r.reason == 'throttled') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prices are already up to date')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Price update failed. Showing last known prices.'),
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Price update failed. Try again.')),
      );
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  bool get _hasUsdHoldings =>
      _holdings.any((h) => h.priceCurrency == 'USD');
  bool get _showUsdBanner => _loadedOnce && _hasUsdHoldings && _usdRate == null;

  Future<void> _openForm({PortfolioHolding? existing}) async {
    // portfolio_holdings() omits provider_ref, so fetch the holding row for
    // CoinGecko edits; otherwise saving would wipe the coin id.
    String? providerRef = existing?.providerRef;
    if (existing != null &&
        existing.priceSource == 'coingecko' &&
        providerRef == null) {
      try {
        providerRef = widget.providerRefFn != null
            ? await widget.providerRefFn!(existing.id)
            : await fetchHoldingProviderRef(existing.id);
      } catch (_) {
        providerRef = null;
      }
    }
    if (!mounted) return;
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => HoldingDialog(
        existing: existing,
        initialProviderRef: providerRef,
      ),
    );
    if (saved == true && mounted) _load();
  }

  Future<void> _confirmDelete(PortfolioHolding h) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete position'),
        content: Text(
          'Are you sure you want to remove ${h.symbol} from your portfolio? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (!mounted || confirmed != true) return;
    final index = _holdings.indexWhere((e) => e.id == h.id);
    if (index < 0) return;
    setState(() {
      _holdings = List.of(_holdings)..removeAt(index);
    });
    try {
      await db.from('holdings').delete().eq('id', h.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Position removed')),
      );
      _load();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _holdings = List.of(_holdings)
          ..insert(index > _holdings.length ? _holdings.length : index, h);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not delete. Try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasData = _holdings.isNotEmpty ||
        _summary.totalValueIdr > 0 ||
        _summary.totalCostIdr > 0;
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
                    Text('Portfolio',
                        style: Theme.of(context).textTheme.headlineSmall),
                    Text('Holdings, valuation and unrealized gain or loss',
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
              IconButton(
                tooltip: 'Refresh prices',
                icon: _refreshing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh, size: 20),
                onPressed: _refreshing ? null : _manualRefresh,
              ),
              FilledButton.icon(
                onPressed: () => _openForm(),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_showUsdBanner)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_outlined, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('USD to IDR exchange rate required'),
                          const SizedBox(height: 4),
                          Text(
                            'You have positions priced in USD, but no exchange rate is configured. IDR totals exclude these positions until a rate is set in Settings.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          TextButton(
                            onPressed: () => context.go('/settings'),
                            child: const Text('Set exchange rate in Settings'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (_showUsdBanner) const SizedBox(height: 12),
          if (_loading && !hasData && _error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && !hasData)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(_error!),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: _load,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          else if (!hasData && !_loading)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Text('No holdings in your portfolio yet.'),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () => _openForm(),
                      child: const Text('Add position'),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  _error!,
                  style:
                      TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            _SummaryCards(summary: _summary),
            const SizedBox(height: 16),
            if (_summary.unpricedCount > 0)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  '${_summary.unpricedCount} position${_summary.unpricedCount == 1 ? '' : 's'} has no price and is excluded from valuation totals.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            if (_allocation.isNotEmpty) ...[
              _AllocationCard(allocation: _allocation),
              const SizedBox(height: 16),
            ],
            Row(
              children: [
                Expanded(
                  child: Text('Holdings',
                      style: Theme.of(context).textTheme.titleMedium),
                ),
                Text(
                  '${_holdings.length} position${_holdings.length == 1 ? '' : 's'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Card(
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (final h in _holdings)
                    HoldingTile(
                      key: ValueKey('holding-${h.id}'),
                      holding: h,
                      onEdit: () => _openForm(existing: h),
                      onDelete: () => _confirmDelete(h),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          Text(
            'Prices may be delayed or inaccurate. This is not financial advice.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({required this.summary});
  final PortfolioSummary summary;

  @override
  Widget build(BuildContext context) {
    final sign = summary.totalGainIdr > 0
        ? 1
        : (summary.totalGainIdr < 0 ? -1 : 0);
    final gainColor = sign > 0
        ? _gainColor(context)
        : (sign < 0 ? _lossColor(context) : null);
    return ValueListenableBuilder<bool>(
      valueListenable: privacyMode,
      builder: (context, hidden, _) {
        String money(int v) => hidden ? _masked : formatIDR(v);
        final gainText = hidden
            ? _maskedShort
            : '${sign > 0 ? '+' : ''}${formatIDR(summary.totalGainIdr)}';
        return LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 600;
            final cards = [
              _Stat(
                  label: 'Total portfolio value',
                  value: money(summary.totalValueIdr)),
              _Stat(
                  label: 'Total invested cost',
                  value: money(summary.totalCostIdr)),
              _Stat(
                label: 'Unrealized gain / loss',
                value: gainText,
                valueColor: hidden ? null : gainColor,
                icon: hidden
                    ? null
                    : (sign > 0
                        ? Icons.arrow_upward
                        : (sign < 0 ? Icons.arrow_downward : null)),
              ),
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
  const _Stat({
    required this.label,
    required this.value,
    this.valueColor,
    this.icon,
  });
  final String label;
  final String value;
  final Color? valueColor;
  final IconData? icon;

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
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 20, color: valueColor),
                  const SizedBox(width: 4),
                ],
                Flexible(
                  child: Text(
                    value,
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(
                          fontFeatures: const [
                            FontFeature.tabularFigures()
                          ],
                          color: valueColor,
                        ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AllocationCard extends StatelessWidget {
  const _AllocationCard({required this.allocation});
  final List<AllocationSlice> allocation;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Allocation by asset type',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            for (final a in allocation)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(a.assetType),
                    ),
                    ValueListenableBuilder<bool>(
                      valueListenable: privacyMode,
                      builder: (context, hidden, _) => Text(
                        hidden
                            ? _maskedShort
                            : '${formatIDR(a.valueIdr)} (${_safePercent(a.sharePct)})',
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

/// Single holding row with valuation, gain sign/color/icon, and staleness.
class HoldingTile extends StatelessWidget {
  const HoldingTile({
    super.key,
    required this.holding,
    required this.onEdit,
    required this.onDelete,
  });

  final PortfolioHolding holding;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final h = holding;
    final stale = isPriceStale(h.priceSource, h.priceAsOf);
    final hasPrice = h.currentPrice != null;
    final sign = gainSign(h.gainPct);
    final gainColor = sign == null || sign == 0
        ? null
        : (sign > 0 ? _gainColor(context) : _lossColor(context));
    final valueText = h.valueIdr != null
        ? formatIDR(h.valueIdr!)
        : (h.valueNative != null
            ? _safePrice(h.valueNative!, h.priceCurrency)
            : 'Unpriced');
    String gainText;
    if (h.gainPct == null) {
      gainText = hasPrice ? 'No cost baseline' : 'Unpriced position';
    } else {
      final amount = h.gainIdr != null
          ? formatIDR(h.gainIdr!)
          : (h.gainNative != null
              ? _safePrice(h.gainNative!, h.priceCurrency)
              : '');
      final prefix = (sign ?? 0) > 0 ? '+' : '';
      gainText = '$prefix$amount (${_safePercent(h.gainPct!)})';
    }
    return ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      title: Row(
        children: [
          Expanded(
            child: Text(
              h.symbol,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(h.assetType,
                style: Theme.of(context).textTheme.bodySmall),
          ),
          if (hasPrice && stale) ...[
            const SizedBox(width: 6),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.tertiaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.schedule,
                      size: 12,
                      color: Theme.of(context)
                          .colorScheme
                          .onTertiaryContainer),
                  const SizedBox(width: 4),
                  Text('Stale',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onTertiaryContainer,
                          )),
                ],
              ),
            ),
          ],
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (h.platform != null && h.platform!.isNotEmpty)
            Text('via ${h.platform!}'),
          ValueListenableBuilder<bool>(
            valueListenable: privacyMode,
            builder: (context, hidden, _) {
              final avg =
                  hidden ? _maskedShort : _safePrice(h.avgCost, h.priceCurrency);
              final px = !hasPrice
                  ? ''
                  : ' • Px: ${hidden ? _maskedShort : _safePrice(h.currentPrice!, h.priceCurrency)}';
              return Text(
                '${h.name} • Qty: ${_safeQuantity(h.quantity)} • Avg: $avg$px',
                style: const TextStyle(
                    fontFeatures: [FontFeature.tabularFigures()]),
              );
            },
          ),
          if (safeDatePrefix(h.priceAsOf).isNotEmpty)
            Text('Updated ${safeDatePrefix(h.priceAsOf)}',
                style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              ValueListenableBuilder<bool>(
                valueListenable: privacyMode,
                builder: (context, hidden, _) => Text(
                  hidden ? _masked : valueText,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(
                        fontFeatures: const [
                          FontFeature.tabularFigures()
                        ],
                      ),
                ),
              ),
              ValueListenableBuilder<bool>(
                valueListenable: privacyMode,
                builder: (context, hidden, _) {
                  if (hidden) return const Text(_maskedShort);
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (sign != null && sign != 0)
                        Icon(
                          sign > 0
                              ? Icons.arrow_upward
                              : Icons.arrow_downward,
                          size: 14,
                          color: gainColor,
                        ),
                      const SizedBox(width: 2),
                      Text(
                        gainText,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(
                              fontFeatures: const [
                                FontFeature.tabularFigures()
                              ],
                              color: gainColor,
                            ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
          IconButton(
            tooltip: 'Edit ${h.symbol}',
            icon: const Icon(Icons.edit_outlined, size: 20),
            onPressed: onEdit,
          ),
          IconButton(
            tooltip: 'Delete ${h.symbol}',
            icon: const Icon(Icons.delete_outlined, size: 20),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

const _assetTypes = ['stock', 'crypto', 'fund', 'gold', 'bond', 'other'];

/// Add/edit dialog for one position. Decimal inputs use Indonesian
/// convention (comma decimal separator) with a live parsed preview.
class HoldingDialog extends StatefulWidget {
  const HoldingDialog({super.key, this.existing, this.initialProviderRef});
  final PortfolioHolding? existing;

  /// Coin id fetched from the holding row (portfolio_holdings() omits it).
  final String? initialProviderRef;

  @override
  State<HoldingDialog> createState() => _HoldingDialogState();
}

class _HoldingDialogState extends State<HoldingDialog> {
  final _formKey = GlobalKey<FormState>();
  late String _assetType;
  late TextEditingController _symbol;
  late TextEditingController _name;
  late TextEditingController _platform;
  late TextEditingController _quantity;
  late TextEditingController _avgCost;
  late String _priceCurrency;
  late String _priceSource;
  late TextEditingController _providerRef;
  late TextEditingController _manualPrice;
  bool _saving = false;
  String? _saveError;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _assetType = e?.assetType ?? 'stock';
    _symbol = TextEditingController(text: e?.symbol ?? '');
    _name = TextEditingController(text: e?.name ?? '');
    _platform = TextEditingController(text: e?.platform ?? '');
    _quantity = TextEditingController(text: e?.quantity ?? '');
    _avgCost = TextEditingController(text: e?.avgCost ?? '');
    _priceCurrency = e?.priceCurrency ?? 'IDR';
    _priceSource = e?.priceSource ?? 'manual';
    _providerRef = TextEditingController(
        text: widget.initialProviderRef ?? e?.providerRef ?? '');
    _manualPrice = TextEditingController(text: e?.currentPrice ?? '');
  }

  @override
  void dispose() {
    _symbol.dispose();
    _name.dispose();
    _platform.dispose();
    _quantity.dispose();
    _avgCost.dispose();
    _providerRef.dispose();
    _manualPrice.dispose();
    super.dispose();
  }

  String? _validateDecimal(String? v,
      {required bool allowZero, required String label}) {
    final parsed = v == null ? null : parseDecimalInput(v);
    if (parsed == null) return 'Invalid $label';
    final d = Decimal.tryParse(parsed);
    if (d == null) return 'Invalid $label';
    if (allowZero ? d < Decimal.zero : d <= Decimal.zero) {
      return '$label must be greater than 0';
    }
    return null;
  }

  Future<void> _save() async {
    if (_priceSource == 'coingecko' && _assetType != 'crypto') {
      setState(() => _saveError = 'CoinGecko is only available for crypto');
      return;
    }
    // Never save a CoinGecko holding without its coin id: editing would
    // otherwise wipe provider_ref and break future price refreshes.
    if (_priceSource == 'coingecko' && _providerRef.text.trim().isEmpty) {
      setState(() => _saveError = 'Coin id is required');
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    final quantity = parseDecimalInput(_quantity.text)!;
    final avgCost = parseDecimalInput(_avgCost.text)!;
    final manualPrice = _priceSource == 'manual' &&
            _manualPrice.text.trim().isNotEmpty
        ? parseDecimalInput(_manualPrice.text)
        : null;
    setState(() {
      _saving = true;
      _saveError = null;
    });
    try {
      final payload = {
        'asset_type': _assetType,
        'symbol': _symbol.text.trim(),
        'name': _name.text.trim(),
        'platform': _platform.text.trim().isEmpty
            ? null
            : _platform.text.trim(),
        'quantity': quantity,
        'avg_cost': avgCost,
        'price_currency': _priceCurrency,
        'price_source': _priceSource,
        'provider_ref': _priceSource == 'coingecko'
            ? _providerRef.text.trim()
            : null,
        'manual_price':
            _priceSource == 'manual' ? manualPrice : null,
      };
      final existing = widget.existing;
      if (existing == null) {
        await db.from('holdings').insert(payload);
      } else {
        await db
            .from('holdings')
            .update(payload)
            .eq('id', existing.id);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(existing == null
              ? 'Position added'
              : 'Position updated'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _saveError = 'Could not save. Try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existing != null;
    final coingecko = _priceSource == 'coingecko';
    return AlertDialog(
      title: Text(isEdit ? 'Edit position' : 'Add position'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _assetType,
                decoration:
                    const InputDecoration(labelText: 'Asset type'),
                items: [
                  for (final t in _assetTypes)
                    DropdownMenuItem(value: t, child: Text(t)),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() {
                    _assetType = v;
                    if (v != 'crypto') _priceSource = 'manual';
                  });
                },
              ),
              TextFormField(
                controller: _symbol,
                decoration:
                    const InputDecoration(labelText: 'Symbol (e.g. BTC)'),
                validator: (v) {
                  final s = v?.trim() ?? '';
                  if (s.isEmpty) return 'Symbol is required';
                  if (s.length > 40) return 'Symbol is too long';
                  return null;
                },
              ),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (v) {
                  final s = v?.trim() ?? '';
                  if (s.isEmpty) return 'Name is required';
                  if (s.length > 100) return 'Name is too long';
                  return null;
                },
              ),
              TextFormField(
                controller: _platform,
                decoration: const InputDecoration(
                    labelText: 'Platform (optional)'),
                validator: (v) => (v != null && v.trim().length > 50)
                    ? 'Platform is too long'
                    : null,
              ),
              TextFormField(
                controller: _quantity,
                decoration: InputDecoration(
                  labelText: 'Quantity',
                  helperText: parseDecimalInput(_quantity.text) == null
                      ? null
                      : '= ${parseDecimalInput(_quantity.text)}',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => setState(() {}),
                validator: (v) => _validateDecimal(v,
                    allowZero: false, label: 'quantity'),
              ),
              TextFormField(
                controller: _avgCost,
                decoration: InputDecoration(
                  labelText: 'Average cost per unit',
                  helperText: parseDecimalInput(_avgCost.text) == null
                      ? null
                      : '= ${parseDecimalInput(_avgCost.text)}',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => setState(() {}),
                validator: (v) => _validateDecimal(v,
                    allowZero: true, label: 'average cost'),
              ),
              DropdownButtonFormField<String>(
                initialValue: _priceCurrency,
                decoration:
                    const InputDecoration(labelText: 'Price currency'),
                items: const [
                  DropdownMenuItem(value: 'IDR', child: Text('IDR')),
                  DropdownMenuItem(value: 'USD', child: Text('USD')),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _priceCurrency = v);
                },
              ),
              if (_assetType == 'crypto')
                DropdownButtonFormField<String>(
                  initialValue: _priceSource,
                  decoration:
                      const InputDecoration(labelText: 'Price source'),
                  items: const [
                    DropdownMenuItem(
                        value: 'manual', child: Text('Manual')),
                    DropdownMenuItem(
                        value: 'coingecko', child: Text('CoinGecko')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _priceSource = v);
                  },
                ),
              if (coingecko)
                TextFormField(
                  controller: _providerRef,
                  decoration: const InputDecoration(
                      labelText: 'CoinGecko coin id (e.g. bitcoin)'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty)
                          ? 'Coin id is required'
                          : null,
                )
              else
                TextFormField(
                  controller: _manualPrice,
                  decoration: InputDecoration(
                    labelText: 'Current price per unit (optional)',
                    helperText:
                        parseDecimalInput(_manualPrice.text) == null
                            ? null
                            : '= ${parseDecimalInput(_manualPrice.text)}',
                  ),
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  onChanged: (_) => setState(() {}),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return null;
                    return _validateDecimal(v,
                        allowZero: true, label: 'price');
                  },
                ),
              if (_saveError != null) ...[
                const SizedBox(height: 8),
                Text(_saveError!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error)),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving...' : 'Save'),
        ),
      ],
    );
  }
}

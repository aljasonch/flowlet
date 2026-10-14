import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/core/format.dart';
import 'package:flowlet_flutter/core/period.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';
import 'package:flowlet_flutter/core/today.dart';
import 'package:flowlet_flutter/data/transactions_repo.dart';

const _masked = 'Rp ••••••';

Color _gainColor(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF5FCB92)
        : const Color(0xFF1B7A4B);

String _refName(Map item) {
  final cat = item['category'];
  final src = item['source'];
  if (cat is Map && '${cat['name']}'.isNotEmpty) return '${cat['name']}';
  if (src is Map && '${src['name']}'.isNotEmpty) return '${src['name']}';
  return (item['type'] == 'income') ? 'Income' : 'Uncategorized';
}

/// Single transaction row with privacy masking and signed amount.
class TxListTile extends StatelessWidget {
  const TxListTile({
    super.key,
    required this.item,
    required this.onEdit,
    required this.onDelete,
  });

  final Map<String, dynamic> item;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final isExpense = item['type'] != 'income';
    final date = '${item['date'] ?? ''}';
    final note = item['note'] as String?;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      title: Row(
        children: [
          Expanded(
            child: Text(
              _refName(item),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
          const SizedBox(width: 8),
          Text(date, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
      subtitle: note == null || note.isEmpty
          ? null
          : Text(note, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ValueListenableBuilder<bool>(
            valueListenable: privacyMode,
            builder: (context, hidden, _) {
              if (hidden) return const Text(_masked);
              final amount = formatIDR(txAmountOf(item));
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isExpense ? Icons.arrow_downward : Icons.arrow_upward,
                    size: 16,
                    color: isExpense
                        ? Theme.of(context).colorScheme.onSurface
                        : _gainColor(context),
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '${isExpense ? '-' : '+'}$amount',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: isExpense ? null : _gainColor(context),
                    ),
                  ),
                ],
              );
            },
          ),
          IconButton(
            tooltip: 'Edit transaction',
            icon: const Icon(Icons.edit_outlined, size: 20),
            onPressed: onEdit,
          ),
          IconButton(
            tooltip: 'Delete transaction',
            icon: const Icon(Icons.delete_outlined, size: 20),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

class TxListScreen extends StatefulWidget {
  const TxListScreen({super.key});

  @override
  State<TxListScreen> createState() => _TxListScreenState();
}

class _TxListScreenState extends State<TxListScreen> {
  int _year = 0;
  int _month = 0;
  int _startDay = 1;
  bool _ready = false;
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _items = [];
  bool _hasMore = false;
  int _limit = 50;

  String _type = 'all';
  String _entityId = 'all';
  final _search = TextEditingController();
  String _appliedSearch = '';
  List<Map<String, dynamic>> _cats = const [];
  List<Map<String, dynamic>> _srcs = const [];

  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    var startDay = 1;
    try {
      final row =
          await db.from('profiles').select('month_start_day').maybeSingle();
      final v = row?['month_start_day'];
      if (v is num && v >= 1 && v <= 31) startDay = v.toInt();
    } catch (_) {
      startDay = 1;
    }
    if (!mounted) return;
    final current = getCurrentPeriod(getTodayDate(), startDay);
    setState(() {
      _startDay = startDay;
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
        listTransactions(
          year: _year,
          month: _month,
          startDay: _startDay,
          type: _type == 'all' ? null : _type,
          refId: _entityId == 'all' ? null : _entityId,
          search: _appliedSearch.isEmpty ? null : _appliedSearch,
          limit: _limit,
        ),
        fetchCategories(activeOnly: false),
        fetchSources(activeOnly: false),
      ]);
      if (!mounted) return;
      final page = results[0] as TxListResult;
      setState(() {
        _items = page.items;
        _hasMore = page.hasMore;
        _cats = results[1] as List<Map<String, dynamic>>;
        _srcs = results[2] as List<Map<String, dynamic>>;
      });
    } on AuthException {
      if (!mounted) return;
      context.go('/login');
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load transactions. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _shiftPeriod(int offset) {
    final next = getAdjacentPeriod(_year, _month, offset);
    setState(() {
      _year = next.year;
      _month = next.month;
      _limit = 50;
    });
    _load();
  }

  Future<void> _openForm(String path) async {
    await context.push(path);
    if (!mounted) return;
    _load();
  }

  Future<void> _confirmDelete(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete transaction'),
        content: const Text(
          'Are you sure you want to delete this transaction? This action cannot be undone.',
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
    if (!mounted) return;
    if (confirmed != true) return;

    final index = _items.indexWhere((t) => '${t['id']}' == id);
    if (index < 0) return;
    final removed = _items[index];
    setState(() {
      _items = List.of(_items)..removeAt(index);
      _deleting = true;
    });
    try {
      await deleteTransaction(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transaction deleted')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _items = List.of(_items)..insert(
              index > _items.length ? _items.length : index,
              removed,
            );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not delete. Try again.')),
      );
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Center(child: CircularProgressIndicator());
    }
    final range = formatPeriodRange(
      periodStart(_year, _month, _startDay),
      periodEnd(_year, _month, _startDay),
    );
    final entityOptions = _type == 'income' ? _srcs : _cats;
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
                    Text(
                      'Transactions',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    Text(range, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              ValueListenableBuilder<bool>(
                valueListenable: privacyMode,
                builder: (context, hidden, _) => IconButton(
                  tooltip: hidden ? 'Show balances' : 'Hide balances',
                  icon: Icon(
                    hidden
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                  ),
                  onPressed: () => setPrivacy(hidden),
                ),
              ),
              FilledButton.icon(
                onPressed: () => _openForm('/transactions/new'),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Previous period',
                    icon: const Icon(Icons.chevron_left),
                    onPressed: () => _shiftPeriod(-1),
                  ),
                  Expanded(
                    child: Text(range, textAlign: TextAlign.center),
                  ),
                  IconButton(
                    tooltip: 'Next period',
                    icon: const Icon(Icons.chevron_right),
                    onPressed: () => _shiftPeriod(1),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _type,
                          decoration: const InputDecoration(labelText: 'Type'),
                          items: const [
                            DropdownMenuItem(
                              value: 'all',
                              child: Text('All transactions'),
                            ),
                            DropdownMenuItem(
                              value: 'expense',
                              child: Text('Expenses'),
                            ),
                            DropdownMenuItem(
                              value: 'income',
                              child: Text('Income'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() {
                              _type = v;
                              _entityId = 'all';
                              _limit = 50;
                            });
                            _load();
                          },
                        ),
                      ),
                      if (_type != 'all') ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _entityId,
                            decoration: InputDecoration(
                              labelText: _type == 'expense'
                                  ? 'Category'
                                  : 'Income source',
                            ),
                            items: [
                              DropdownMenuItem(
                                value: 'all',
                                child: Text(
                                  _type == 'expense'
                                      ? 'All categories'
                                      : 'All sources',
                                ),
                              ),
                              for (final o in entityOptions)
                                DropdownMenuItem(
                                  value: '${o['id']}',
                                  child: Text('${o['name']}'),
                                ),
                            ],
                            onChanged: (v) {
                              if (v == null) return;
                              setState(() {
                                _entityId = v;
                                _limit = 50;
                              });
                              _load();
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _search,
                    decoration: InputDecoration(
                      labelText: 'Search note',
                      hintText: 'Search...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      suffixIcon: _appliedSearch.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear search',
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _search.clear();
                                setState(() {
                                  _appliedSearch = '';
                                  _limit = 50;
                                });
                                _load();
                              },
                            ),
                    ),
                    onSubmitted: (v) {
                      setState(() {
                        _appliedSearch = v.trim();
                        _limit = 50;
                      });
                      _load();
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (_loading && _items.isEmpty && _error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _items.isEmpty)
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
          else if (_items.isEmpty && !_loading)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Text('No transactions found for this period.'),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () => _openForm('/transactions/new'),
                      child: const Text('Add transaction'),
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
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
            Card(
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (final t in _items)
                    TxListTile(
                      key: ValueKey('tx-${t['id']}'),
                      item: t,
                      onEdit: () => _openForm('/transactions/${t['id']}/edit'),
                      onDelete: _deleting
                          ? () {}
                          : () => _confirmDelete('${t['id']}'),
                    ),
                  if (_hasMore)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: OutlinedButton(
                        onPressed: _loading
                            ? null
                            : () {
                                setState(() => _limit += 50);
                                _load();
                              },
                        child: const Text('Load more transactions'),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

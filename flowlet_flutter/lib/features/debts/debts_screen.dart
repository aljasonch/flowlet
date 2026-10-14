import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/core/format.dart';
import 'package:flowlet_flutter/core/parse.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/core/today.dart';
import 'package:flowlet_flutter/data/debts_repo.dart';
import 'package:flowlet_flutter/data/transactions_repo.dart'
    show fetchCategories, fetchSources;

const _masked = 'Rp ••••••';
const _maskedShort = '••••••';

Color _debtColor(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFF28B82)
        : const Color(0xFFB3261E);

Color _receivableColor(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF5FCB92)
        : const Color(0xFF1B7A4B);

String _statusLabel(String status) {
  switch (status) {
    case 'settled':
      return 'Settled';
    case 'partially_paid':
      return 'Partially paid';
    default:
      return 'Pending';
  }
}

/// Single debt row: balances, paid progress, status/overdue badges, actions.
/// Amounts and the progress magnitude are masked when privacy mode is on.
class DebtTile extends StatelessWidget {
  const DebtTile({
    super.key,
    required this.debt,
    required this.onPay,
    required this.onDelete,
  });

  final DebtRecord debt;
  final VoidCallback onPay;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final d = debt;
    final typeColor = d.isDebt ? _debtColor(context) : _receivableColor(context);
    final pct = paidPercent(amount: d.amount, paid: d.paidAmount);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: typeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  d.isDebt ? 'Debt' : 'Receivable',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: typeColor),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  d.personName,
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
                child: Text(
                  _statusLabel(d.status),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              if (d.isOverdue) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.tertiaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 12,
                        color: Theme.of(context)
                            .colorScheme
                            .onTertiaryContainer,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Overdue',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onTertiaryContainer,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          ValueListenableBuilder<bool>(
            valueListenable: privacyMode,
            builder: (context, hidden, _) {
              final remaining =
                  hidden ? _masked : formatIDR(d.remainingAmount);
              final total = hidden ? _masked : formatIDR(d.amount);
              final paid =
                  hidden ? _maskedShort : formatIDR(d.paidAmount);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Remaining: $remaining',
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(
                              fontFeatures: const [
                                FontFeature.tabularFigures()
                              ],
                            ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'of total $total',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (hidden)
                    const Text(_maskedShort)
                  else ...[
                    Text(
                      'Paid: $pct% ($paid)',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(
                            fontFeatures: const [
                              FontFeature.tabularFigures()
                            ],
                          ),
                    ),
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: pct / 100,
                      backgroundColor: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest,
                      color: typeColor,
                      minHeight: 6,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ],
                ],
              );
            },
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  d.dueDate == null || d.dueDate!.isEmpty
                      ? 'Recorded: ${d.date}'
                      : 'Recorded: ${d.date} • Due: ${d.dueDate}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              if (!d.isSettled)
                FilledButton.tonal(
                  onPressed: onPay,
                  child: Text(d.isDebt ? 'Pay' : 'Receive'),
                ),
              IconButton(
                tooltip: 'Delete record for ${d.personName}',
                icon: const Icon(Icons.delete_outlined, size: 20),
                onPressed: onDelete,
              ),
            ],
          ),
          if (d.note != null && d.note!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                d.note!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }
}

class DebtsScreen extends StatefulWidget {
  const DebtsScreen({
    super.key,
    this.debtsFn,
    this.summaryFn,
    this.categoriesFn,
    this.sourcesFn,
    this.createDebtFn,
    this.recordPaymentFn,
    this.deleteDebtFn,
  });

  final Future<List<DebtRecord>> Function()? debtsFn;
  final Future<DebtsSummary> Function()? summaryFn;
  final Future<List<Map<String, dynamic>>> Function()? categoriesFn;
  final Future<List<Map<String, dynamic>>> Function()? sourcesFn;
  final Future<void> Function(Map<String, dynamic> values)? createDebtFn;
  final Future<void> Function(DebtRecord debt, Map<String, dynamic> values)?
      recordPaymentFn;
  final Future<void> Function(String id)? deleteDebtFn;

  @override
  State<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends State<DebtsScreen> {
  bool _loading = false;
  String? _error;
  List<DebtRecord> _debts = const [];
  DebtsSummary _summary = const DebtsSummary(0, 0, 0, 0, 0);
  List<Map<String, dynamic>> _cats = const [];
  List<Map<String, dynamic>> _srcs = const [];

  String _typeFilter = 'all';
  String _statusFilter = 'active';

  Future<List<DebtRecord>> _getDebts() =>
      widget.debtsFn != null ? widget.debtsFn!() : fetchDebts();
  Future<DebtsSummary> _getSummary() =>
      widget.summaryFn != null ? widget.summaryFn!() : fetchDebtsSummary();
  Future<List<Map<String, dynamic>>> _getCats() =>
      widget.categoriesFn != null ? widget.categoriesFn!() : fetchCategories();
  Future<List<Map<String, dynamic>>> _getSrcs() =>
      widget.sourcesFn != null ? widget.sourcesFn!() : fetchSources();

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
        _getDebts(),
        _getSummary(),
        _getCats(),
        _getSrcs(),
      ]);
      if (!mounted) return;
      setState(() {
        _debts = results[0] as List<DebtRecord>;
        _summary = results[1] as DebtsSummary;
        _cats = results[2] as List<Map<String, dynamic>>;
        _srcs = results[3] as List<Map<String, dynamic>>;
      });
    } on AuthException {
      if (!mounted) return;
      context.go('/login');
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        context.go('/login');
      } else {
        setState(() => _error = 'Could not load debts. Try again.');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load debts. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<DebtRecord> get _filtered => _debts.where((d) {
        if (_typeFilter != 'all' && d.type != _typeFilter) return false;
        if (_statusFilter == 'active' && d.isSettled) return false;
        return true;
      }).toList();

  Future<void> _openCreate() async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => DebtFormDialog(
        onSave: widget.createDebtFn,
      ),
    );
    if (saved == true && mounted) _load();
  }

  Future<void> _openPayment(DebtRecord debt) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => PaymentDialog(
        debt: debt,
        categories: _cats,
        sources: _srcs,
        onSave: widget.recordPaymentFn,
      ),
    );
    if (saved == true && mounted) _load();
  }

  Future<void> _confirmDelete(DebtRecord debt) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete record'),
        content: Text(
          'Are you sure you want to delete the record for "${debt.personName}"? All related payment history will also be deleted.',
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
    final index = _debts.indexWhere((e) => e.id == debt.id);
    if (index < 0) return;
    setState(() {
      _debts = List.of(_debts)..removeAt(index);
    });
    try {
      if (widget.deleteDebtFn != null) {
        await widget.deleteDebtFn!(debt.id);
      } else {
        await deleteDebt(debt.id);
      }
      if (!mounted) return;
      await _refreshSummary();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Record deleted')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _debts = List.of(_debts)
          ..insert(index > _debts.length ? _debts.length : index, debt);
      });
      await _refreshSummary();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not delete. Try again.')),
      );
    }
  }

  /// Reloads the summary card totals without touching the list. Failures
  /// are ignored so a stale summary never masks the list state.
  Future<void> _refreshSummary() async {
    try {
      final s = await _getSummary();
      if (!mounted) return;
      setState(() => _summary = s);
    } catch (_) {
      // Keep the existing summary.
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
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
                    Text('Debts',
                        style: Theme.of(context).textTheme.headlineSmall),
                    Text(
                      'Money you owe and money owed to you',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
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
              FilledButton.icon(
                onPressed: _openCreate,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _SummaryCards(summary: _summary),
          if (_summary.overdueCount > 0) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_outlined, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'You have ${_summary.overdueCount} record${_summary.overdueCount == 1 ? '' : 's'} past ${_summary.overdueCount == 1 ? 'its' : 'their'} due date.',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'all', label: Text('All')),
                    ButtonSegment(value: 'debt', label: Text('Debts')),
                    ButtonSegment(
                        value: 'receivable', label: Text('Receivables')),
                  ],
                  selected: {_typeFilter},
                  onSelectionChanged: (s) =>
                      setState(() => _typeFilter = s.first),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'active', label: Text('Unpaid')),
                    ButtonSegment(value: 'all', label: Text('All statuses')),
                  ],
                  selected: {_statusFilter},
                  onSelectionChanged: (s) =>
                      setState(() => _statusFilter = s.first),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loading && _debts.isEmpty && _error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _debts.isEmpty)
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
          else if (filtered.isEmpty && !_loading)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Text('No debts or receivables recorded yet.'),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: _openCreate,
                      child: const Text('Add record'),
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
            Card(
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (final d in filtered)
                    DebtTile(
                      key: ValueKey('debt-${d.id}'),
                      debt: d,
                      onPay: () => _openPayment(d),
                      onDelete: () => _confirmDelete(d),
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

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({required this.summary});
  final DebtsSummary summary;

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
              _Stat(
                label: 'Total unpaid debts',
                value: money(summary.totalUnpaidDebt),
                badge:
                    '${summary.unpaidDebtCount} unpaid',
                valueColor: hidden ? null : _debtColor(context),
              ),
              _Stat(
                label: 'Total unpaid receivables',
                value: money(summary.totalUnpaidReceivable),
                badge:
                    '${summary.unpaidReceivableCount} unpaid',
                valueColor:
                    hidden ? null : _receivableColor(context),
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
    required this.badge,
    this.valueColor,
  });
  final String label;
  final String value;
  final String badge;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(label,
                      style: Theme.of(context).textTheme.bodySmall),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(badge,
                      style: Theme.of(context).textTheme.bodySmall),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
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
          ],
        ),
      ),
    );
  }
}

/// Create-debt dialog. Amount is parsed with [parseAmountInput] (digit
/// stripping, thousand preview); the repo validates and normalizes on save.
class DebtFormDialog extends StatefulWidget {
  const DebtFormDialog({super.key, this.onSave});
  final Future<void> Function(Map<String, dynamic> values)? onSave;

  @override
  State<DebtFormDialog> createState() => _DebtFormDialogState();
}

class _DebtFormDialogState extends State<DebtFormDialog> {
  String _type = 'debt';
  final _person = TextEditingController();
  final _amount = TextEditingController();
  final _date = TextEditingController();
  final _dueDate = TextEditingController();
  final _note = TextEditingController();
  int _numericAmount = 0;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _date.text = getTodayDate();
    _amount.addListener(_onAmountChanged);
  }

  void _onAmountChanged() {
    final parsed = parseAmountInput(_amount.text);
    if (parsed != _numericAmount) setState(() => _numericAmount = parsed);
  }

  @override
  void dispose() {
    _amount.removeListener(_onAmountChanged);
    _person.dispose();
    _amount.dispose();
    _date.dispose();
    _dueDate.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final dueRaw = _dueDate.text.trim();
    final error = validateDebtInput(
      type: _type,
      personName: _person.text,
      amount: _numericAmount,
      date: _date.text.trim(),
      dueDate: dueRaw.isEmpty ? null : dueRaw,
      note: _note.text,
    );
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    final values = {
      'type': _type,
      'person_name': _person.text.trim(),
      'amount': _numericAmount,
      'date': _date.text.trim(),
      'due_date': dueRaw.isEmpty ? null : dueRaw,
      'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.onSave != null) {
        await widget.onSave!(values);
      } else {
        await createDebt(values);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_type == 'debt'
              ? 'Debt recorded'
              : 'Receivable recorded'),
        ),
      );
    } on AuthException {
      if (!mounted) return;
      context.go('/login');
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        context.go('/login');
      } else {
        setState(() => _error = 'Could not save. Try again.');
      }
    } catch (e) {
      if (!mounted) return;
      final message =
          e is ArgumentError ? e.message.toString() : 'Could not save. Try again.';
      setState(() => _error = message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_type == 'debt' ? 'Record new debt' : 'Record new receivable'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'debt', label: Text('Debt (I owe)')),
                ButtonSegment(
                    value: 'receivable', label: Text('Receivable (owed to me)')),
              ],
              selected: {_type},
              onSelectionChanged: (s) => setState(() => _type = s.first),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('debt-person'),
              controller: _person,
              maxLength: 100,
              decoration: InputDecoration(
                labelText: _type == 'debt'
                    ? 'Lender name'
                    : 'Borrower name',
              ),
            ),
            TextField(
              key: const ValueKey('debt-amount'),
              controller: _amount,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,\s]'))
              ],
              style: const TextStyle(
                fontFeatures: [FontFeature.tabularFigures()],
              ),
              decoration: const InputDecoration(
                labelText: 'Amount (IDR)',
                hintText: 'Rp 0',
              ),
            ),
            if (_numericAmount > 0)
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '= $_numericAmount',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(
                        fontFeatures: const [
                          FontFeature.tabularFigures()
                        ],
                      ),
                ),
              ),
            const SizedBox(height: 8),
            TextField(
              key: const ValueKey('debt-date'),
              controller: _date,
              keyboardType: TextInputType.datetime,
              decoration: const InputDecoration(
                labelText: 'Date originated',
                hintText: 'YYYY-MM-DD',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              key: const ValueKey('debt-due-date'),
              controller: _dueDate,
              keyboardType: TextInputType.datetime,
              decoration: const InputDecoration(
                labelText: 'Due date (optional)',
                hintText: 'YYYY-MM-DD',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              key: const ValueKey('debt-note'),
              controller: _note,
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Note (optional)',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving...' : 'Save record'),
        ),
      ],
    );
  }
}

/// Record-payment dialog with optional cash-flow sync. Debt payments create
/// an expense, receivable collections an income, mirroring the web action.
class PaymentDialog extends StatefulWidget {
  const PaymentDialog({
    super.key,
    required this.debt,
    this.categories = const [],
    this.sources = const [],
    this.onSave,
  });

  final DebtRecord debt;
  final List<Map<String, dynamic>> categories;
  final List<Map<String, dynamic>> sources;
  final Future<void> Function(DebtRecord debt, Map<String, dynamic> values)?
      onSave;

  @override
  State<PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<PaymentDialog> {
  final _amount = TextEditingController();
  final _date = TextEditingController();
  final _note = TextEditingController();
  int _numericAmount = 0;
  bool _recordToCashflow = true;
  String? _refId;
  bool _saving = false;
  String? _error;

  List<Map<String, dynamic>> get _refs =>
      widget.debt.isDebt ? widget.categories : widget.sources;

  @override
  void initState() {
    super.initState();
    _amount.text = widget.debt.remainingAmount > 0
        ? '${widget.debt.remainingAmount}'
        : '';
    _numericAmount = widget.debt.remainingAmount;
    _date.text = getTodayDate();
    if (_refs.isNotEmpty) _refId = '${_refs.first['id']}';
    _amount.addListener(_onAmountChanged);
  }

  void _onAmountChanged() {
    final parsed = parseAmountInput(_amount.text);
    if (parsed != _numericAmount) setState(() => _numericAmount = parsed);
  }

  @override
  void dispose() {
    _amount.removeListener(_onAmountChanged);
    _amount.dispose();
    _date.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final error = validatePaymentInput(
      amount: _numericAmount,
      paymentDate: _date.text.trim(),
      recordToCashflow: _recordToCashflow,
      debtType: widget.debt.type,
      categoryId: widget.debt.isDebt ? _refId : null,
      sourceId: widget.debt.isDebt ? null : _refId,
      note: _note.text,
    );
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    final values = {
      'amount': _numericAmount,
      'payment_date': _date.text.trim(),
      'record_to_cashflow': _recordToCashflow,
      'category_id': widget.debt.isDebt ? _refId : null,
      'source_id': widget.debt.isDebt ? null : _refId,
      'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.onSave != null) {
        await widget.onSave!(widget.debt, values);
      } else {
        await recordDebtPayment(debt: widget.debt, values: values);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.debt.isDebt
              ? 'Debt payment recorded'
              : 'Receivable payment recorded'),
        ),
      );
    } on AuthException {
      if (!mounted) return;
      context.go('/login');
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        context.go('/login');
      } else {
        setState(() => _error = 'Could not save. Try again.');
      }
    } catch (e) {
      if (!mounted) return;
      final message =
          e is ArgumentError ? e.message.toString() : 'Could not save. Try again.';
      setState(() => _error = message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final debt = widget.debt;
    return AlertDialog(
      title: Text(debt.isDebt ? 'Pay debt' : 'Receive payment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ValueListenableBuilder<bool>(
              valueListenable: privacyMode,
              builder: (context, hidden, _) {
                final remaining =
                    hidden ? _masked : formatIDR(debt.remainingAmount);
                return Text(
                  '${debt.personName} • Remaining: $remaining',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                );
              },
            ),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('pay-amount'),
              controller: _amount,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,\s]'))
              ],
              style: const TextStyle(
                fontFeatures: [FontFeature.tabularFigures()],
              ),
              decoration: const InputDecoration(
                labelText: 'Payment amount (IDR)',
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  _amount.text = '${debt.remainingAmount}';
                },
                child: const Text('Pay full balance'),
              ),
            ),
            TextField(
              key: const ValueKey('pay-date'),
              controller: _date,
              keyboardType: TextInputType.datetime,
              decoration: const InputDecoration(
                labelText: 'Payment date',
                hintText: 'YYYY-MM-DD',
              ),
            ),
            const SizedBox(height: 8),
            CheckboxListTile(
              key: const ValueKey('pay-cashflow'),
              contentPadding: EdgeInsets.zero,
              title: const Text('Record to cash flow'),
              subtitle: Text(debt.isDebt
                  ? 'Creates an expense transaction on the payment date.'
                  : 'Creates an income transaction on the payment date.'),
              value: _recordToCashflow,
              onChanged: (v) =>
                  setState(() => _recordToCashflow = v ?? false),
            ),
            if (_recordToCashflow)
              DropdownButtonFormField<String>(
                key: const ValueKey('pay-ref'),
                initialValue: _refId != null &&
                        _refs.any((r) => '${r['id']}' == _refId)
                    ? _refId
                    : null,
                decoration: InputDecoration(
                  labelText: debt.isDebt
                      ? 'Expense category'
                      : 'Income source',
                ),
                items: [
                  for (final r in _refs)
                    DropdownMenuItem(
                      value: '${r['id']}',
                      child: Text('${r['name']}'),
                    ),
                ],
                onChanged: (v) => setState(() => _refId = v),
              ),
            const SizedBox(height: 8),
            TextField(
              key: const ValueKey('pay-note'),
              controller: _note,
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Payment note (optional)',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Processing...' : 'Confirm payment'),
        ),
      ],
    );
  }
}

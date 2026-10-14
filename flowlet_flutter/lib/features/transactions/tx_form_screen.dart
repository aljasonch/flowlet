import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/core/parse.dart';
import 'package:flowlet_flutter/core/today.dart';
import 'package:flowlet_flutter/data/transactions_repo.dart';

const _lastCategoryKey = 'last_category_id';
const _lastSourceKey = 'last_source_id';

/// Add/edit transaction form. When [categories]/[sources] and [onSave] are
/// provided the form never touches Supabase (used by widget tests); otherwise
/// it loads dropdown options and persists through the transactions repo.
class TxFormScreen extends StatefulWidget {
  const TxFormScreen({
    super.key,
    this.transactionId,
    this.initialData,
    this.categories,
    this.sources,
    this.onSave,
  });

  final String? transactionId;
  final Map<String, dynamic>? initialData;
  final List<Map<String, String>>? categories;
  final List<Map<String, String>>? sources;
  final Future<void> Function(Map<String, dynamic> values)? onSave;

  @override
  State<TxFormScreen> createState() => _TxFormScreenState();
}

class _TxFormScreenState extends State<TxFormScreen> {
  final _amount = TextEditingController();
  final _date = TextEditingController();
  final _note = TextEditingController();
  final _amountFocus = FocusNode();

  bool get _isEditing => widget.transactionId != null || widget.initialData != null;

  String _type = 'expense';
  int _numericAmount = 0;
  String? _categoryId;
  String? _sourceId;
  List<Map<String, String>> _cats = const [];
  List<Map<String, String>> _srcs = const [];
  bool _loadingRefs = true;
  String? _error;
  bool _saving = false;

  bool get _refsInjected => widget.categories != null && widget.sources != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialData;
    if (initial != null) {
      _type = (initial['type'] as String?) == 'income' ? 'income' : 'expense';
      _numericAmount = txAmountOf(initial);
      if (_numericAmount > 0) _amount.text = _numericAmount.toString();
      _categoryId = initial['category_id'] as String?;
      _sourceId = initial['source_id'] as String?;
      _date.text = (initial['date'] as String?) ?? getTodayDate();
      _note.text = (initial['note'] as String?) ?? '';
    } else {
      _date.text = getTodayDate();
    }
    if (_refsInjected) {
      _cats = widget.categories!;
      _srcs = widget.sources!;
      if (_isEditing && initial != null) {
        _cats = _withCurrent(_cats, _categoryId, _currentName(initial, 'category'));
        _srcs = _withCurrent(_srcs, _sourceId, _currentName(initial, 'source'));
      }
      _categoryId ??= _cats.isNotEmpty ? _cats.first['id'] : null;
      _sourceId ??= _srcs.isNotEmpty ? _srcs.first['id'] : null;
      _loadingRefs = false;
    } else {
      _loadRefs();
    }
    _amount.addListener(_onAmountChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_isEditing) _amountFocus.requestFocus();
    });
  }

  void _onAmountChanged() {
    final parsed = parseAmountInput(_amount.text);
    if (parsed != _numericAmount) setState(() => _numericAmount = parsed);
  }

  Future<void> _loadRefs() async {
    try {
      Map<String, dynamic>? existing;
      if (widget.transactionId != null) {
        existing = await fetchTransaction(widget.transactionId!);
        if (!mounted) return;
        if (existing != null) {
          _type = existing['type'] == 'income' ? 'income' : 'expense';
          _numericAmount = txAmountOf(existing);
          _amount.text = _numericAmount > 0 ? _numericAmount.toString() : '';
          _categoryId = existing['category_id'] as String?;
          _sourceId = existing['source_id'] as String?;
          _date.text = (existing['date'] as String?) ?? getTodayDate();
          _note.text = (existing['note'] as String?) ?? '';
        }
      }
      final results = await Future.wait([
        // Edit mode loads archived refs too so the current value stays
        // selectable; add mode only offers active refs.
        fetchCategories(activeOnly: !_isEditing),
        fetchSources(activeOnly: !_isEditing),
        _readLastUsed(),
      ]);
      if (!mounted) return;
      setState(() {
        _cats = [
          for (final r in (results[0] as List<Map<String, dynamic>>))
            {'id': '${r['id']}', 'name': '${r['name']}'},
        ];
        _srcs = [
          for (final r in (results[1] as List<Map<String, dynamic>>))
            {'id': '${r['id']}', 'name': '${r['name']}'},
        ];
        final last = results[2] as List<String?>;
        _categoryId ??= _pick(_cats, last[0]);
        _sourceId ??= _pick(_srcs, last[1]);
      });
    } on AuthException {
      if (mounted) context.go('/login');
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        context.go('/login');
      } else {
        setState(() => _error = 'Could not load form data. Try again.');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load form data. Try again.');
    } finally {
      if (mounted) setState(() => _loadingRefs = false);
    }
  }

  String? _pick(List<Map<String, String>> options, String? preferred) {
    if (preferred != null && options.any((o) => o['id'] == preferred)) {
      return preferred;
    }
    return options.isNotEmpty ? options.first['id'] : null;
  }

  /// Keeps the transaction's current ref selectable in edit mode when it is
  /// archived (and therefore absent from the active-only options).
  List<Map<String, String>> _withCurrent(
    List<Map<String, String>> options,
    String? currentId,
    String? currentName,
  ) {
    if (currentId == null ||
        currentId.isEmpty ||
        options.any((o) => o['id'] == currentId)) {
      return options;
    }
    return [
      ...options,
      {
        'id': currentId,
        'name': (currentName?.isNotEmpty ?? false) ? currentName! : 'Archived',
      },
    ];
  }

  String? _currentName(Map<String, dynamic> initial, String key) {
    final nested = initial[key];
    if (nested is Map) {
      final n = nested['name'];
      if (n is String && n.isNotEmpty) return n;
    }
    final flat = initial['${key}_name'];
    if (flat is String && flat.isNotEmpty) return flat;
    return null;
  }

  Future<List<String?>> _readLastUsed() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return [prefs.getString(_lastCategoryKey), prefs.getString(_lastSourceKey)];
    } catch (_) {
      return [null, null];
    }
  }

  Future<void> _rememberLastUsed() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_type == 'expense' && _categoryId != null) {
        await prefs.setString(_lastCategoryKey, _categoryId!);
      } else if (_type == 'income' && _sourceId != null) {
        await prefs.setString(_lastSourceKey, _sourceId!);
      }
    } catch (_) {
      // Convenience only; never block saving.
    }
  }

  Future<void> _save() async {
    setState(() => _error = null);
    final error = validateTransactionInput(
      type: _type,
      amount: _numericAmount,
      date: _date.text.trim(),
      categoryId: _categoryId,
      sourceId: _sourceId,
      note: _note.text,
    );
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    final values = {
      'type': _type,
      'amount': _numericAmount,
      'date': _date.text.trim(),
      'category_id': _type == 'expense' ? _categoryId : null,
      'source_id': _type == 'income' ? _sourceId : null,
      'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
    };
    setState(() => _saving = true);
    try {
      if (widget.onSave != null) {
        await widget.onSave!(values);
      } else if (_isEditing) {
        // Edit mode without a usable id (initialData-only instance) must
        // surface an error, never crash on a null check.
        final id =
            widget.transactionId ?? widget.initialData?['id']?.toString();
        if (id == null || id.isEmpty) {
          throw ArgumentError('Missing transaction id');
        }
        await updateTransaction(id, values);
      } else {
        await createTransaction(values);
      }
      await _rememberLastUsed();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isEditing ? 'Transaction updated' : 'Transaction added'),
        ),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      final message = e is ArgumentError ? e.message.toString() : 'Could not save. Try again.';
      setState(() => _error = message);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _amount.removeListener(_onAmountChanged);
    _amount.dispose();
    _date.dispose();
    _note.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingRefs) {
      return const Center(child: CircularProgressIndicator());
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _isEditing ? 'Edit transaction' : 'Add transaction',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onErrorContainer,
                    ),
                  ),
                ),
              TextField(
                key: const ValueKey('tx-amount'),
                controller: _amount,
                focusNode: _amountFocus,
                autofocus: !_isEditing,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,\s]'))],
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                decoration: const InputDecoration(
                  labelText: 'Amount (IDR)',
                  hintText: 'Rp 0',
                ),
              ),
              if (_numericAmount > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '= ${_numericAmount.toString()}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'expense', label: Text('Expense')),
                  ButtonSegment(value: 'income', label: Text('Income')),
                ],
                selected: {_type},
                onSelectionChanged: (s) => setState(() => _type = s.first),
              ),
              const SizedBox(height: 12),
              if (_type == 'expense')
                DropdownButtonFormField<String>(
                  key: const ValueKey('tx-category'),
                  initialValue: _categoryId != null &&
                          _cats.any((c) => c['id'] == _categoryId)
                      ? _categoryId
                      : null,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: [
                    for (final c in _cats)
                      DropdownMenuItem(value: c['id'], child: Text(c['name'] ?? '')),
                  ],
                  onChanged: (v) => setState(() => _categoryId = v),
                )
              else
                DropdownButtonFormField<String>(
                  key: const ValueKey('tx-source'),
                  initialValue: _sourceId != null &&
                          _srcs.any((s) => s['id'] == _sourceId)
                      ? _sourceId
                      : null,
                  decoration: const InputDecoration(labelText: 'Income source'),
                  items: [
                    for (final s in _srcs)
                      DropdownMenuItem(value: s['id'], child: Text(s['name'] ?? '')),
                  ],
                  onChanged: (v) => setState(() => _sourceId = v),
                ),
              if (_type == 'expense' && _cats.isEmpty ||
                  _type == 'income' && _srcs.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    _type == 'expense'
                        ? 'No categories yet. Add one in Settings.'
                        : 'No income sources yet. Add one in Settings.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('tx-date'),
                controller: _date,
                keyboardType: TextInputType.datetime,
                decoration: const InputDecoration(
                  labelText: 'Date',
                  hintText: 'YYYY-MM-DD',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('tx-note'),
                controller: _note,
                maxLength: 500,
                decoration: const InputDecoration(
                  labelText: 'Note (optional)',
                  hintText: 'What was this for?',
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _saving ? null : () => context.pop(),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: Text(
                      _saving
                          ? 'Saving...'
                          : _isEditing
                              ? 'Save changes'
                              : 'Save transaction',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

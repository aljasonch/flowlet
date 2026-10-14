import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/data/settings_repo.dart';

/// Settings: reporting preferences (month start day, read-only IDR
/// currency, USD-IDR rate with updated-at) plus category and income-source
/// management with archived sections. All writes go through [settings_repo]
/// validators; duplicate names surface the friendly message.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    this.profileFn,
    this.categoriesFn,
    this.sourcesFn,
    this.saveMonthFn,
    this.saveRateFn,
    this.addCategoryFn,
    this.renameCategoryFn,
    this.archiveCategoryFn,
    this.addSourceFn,
    this.renameSourceFn,
    this.archiveSourceFn,
  });

  final Future<SettingsProfile> Function()? profileFn;
  final Future<List<NamedRef>> Function()? categoriesFn;
  final Future<List<NamedRef>> Function()? sourcesFn;
  final Future<void> Function(int day)? saveMonthFn;
  final Future<void> Function(String? raw)? saveRateFn;
  final Future<void> Function(String name)? addCategoryFn;
  final Future<void> Function(String id, String name)? renameCategoryFn;
  final Future<void> Function(String id, bool archived)? archiveCategoryFn;
  final Future<void> Function(String name)? addSourceFn;
  final Future<void> Function(String id, String name)? renameSourceFn;
  final Future<void> Function(String id, bool archived)? archiveSourceFn;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loading = false;
  String? _error;
  String? _rateUpdatedAt;

  final _month = TextEditingController();
  final _rate = TextEditingController();
  final _newCategory = TextEditingController();
  final _newSource = TextEditingController();
  final _rename = TextEditingController();

  String? _monthError;
  String? _rateError;
  String? _categoryError;
  String? _sourceError;
  bool _savingMonth = false;
  bool _savingRate = false;

  List<NamedRef> _categories = const [];
  List<NamedRef> _sources = const [];
  String? _editingCatId;
  String? _editingSourceId;

  Future<SettingsProfile> _getProfile() =>
      widget.profileFn != null ? widget.profileFn!() : fetchProfile();
  Future<List<NamedRef>> _getCategories() => widget.categoriesFn != null
      ? widget.categoriesFn!()
      : fetchCategories();
  Future<List<NamedRef>> _getSources() =>
      widget.sourcesFn != null ? widget.sourcesFn!() : fetchSources();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _month.dispose();
    _rate.dispose();
    _newCategory.dispose();
    _newSource.dispose();
    _rename.dispose();
    super.dispose();
  }

  void _redirectToLogin() {
    if (mounted) context.go('/login');
  }

  void _handleAuthError(Object e) {
    if (e is AuthException || isNotSignedInError(e)) {
      _redirectToLogin();
    } else {
      setState(() => _error = 'Could not load settings. Try again.');
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _getProfile(),
        _getCategories(),
        _getSources(),
      ]);
      if (!mounted) return;
      final profile = results[0] as SettingsProfile;
      setState(() {
        _month.text = '${profile.monthStartDay}';
        _rate.text = profile.rate ?? '';
        _rateUpdatedAt = profile.rateUpdatedAt;
        _categories = results[1] as List<NamedRef>;
        _sources = results[2] as List<NamedRef>;
      });
    } catch (e) {
      if (!mounted) return;
      _handleAuthError(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reloadLists() async {
    try {
      final results = await Future.wait([_getCategories(), _getSources()]);
      if (!mounted) return;
      setState(() {
        _categories = results[0];
        _sources = results[1];
      });
    } catch (_) {
      // Keep existing lists; the inline error already explains failures.
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  String _friendlyError(Object e) {
    if (e is ArgumentError) return e.message.toString();
    if (e is StateError && e.message == duplicateNameMessage) {
      return duplicateNameMessage;
    }
    return 'Could not save. Try again.';
  }

  Future<void> _saveMonth() async {
    final day = int.tryParse(_month.text.trim());
    final error =
        day == null ? 'Month start day must be between 1 and 31' : validateMonthStartDay(day);
    if (error != null) {
      setState(() => _monthError = error);
      return;
    }
    setState(() {
      _savingMonth = true;
      _monthError = null;
    });
    try {
      if (widget.saveMonthFn != null) {
        await widget.saveMonthFn!(day!);
      } else {
        await setMonthStartDay(day!);
      }
      if (!mounted) return;
      _snack('Month start day updated. Reports will recompute.');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        setState(() => _monthError = _friendlyError(e));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _monthError = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _savingMonth = false);
    }
  }

  Future<void> _saveRate() async {
    final error = validateUsdIdrRate(_rate.text);
    if (error != null) {
      setState(() => _rateError = error);
      return;
    }
    setState(() {
      _savingRate = true;
      _rateError = null;
    });
    try {
      if (widget.saveRateFn != null) {
        await widget.saveRateFn!(_rate.text);
      } else {
        await setUsdIdrRate(_rate.text);
      }
      if (!mounted) return;
      final profile = await _getProfile();
      if (!mounted) return;
      setState(() {
        _rate.text = profile.rate ?? '';
        _rateUpdatedAt = profile.rateUpdatedAt;
      });
      _snack('Exchange rate updated');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        setState(() => _rateError = _friendlyError(e));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _rateError = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _savingRate = false);
    }
  }

  Future<void> _clearRate() async {
    setState(() {
      _rate.text = '';
      _rateError = null;
    });
    await _saveRate();
  }

  Future<void> _addCategory() async {
    final error = validateRefName(_newCategory.text);
    if (error != null) {
      setState(() => _categoryError = error);
      return;
    }
    try {
      if (widget.addCategoryFn != null) {
        await widget.addCategoryFn!(_newCategory.text.trim());
      } else {
        await addCategory(_newCategory.text.trim());
      }
      if (!mounted) return;
      _newCategory.clear();
      setState(() => _categoryError = null);
      await _reloadLists();
      _snack('Category added');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        setState(() => _categoryError = _friendlyError(e));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _categoryError = _friendlyError(e));
    }
  }

  Future<void> _renameCategory(String id) async {
    final error = validateRefName(_rename.text);
    if (error != null) {
      setState(() => _categoryError = error);
      return;
    }
    try {
      if (widget.renameCategoryFn != null) {
        await widget.renameCategoryFn!(id, _rename.text.trim());
      } else {
        await renameCategory(id, _rename.text.trim());
      }
      if (!mounted) return;
      setState(() {
        _editingCatId = null;
        _categoryError = null;
      });
      await _reloadLists();
      _snack('Category renamed');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        setState(() => _categoryError = _friendlyError(e));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _categoryError = _friendlyError(e));
    }
  }

  Future<void> _toggleArchiveCategory(NamedRef ref) async {
    try {
      if (widget.archiveCategoryFn != null) {
        await widget.archiveCategoryFn!(ref.id, !ref.isArchived);
      } else {
        await setCategoryArchived(ref.id, !ref.isArchived);
      }
      if (!mounted) return;
      await _reloadLists();
      _snack(ref.isArchived ? 'Category restored' : 'Category archived');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        _snack('Could not save. Try again.');
      }
    } catch (_) {
      _snack('Could not save. Try again.');
    }
  }

  Future<void> _addSource() async {
    final error = validateRefName(_newSource.text);
    if (error != null) {
      setState(() => _sourceError = error);
      return;
    }
    try {
      if (widget.addSourceFn != null) {
        await widget.addSourceFn!(_newSource.text.trim());
      } else {
        await addIncomeSource(_newSource.text.trim());
      }
      if (!mounted) return;
      _newSource.clear();
      setState(() => _sourceError = null);
      await _reloadLists();
      _snack('Income source added');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        setState(() => _sourceError = _friendlyError(e));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _sourceError = _friendlyError(e));
    }
  }

  Future<void> _renameSource(String id) async {
    final error = validateRefName(_rename.text);
    if (error != null) {
      setState(() => _sourceError = error);
      return;
    }
    try {
      if (widget.renameSourceFn != null) {
        await widget.renameSourceFn!(id, _rename.text.trim());
      } else {
        await renameIncomeSource(id, _rename.text.trim());
      }
      if (!mounted) return;
      setState(() {
        _editingSourceId = null;
        _sourceError = null;
      });
      await _reloadLists();
      _snack('Income source renamed');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        setState(() => _sourceError = _friendlyError(e));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _sourceError = _friendlyError(e));
    }
  }

  Future<void> _toggleArchiveSource(NamedRef ref) async {
    try {
      if (widget.archiveSourceFn != null) {
        await widget.archiveSourceFn!(ref.id, !ref.isArchived);
      } else {
        await setSourceArchived(ref.id, !ref.isArchived);
      }
      if (!mounted) return;
      await _reloadLists();
      _snack(ref.isArchived ? 'Income source restored' : 'Income source archived');
    } on AuthException {
      _redirectToLogin();
    } on StateError catch (e) {
      if (!mounted) return;
      if (isNotSignedInError(e)) {
        _redirectToLogin();
      } else {
        _snack('Could not save. Try again.');
      }
    } catch (_) {
      _snack('Could not save. Try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCats = _categories.where((c) => !c.isArchived).toList();
    final archivedCats = _categories.where((c) => c.isArchived).toList();
    final activeSources = _sources.where((s) => !s.isArchived).toList();
    final archivedSources = _sources.where((s) => s.isArchived).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Settings', style: Theme.of(context).textTheme.headlineSmall),
          Text(
            'Reporting preferences, categories and income sources',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (_loading && _error == null && _categories.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _categories.isEmpty)
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
          else ...[
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Reporting preferences',
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 12),
                    TextField(
                      key: const ValueKey('settings-month'),
                      controller: _month,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      decoration: InputDecoration(
                        labelText: 'Month start day (1-31)',
                        errorText: _monthError,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Cash-flow reports compute based on this day. Past transactions will not be modified.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    FilledButton.tonal(
                      key: const ValueKey('settings-month-save'),
                      onPressed: _savingMonth ? null : _saveMonth,
                      child: Text(_savingMonth ? 'Saving...' : 'Save month start day'),
                    ),
                    const Divider(height: 32),
                    Text('Reporting currency',
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 8),
                    const ListTile(
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      title: Text('Indonesian Rupiah (IDR)'),
                      subtitle: Text(
                        'Cash-flow reporting currency is fixed to IDR.',
                      ),
                    ),
                    const Divider(height: 32),
                    TextField(
                      key: const ValueKey('settings-rate'),
                      controller: _rate,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(r'[0-9.,]'),
                        ),
                      ],
                      style: const TextStyle(
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                      decoration: InputDecoration(
                        labelText: 'USD to IDR exchange rate',
                        hintText: 'e.g. 16200',
                        errorText: _rateError,
                      ),
                    ),
                    if (_rateUpdatedAt != null && _rateUpdatedAt!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'Last updated: $_rateUpdatedAt',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        FilledButton.tonal(
                          key: const ValueKey('settings-rate-save'),
                          onPressed: _savingRate ? null : _saveRate,
                          child: Text(
                            _savingRate ? 'Saving...' : 'Save exchange rate',
                          ),
                        ),
                        TextButton(
                          key: const ValueKey('settings-rate-clear'),
                          onPressed: _savingRate ? null : _clearRate,
                          child: const Text('Clear rate'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            _RefSection(
              title: 'Expense categories',
              newItemKey: const ValueKey('settings-category-name'),
              addKey: const ValueKey('settings-add-category'),
              addHint: 'New category name',
              items: activeCats,
              archived: archivedCats,
              archivedKey: const ValueKey('settings-archived-categories'),
              error: _categoryError,
              newController: _newCategory,
              editingId: _editingCatId,
              renameController: _rename,
              onAdd: _addCategory,
              onStartRename: (ref) => setState(() {
                _editingCatId = ref.id;
                _rename.text = ref.name;
                _categoryError = null;
              }),
              onCancelRename: () => setState(() => _editingCatId = null),
              onRename: _renameCategory,
              onToggleArchive: _toggleArchiveCategory,
            ),
            const SizedBox(height: 12),
            _RefSection(
              title: 'Income sources',
              newItemKey: const ValueKey('settings-source-name'),
              addKey: const ValueKey('settings-add-source'),
              addHint: 'New income source name',
              items: activeSources,
              archived: archivedSources,
              archivedKey: const ValueKey('settings-archived-sources'),
              error: _sourceError,
              newController: _newSource,
              editingId: _editingSourceId,
              renameController: _rename,
              onAdd: _addSource,
              onStartRename: (ref) => setState(() {
                _editingSourceId = ref.id;
                _rename.text = ref.name;
                _sourceError = null;
              }),
              onCancelRename: () => setState(() => _editingSourceId = null),
              onRename: _renameSource,
              onToggleArchive: _toggleArchiveSource,
            ),
          ],
        ],
      ),
    );
  }
}

class _RefSection extends StatelessWidget {
  const _RefSection({
    required this.title,
    required this.newItemKey,
    required this.addKey,
    required this.addHint,
    required this.items,
    required this.archived,
    required this.archivedKey,
    required this.error,
    required this.newController,
    required this.editingId,
    required this.renameController,
    required this.onAdd,
    required this.onStartRename,
    required this.onCancelRename,
    required this.onRename,
    required this.onToggleArchive,
  });

  final String title;
  final ValueKey<String> newItemKey;
  final ValueKey<String> addKey;
  final String addHint;
  final List<NamedRef> items;
  final List<NamedRef> archived;
  final ValueKey<String> archivedKey;
  final String? error;
  final TextEditingController newController;
  final String? editingId;
  final TextEditingController renameController;
  final VoidCallback onAdd;
  final void Function(NamedRef ref) onStartRename;
  final VoidCallback onCancelRename;
  final Future<void> Function(String id) onRename;
  final Future<void> Function(NamedRef ref) onToggleArchive;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextField(
                    key: newItemKey,
                    controller: newController,
                    maxLength: 50,
                    decoration: InputDecoration(
                      hintText: addHint,
                      errorText: error,
                      counterText: '',
                    ),
                    onSubmitted: (_) => onAdd(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  key: addKey,
                  onPressed: onAdd,
                  child: const Text('Add'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Active', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            if (items.isEmpty)
              Text(
                'No active items yet.',
                style: Theme.of(context).textTheme.bodySmall,
              )
            else
              for (final ref in items)
                editingId == ref.id
                    ? Row(
                        children: [
                          Expanded(
                            child: TextField(
                              key: ValueKey('rename-${ref.id}'),
                              controller: renameController,
                              maxLength: 50,
                              autofocus: true,
                              decoration: const InputDecoration(
                                counterText: '',
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () => onRename(ref.id),
                            child: const Text('Save'),
                          ),
                          TextButton(
                            onPressed: onCancelRename,
                            child: const Text('Cancel'),
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          Expanded(child: Text(ref.name)),
                          IconButton(
                            tooltip: 'Rename ${ref.name}',
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => onStartRename(ref),
                          ),
                          IconButton(
                            tooltip: 'Archive ${ref.name}',
                            icon:
                                const Icon(Icons.archive_outlined, size: 20),
                            onPressed: () => onToggleArchive(ref),
                          ),
                        ],
                      ),
            if (archived.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Archived',
                key: archivedKey,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              Opacity(
                opacity: 0.7,
                child: Column(
                  children: [
                    for (final ref in archived)
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              ref.name,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Restore ${ref.name}',
                            icon: const Icon(
                              Icons.unarchive_outlined,
                              size: 20,
                            ),
                            onPressed: () => onToggleArchive(ref),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

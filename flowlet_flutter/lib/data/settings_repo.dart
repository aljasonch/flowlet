import 'package:decimal/decimal.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';

const duplicateNameMessage = 'That name already exists';

/// Month start day is an int in 1..31. Returns an error, or null when valid.
String? validateMonthStartDay(int day) {
  if (day < 1 || day > 31) {
    return 'Month start day must be between 1 and 31';
  }
  return null;
}

/// Normalizes a USD-IDR rate input to a canonical decimal string.
/// Blank/null means "clear the rate" and maps to null. Accepts both the
/// dot-decimal form (`15750.25`) and the Indonesian comma form
/// (`15.750,25`, dots ignored as thousand separators). Throws
/// [FormatException] when unparseable. Decimal only, never double.
String? normalizeUsdIdrRate(String? raw) {
  if (raw == null) return null;
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;
  final normalized = trimmed.contains(',')
      ? trimmed.replaceAll('.', '').replaceFirst(',', '.')
      : trimmed;
  final parsed = Decimal.tryParse(normalized);
  if (parsed == null) throw const FormatException('Invalid rate');
  return parsed.toString();
}

/// Validates a rate input. Null/blank clears the rate. Returns an error
/// message, or null when valid.
String? validateUsdIdrRate(String? raw) {
  late final String? normalized;
  try {
    normalized = normalizeUsdIdrRate(raw);
  } on FormatException {
    return 'Invalid rate';
  }
  if (normalized == null) return null;
  if (Decimal.parse(normalized) <= Decimal.zero) {
    return 'Rate must be greater than 0';
  }
  return null;
}

/// Category and income-source names: 1..50 chars after trimming.
String? validateRefName(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return 'Name cannot be empty';
  if (trimmed.length > 50) return 'Name cannot exceed 50 characters';
  return null;
}

/// True for PostgREST unique-violation errors (duplicate category/source
/// name). Screens map this to [duplicateNameMessage].
bool isDuplicateNameError(Object error) {
  try {
    return (error as dynamic).code == '23505';
  } catch (_) {
    return false;
  }
}

class SettingsProfile {
  final int monthStartDay;
  final String currency;
  final String? rate;
  final String? rateUpdatedAt;

  const SettingsProfile({
    required this.monthStartDay,
    required this.currency,
    required this.rate,
    required this.rateUpdatedAt,
  });

  /// Rate stays a verbatim decimal string; ints stringify exactly and
  /// doubles go through Decimal so exponent forms normalize without
  /// float math.
  static String? _rateString(dynamic v) {
    if (v == null) return null;
    if (v is int) return v.toString();
    if (v is double) return Decimal.tryParse(v.toString())?.toString();
    if (v is String) {
      final s = v.trim();
      return s.isEmpty ? null : s;
    }
    return null;
  }

  static int _day(dynamic v) {
    if (v is int) return v;
    if (v is String) return int.tryParse(v.trim()) ?? 1;
    return 1;
  }

  factory SettingsProfile.fromRow(Map? row) {
    if (row == null) {
      return const SettingsProfile(
        monthStartDay: 1,
        currency: 'IDR',
        rate: null,
        rateUpdatedAt: null,
      );
    }
    return SettingsProfile(
      monthStartDay: _day(row['month_start_day']),
      currency: row['currency'] as String? ?? 'IDR',
      rate: _rateString(row['usd_idr_rate']),
      rateUpdatedAt: row['usd_idr_rate_updated_at'] as String?,
    );
  }
}

class NamedRef {
  final String id;
  final String name;
  final bool isArchived;

  const NamedRef({
    required this.id,
    required this.name,
    required this.isArchived,
  });

  factory NamedRef.fromRow(Map row) {
    return NamedRef(
      id: '${row['id']}',
      name: '${row['name']}',
      isArchived: row['is_archived'] == true,
    );
  }
}

typedef ProfileFetcher = Future<Map?> Function();
typedef ProfileUpdater = Future<void> Function(Map<String, dynamic> payload);
typedef RefListFetcher = Future<List<Map<String, dynamic>>> Function();
typedef RefInsert = Future<void> Function(String name);
typedef RefUpdate = Future<void> Function(String id, Map<String, dynamic> payload);

String _uid() {
  final id = db.auth.currentUser?.id;
  if (id == null) throw StateError('Not signed in');
  return id;
}

/// True for the signed-out error thrown by [_uid]. Screens map this to a
/// login redirect alongside AuthException.
bool isNotSignedInError(Object error) =>
    error is StateError && error.message.contains('Not signed in');

Future<Map?> _defaultProfileFetcher() {
  return db
      .from('profiles')
      .select('month_start_day,currency,usd_idr_rate,usd_idr_rate_updated_at')
      .eq('user_id', _uid())
      .maybeSingle();
}

Future<void> _defaultProfileUpdate(Map<String, dynamic> payload) async {
  await db.from('profiles').update(payload).eq('user_id', _uid());
}

Future<List<Map<String, dynamic>>> _defaultRefList(String table) async {
  final rows = await db
      .from(table)
      .select('id,name,is_archived')
      .eq('user_id', _uid())
      .order('name') as List;
  return [for (final r in rows) Map<String, dynamic>.from(r as Map)];
}

Future<void> _defaultRefInsert(String table, String name) async {
  try {
    await db.from(table).insert({'user_id': _uid(), 'name': name});
  } catch (e) {
    if (isDuplicateNameError(e)) throw StateError(duplicateNameMessage);
    rethrow;
  }
}

Future<void> _defaultRefUpdate(
  String table,
  String id,
  Map<String, dynamic> payload,
) async {
  try {
    await db
        .from(table)
        .update(payload)
        .eq('id', id)
        .eq('user_id', _uid());
  } catch (e) {
    if (isDuplicateNameError(e)) throw StateError(duplicateNameMessage);
    rethrow;
  }
}

Future<SettingsProfile> fetchProfile({ProfileFetcher? fetcher}) async {
  final row = await (fetcher ?? _defaultProfileFetcher)();
  return SettingsProfile.fromRow(row);
}

/// Reporting month start day (1..31) from the user's profile.
Future<int> getMonthStartDay({ProfileFetcher? fetcher}) async {
  final profile = await fetchProfile(fetcher: fetcher);
  return profile.monthStartDay;
}

/// USD-IDR rate as an exact decimal string, or null when unset.
Future<String?> getUsdIdrRate({ProfileFetcher? fetcher}) async {
  final profile = await fetchProfile(fetcher: fetcher);
  return profile.rate;
}

Future<void> setMonthStartDay(int day, {ProfileUpdater? update}) async {
  final error = validateMonthStartDay(day);
  if (error != null) throw ArgumentError(error);
  await (update ?? _defaultProfileUpdate)({'month_start_day': day});
}

/// Persists the rate as a decimal string (never a double). Blank/null
/// clears the rate and its timestamp.
Future<void> setUsdIdrRate(String? raw, {ProfileUpdater? update}) async {
  final error = validateUsdIdrRate(raw);
  if (error != null) throw ArgumentError(error);
  final normalized = normalizeUsdIdrRate(raw);
  await (update ?? _defaultProfileUpdate)({
    'usd_idr_rate': normalized,
    'usd_idr_rate_updated_at':
        normalized == null ? null : DateTime.now().toUtc().toIso8601String(),
  });
}

Future<void> _addRef(
  String name, {
  RefInsert? insert,
  required Future<void> Function(String) defaultInsert,
}) async {
  final error = validateRefName(name);
  if (error != null) throw ArgumentError(error);
  final trimmed = name.trim();
  try {
    await (insert ?? defaultInsert)(trimmed);
  } catch (e) {
    if (e is ArgumentError) rethrow;
    if (isDuplicateNameError(e)) throw StateError(duplicateNameMessage);
    rethrow;
  }
}

Future<void> _renameRef(
  String id,
  String name, {
  RefUpdate? update,
  required Future<void> Function(String, Map<String, dynamic>) defaultUpdate,
}) async {
  final error = validateRefName(name);
  if (error != null) throw ArgumentError(error);
  final trimmed = name.trim();
  try {
    await (update ?? defaultUpdate)(id, {'name': trimmed});
  } catch (e) {
    if (e is ArgumentError) rethrow;
    if (isDuplicateNameError(e)) throw StateError(duplicateNameMessage);
    rethrow;
  }
}

/// All categories (active and archived) ordered by name. RLS-safe: scoped
/// to the signed-in user.
Future<List<NamedRef>> fetchCategories({RefListFetcher? fetcher}) async {
  final rows =
      await (fetcher ?? () => _defaultRefList('categories'))();
  return [for (final row in rows) NamedRef.fromRow(row)];
}

/// All income sources (active and archived) ordered by name.
Future<List<NamedRef>> fetchSources({RefListFetcher? fetcher}) async {
  final rows =
      await (fetcher ?? () => _defaultRefList('income_sources'))();
  return [for (final row in rows) NamedRef.fromRow(row)];
}

Future<void> addCategory(String name, {RefInsert? insert}) => _addRef(
      name,
      insert: insert,
      defaultInsert: (n) => _defaultRefInsert('categories', n),
    );

Future<void> renameCategory(String id, String name, {RefUpdate? update}) =>
    _renameRef(
      id,
      name,
      update: update,
      defaultUpdate: (i, p) => _defaultRefUpdate('categories', i, p),
    );

Future<void> setCategoryArchived(
  String id,
  bool archived, {
  RefUpdate? update,
}) =>
    (update ?? (i, p) => _defaultRefUpdate('categories', i, p))(
      id,
      {'is_archived': archived},
    );

Future<void> addIncomeSource(String name, {RefInsert? insert}) => _addRef(
      name,
      insert: insert,
      defaultInsert: (n) => _defaultRefInsert('income_sources', n),
    );

Future<void> renameIncomeSource(String id, String name, {RefUpdate? update}) =>
    _renameRef(
      id,
      name,
      update: update,
      defaultUpdate: (i, p) => _defaultRefUpdate('income_sources', i, p),
    );

Future<void> setSourceArchived(
  String id,
  bool archived, {
  RefUpdate? update,
}) =>
    (update ?? (i, p) => _defaultRefUpdate('income_sources', i, p))(
      id,
      {'is_archived': archived},
    );

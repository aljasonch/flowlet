import 'package:flowlet_flutter/core/parse.dart';
import 'package:flowlet_flutter/core/period.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';

final _dateRegex = RegExp(r'^\d{4}-\d{2}-\d{2}$');

int _asInt(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toInt();
  if (v is String) {
    final s = v.trim();
    return int.tryParse(s) ?? double.tryParse(s)?.toInt() ?? 0;
  }
  return 0;
}

/// Amount shown for a transaction row. PostgREST may encode bigint as String.
int txAmountOf(Map item) => _asInt(item['amount']);

/// Validates transaction input. Returns an error message, or null when valid.
String? validateTransactionInput({
  required String type,
  required int amount,
  required String date,
  String? categoryId,
  String? sourceId,
  String? note,
}) {
  if (type != 'expense' && type != 'income') return 'Invalid transaction type';
  if (amount <= 0) return 'Amount must be greater than 0';
  if (amount > maxAmount) return 'Amount exceeds maximum limit';
  if (!_dateRegex.hasMatch(date)) return 'Invalid date format';
  if (type == 'expense' && (categoryId == null || categoryId.isEmpty)) {
    return 'Please select a category';
  }
  if (type == 'income' && (sourceId == null || sourceId.isEmpty)) {
    return 'Please select an income source';
  }
  if (note != null && note.length > 500) {
    return 'Note cannot exceed 500 characters';
  }
  return null;
}

/// Normalizes a values map into a write payload. Throws [ArgumentError] when
/// invalid. Amount accepts int or a numeric String; the note is trimmed and
/// blank becomes null; the unused ref side is nulled per the type constraint.
Map<String, dynamic> buildTransactionPayload(Map<String, dynamic> values) {
  final type = values['type'] as String? ?? '';
  final amount = _asInt(values['amount']);
  final date = (values['date'] as String? ?? '').trim();
  final categoryId = values['category_id'] as String?;
  final sourceId = values['source_id'] as String?;
  final rawNote = values['note'] as String?;
  final note = rawNote == null || rawNote.trim().isEmpty ? null : rawNote.trim();

  final error = validateTransactionInput(
    type: type,
    amount: amount,
    date: date,
    categoryId: categoryId,
    sourceId: sourceId,
    note: rawNote,
  );
  if (error != null) throw ArgumentError(error);

  return {
    'type': type,
    'amount': amount,
    'date': date,
    'category_id': type == 'expense' ? categoryId : null,
    'source_id': type == 'income' ? sourceId : null,
    'note': note,
  };
}

class TxListResult {
  final List<Map<String, dynamic>> items;
  final bool hasMore;
  const TxListResult(this.items, this.hasMore);
}

typedef TxListCaller = Future<List<Map<String, dynamic>>> Function({
  required String start,
  required String end,
  String? type,
  String? refId,
  String? searchPattern,
  required int limitPlusOne,
});

typedef TxInsertCaller = Future<void> Function(Map<String, dynamic> payload);
typedef TxUpdateCaller = Future<void> Function(
  String id,
  Map<String, dynamic> payload,
);
typedef TxDeleteCaller = Future<void> Function(String id);
typedef TxRefCaller = Future<List<Map<String, dynamic>>> Function(
  String table, {
  bool activeOnly,
});
typedef TxSingleCaller = Future<Map<String, dynamic>?> Function(String id);

String _uid() {
  final id = db.auth.currentUser?.id;
  if (id == null) throw StateError('Not signed in');
  return id;
}

Future<List<Map<String, dynamic>>> _defaultListCaller({
  required String start,
  required String end,
  String? type,
  String? refId,
  String? searchPattern,
  required int limitPlusOne,
}) async {
  final uid = _uid();
  dynamic q = db.from('transactions').select(
        'id,type,amount,date,note,category:categories(id,name),source:income_sources(id,name)',
      );
  q = q.eq('user_id', uid).gte('date', start).lte('date', end);
  if (type == 'expense' || type == 'income') {
    q = q.eq('type', type);
    if (refId != null && refId.isNotEmpty) {
      q = q.eq(type == 'expense' ? 'category_id' : 'source_id', refId);
    }
  }
  if (searchPattern != null && searchPattern.isNotEmpty) {
    q = q.ilike('note', searchPattern);
  }
  final rows = await q
      .order('date', ascending: false)
      .order('created_at', ascending: false)
      .limit(limitPlusOne) as List;
  return [for (final r in rows) Map<String, dynamic>.from(r as Map)];
}

Future<void> _defaultInsert(Map<String, dynamic> payload) async {
  await db.from('transactions').insert({...payload, 'user_id': _uid()});
}

Future<void> _defaultUpdate(String id, Map<String, dynamic> payload) async {
  await db
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', _uid());
}

Future<void> _defaultDelete(String id) async {
  await db.from('transactions').delete().eq('id', id).eq('user_id', _uid());
}

Future<List<Map<String, dynamic>>> _defaultRefCaller(
  String table, {
  bool activeOnly = true,
}) async {
  dynamic q =
      db.from(table).select('id,name').eq('user_id', _uid());
  if (activeOnly) q = q.eq('is_archived', false);
  final rows = await q.order('name') as List;
  return [for (final r in rows) Map<String, dynamic>.from(r as Map)];
}

Future<Map<String, dynamic>?> _defaultSingleCaller(String id) async {
  final row = await db
      .from('transactions')
      .select('id,type,amount,date,note,category_id,source_id')
      .eq('id', id)
      .eq('user_id', _uid())
      .maybeSingle();
  return row == null ? null : Map<String, dynamic>.from(row);
}

/// Lists transactions in the [year]/[month] reporting period, newest first.
/// Uses limit+1 pagination: [TxListResult.hasMore] tells whether more rows
/// exist beyond [limit]. RLS-safe: scoped to the signed-in user.
Future<TxListResult> listTransactions({
  required int year,
  required int month,
  int startDay = 1,
  String? type,
  String? refId,
  String? search,
  int limit = 50,
  TxListCaller? caller,
}) async {
  final call = caller ?? _defaultListCaller;
  final start = periodStart(year, month, startDay);
  final end = periodEnd(year, month, startDay);
  final trimmed = search?.trim() ?? '';
  final rows = await call(
    start: start,
    end: end,
    type: type,
    refId: refId,
    searchPattern: trimmed.isEmpty ? null : '%${escapeIlike(trimmed)}%',
    limitPlusOne: limit + 1,
  );
  final hasMore = rows.length > limit;
  return TxListResult(hasMore ? rows.sublist(0, limit) : rows, hasMore);
}

/// Active (non-archived) categories for form dropdowns, or all when
/// [activeOnly] is false (list filters).
Future<List<Map<String, dynamic>>> fetchCategories({
  bool activeOnly = true,
  TxRefCaller? caller,
}) =>
    (caller ?? _defaultRefCaller)('categories', activeOnly: activeOnly);

/// Active (non-archived) income sources for form dropdowns, or all when
/// [activeOnly] is false (list filters).
Future<List<Map<String, dynamic>>> fetchSources({
  bool activeOnly = true,
  TxRefCaller? caller,
}) =>
    (caller ?? _defaultRefCaller)('income_sources', activeOnly: activeOnly);

Future<Map<String, dynamic>?> fetchTransaction(
  String id, {
  TxSingleCaller? caller,
}) =>
    (caller ?? _defaultSingleCaller)(id);

Future<void> createTransaction(
  Map<String, dynamic> values, {
  TxInsertCaller? insert,
}) async {
  final payload = buildTransactionPayload(values);
  await (insert ?? _defaultInsert)(payload);
}

Future<void> updateTransaction(
  String id,
  Map<String, dynamic> values, {
  TxUpdateCaller? update,
}) async {
  final payload = buildTransactionPayload(values);
  await (update ?? _defaultUpdate)(id, payload);
}

Future<void> deleteTransaction(String id, {TxDeleteCaller? deleter}) async {
  await (deleter ?? _defaultDelete)(id);
}

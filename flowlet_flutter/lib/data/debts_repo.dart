import 'package:flowlet_flutter/core/parse.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';

/// Centralized in [core/auth_errors.dart]; re-exported here so existing
/// imports keep working.
export 'package:flowlet_flutter/core/auth_errors.dart'
    show isNotSignedInError;

final _dateRegex = RegExp(r'^\d{4}-\d{2}-\d{2}$');

bool _isLeapYear(int year) =>
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);

/// Real calendar-date check (validity only; dates stay `YYYY-MM-DD`
/// strings, no DateTime day-shift logic).
bool _isValidCalendarDate(String date) {
  if (!_dateRegex.hasMatch(date)) return false;
  final month = int.parse(date.substring(5, 7));
  final day = int.parse(date.substring(8, 10));
  if (month < 1 || month > 12) return false;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var maxDay = daysInMonth[month - 1];
  if (month == 2 && _isLeapYear(int.parse(date.substring(0, 4)))) {
    maxDay = 29;
  }
  return day >= 1 && day <= maxDay;
}

/// Tolerant bigint-IDR parsing: int passes through, numeric Strings use
/// int.parse only. A fractional String (should not occur for bigint
/// columns) maps to 0 rather than truncating; unparseable input maps to 0.
/// No double fallback: doubles never carry exact money values.
int _asInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is String) {
    final s = v.trim();
    if (s.isEmpty) return 0;
    return int.tryParse(s) ?? 0;
  }
  return 0;
}

/// Amount shown for a debt row. PostgREST may encode bigint as String.
int debtAmountOf(Map item) => _asInt(item['amount']);

/// Remaining balance after recording [payment] against a debt of [amount]
/// with [paidSoFar] already paid. Mirrors SQL `greatest(0, amount - paid)`:
/// overpayments clamp to 0, never negative. Pure int arithmetic.
int remainingAfterPayment({
  required int amount,
  required int paidSoFar,
  required int payment,
}) {
  final remaining = amount - paidSoFar - payment;
  return remaining < 0 ? 0 : remaining;
}

/// True when [payment] settles the debt (exactly or over). Mirrors the SQL
/// `total_paid >= amount` settled branch.
bool isFullyPaid({
  required int amount,
  required int paidSoFar,
  required int payment,
}) =>
    paidSoFar + payment >= amount;

/// Client-side mirror of the SQL status case expression in
/// `debts_with_balance()`. The RPC remains authoritative; this is for
/// validation previews and tests.
String debtStatus({required int amount, required int paid}) {
  if (paid >= amount) return 'settled';
  if (paid > 0) return 'partially_paid';
  return 'pending';
}

/// Integer 0..100 percent paid for progress display. Amounts stay ints;
/// the division remainder is discarded, never rounded through doubles.
int paidPercent({required int amount, required int paid}) {
  if (amount <= 0 || paid <= 0) return 0;
  final pct = (paid * 100) ~/ amount;
  if (pct > 100) return 100;
  return pct;
}

/// Validates debt input. Returns an error message, or null when valid.
String? validateDebtInput({
  required String type,
  required String personName,
  required int amount,
  required String date,
  String? dueDate,
  String? note,
}) {
  if (type != 'debt' && type != 'receivable') return 'Invalid debt type';
  if (personName.trim().isEmpty) {
    return 'Person or institution name is required';
  }
  if (personName.trim().length > 100) {
    return 'Name cannot exceed 100 characters';
  }
  if (amount <= 0) return 'Amount must be greater than 0';
  if (amount > maxAmount) return 'Amount exceeds maximum limit';
  if (!_isValidCalendarDate(date.trim())) return 'Invalid date format';
  if (dueDate != null && dueDate.trim().isNotEmpty) {
    if (!_isValidCalendarDate(dueDate.trim())) {
      return 'Invalid due date format';
    }
  }
  if (note != null && note.length > 500) {
    return 'Note cannot exceed 500 characters';
  }
  return null;
}

/// Validates a partial/full settlement payment, including the cash-flow
/// sync ref requirements (expense needs a category, income a source).
/// Overpayments are allowed: the remaining balance clamps to 0 in SQL.
String? validatePaymentInput({
  required int amount,
  required String paymentDate,
  bool recordToCashflow = false,
  String debtType = 'debt',
  String? categoryId,
  String? sourceId,
  String? note,
}) {
  if (amount <= 0) return 'Payment amount must be greater than 0';
  if (amount > maxAmount) return 'Amount exceeds maximum limit';
  if (!_isValidCalendarDate(paymentDate.trim())) {
    return 'Invalid payment date format';
  }
  if (recordToCashflow) {
    if (debtType == 'debt' && (categoryId == null || categoryId.isEmpty)) {
      return 'Expense category is required when recording to cash flow';
    }
    if (debtType == 'receivable' &&
        (sourceId == null || sourceId.isEmpty)) {
      return 'Income source is required when recording to cash flow';
    }
  }
  if (note != null && note.length > 500) {
    return 'Note cannot exceed 500 characters';
  }
  return null;
}

/// Normalizes a values map into a debt write payload. Throws [ArgumentError]
/// when invalid. Amount accepts int or a numeric String; person name is
/// trimmed; blank due date and note become null.
Map<String, dynamic> buildDebtPayload(Map<String, dynamic> values) {
  final type = values['type'] as String? ?? '';
  final rawName = values['person_name'] as String? ?? '';
  final amount = _asInt(values['amount']);
  final date = (values['date'] as String? ?? '').trim();
  final rawDue = values['due_date'] as String?;
  final dueDate =
      rawDue == null || rawDue.trim().isEmpty ? null : rawDue.trim();
  final rawNote = values['note'] as String?;
  final note =
      rawNote == null || rawNote.trim().isEmpty ? null : rawNote.trim();

  final error = validateDebtInput(
    type: type,
    personName: rawName,
    amount: amount,
    date: date,
    dueDate: rawDue,
    note: rawNote,
  );
  if (error != null) throw ArgumentError(error);

  return {
    'type': type,
    'person_name': rawName.trim(),
    'amount': amount,
    'date': date,
    'due_date': dueDate,
    'note': note,
  };
}

class DebtRecord {
  final String id;
  final String type;
  final String personName;
  final int amount;
  final String date;
  final String? dueDate;
  final String? note;
  final String? createdAt;
  final int paidAmount;
  final int remainingAmount;
  final String status;
  final bool isOverdue;

  const DebtRecord({
    required this.id,
    required this.type,
    required this.personName,
    required this.amount,
    required this.date,
    required this.dueDate,
    required this.note,
    required this.createdAt,
    required this.paidAmount,
    required this.remainingAmount,
    required this.status,
    required this.isOverdue,
  });

  bool get isDebt => type == 'debt';
  bool get isSettled => status == 'settled';

  factory DebtRecord.fromRow(Map row) {
    return DebtRecord(
      id: row['id'] as String? ?? '',
      type: row['type'] as String? ?? '',
      personName: row['person_name'] as String? ?? '',
      amount: _asInt(row['amount']),
      date: row['date'] as String? ?? '',
      dueDate: row['due_date'] as String?,
      note: row['note'] as String?,
      createdAt: row['created_at'] as String?,
      paidAmount: _asInt(row['paid_amount']),
      remainingAmount: _asInt(row['remaining_amount']),
      status: row['status'] as String? ?? '',
      isOverdue: row['is_overdue'] == true,
    );
  }
}

class DebtsSummary {
  final int totalUnpaidDebt;
  final int totalUnpaidReceivable;
  final int unpaidDebtCount;
  final int unpaidReceivableCount;
  final int overdueCount;

  const DebtsSummary(
    this.totalUnpaidDebt,
    this.totalUnpaidReceivable,
    this.unpaidDebtCount,
    this.unpaidReceivableCount,
    this.overdueCount,
  );

  factory DebtsSummary.fromRow(Map row) {
    return DebtsSummary(
      _asInt(row['total_unpaid_debt']),
      _asInt(row['total_unpaid_receivable']),
      _asInt(row['unpaid_debt_count']),
      _asInt(row['unpaid_receivable_count']),
      _asInt(row['overdue_count']),
    );
  }
}

typedef DebtsRpcCaller = Future<dynamic> Function(
  String fn, {
  Map<String, dynamic>? params,
});

typedef DebtInsertCaller = Future<void> Function(Map<String, dynamic> payload);
typedef DebtDeleteCaller = Future<void> Function(String id);

/// Inserts the cash-flow transaction for a synced payment and returns its id.
typedef CashflowInsertCaller = Future<String> Function(
  Map<String, dynamic> payload,
);
typedef PaymentInsertCaller = Future<void> Function(
  Map<String, dynamic> payload,
);

String _uid() {
  final id = db.auth.currentUser?.id;
  if (id == null) throw StateError('Not signed in');
  return id;
}

Future<dynamic> _defaultRpc(String fn, {Map<String, dynamic>? params}) {
  return db.rpc(fn, params: params);
}

Future<void> _defaultDebtInsert(Map<String, dynamic> payload) async {
  await db.from('debts').insert({...payload, 'user_id': _uid()});
}

Future<void> _defaultDebtDelete(String id) async {
  await db.from('debts').delete().eq('id', id).eq('user_id', _uid());
}

Future<void> _defaultPaymentDelete(String id) async {
  await db.from('debt_payments').delete().eq('id', id).eq('user_id', _uid());
}

Future<String> _defaultCashflowInsert(Map<String, dynamic> payload) async {
  final row = await db
      .from('transactions')
      .insert({...payload, 'user_id': _uid()})
      .select('id')
      .single() as Map;
  return '${row['id']}';
}

Future<void> _defaultPaymentInsert(Map<String, dynamic> payload) async {
  await db.from('debt_payments').insert({...payload, 'user_id': _uid()});
}

/// Debts with computed balances from SQL; valuation stays server-side.
Future<List<DebtRecord>> fetchDebts({DebtsRpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call('debts_with_balance') as List;
  return [for (final row in rows) DebtRecord.fromRow(row as Map)];
}

/// Aggregated unpaid totals and counts from SQL.
Future<DebtsSummary> fetchDebtsSummary({DebtsRpcCaller? rpc}) async {
  final call = rpc ?? _defaultRpc;
  final rows = await call('debts_summary') as List;
  if (rows.isEmpty) return const DebtsSummary(0, 0, 0, 0, 0);
  return DebtsSummary.fromRow(rows.first as Map);
}

Future<void> createDebt(
  Map<String, dynamic> values, {
  DebtInsertCaller? insert,
}) async {
  final payload = buildDebtPayload(values);
  await (insert ?? _defaultDebtInsert)(payload);
}

Future<void> deleteDebt(String id, {DebtDeleteCaller? deleter}) async {
  await (deleter ?? _defaultDebtDelete)(id);
}

Future<void> deleteDebtPayment(String id, {DebtDeleteCaller? deleter}) async {
  await (deleter ?? _defaultPaymentDelete)(id);
}

/// Records a partial or full settlement payment. When
/// `values['record_to_cashflow']` is true (default false), a matching
/// transaction is created first — an expense for a debt, an income for a
/// receivable — and its id is stored on the payment row, mirroring the web
/// action. Throws [ArgumentError] when invalid.
Future<void> recordDebtPayment({
  required DebtRecord debt,
  required Map<String, dynamic> values,
  CashflowInsertCaller? insertTransaction,
  PaymentInsertCaller? insertPayment,
}) async {
  final amount = _asInt(values['amount']);
  final paymentDate = (values['payment_date'] as String? ?? '').trim();
  final recordToCashflow = values['record_to_cashflow'] == true;
  final categoryId = values['category_id'] as String?;
  final sourceId = values['source_id'] as String?;
  final rawNote = values['note'] as String?;
  final note =
      rawNote == null || rawNote.trim().isEmpty ? null : rawNote.trim();

  final error = validatePaymentInput(
    amount: amount,
    paymentDate: paymentDate,
    recordToCashflow: recordToCashflow,
    debtType: debt.type,
    categoryId: categoryId,
    sourceId: sourceId,
    note: rawNote,
  );
  if (error != null) throw ArgumentError(error);

  String? transactionId;
  if (recordToCashflow) {
    final txNote = note ??
        (debt.isDebt
            ? 'Debt payment to ${debt.personName}'
            : 'Receivable collection from ${debt.personName}');
    final txPayload = debt.isDebt
        ? {
            'type': 'expense',
            'amount': amount,
            'date': paymentDate,
            'category_id': categoryId,
            'source_id': null,
            'note': txNote,
          }
        : {
            'type': 'income',
            'amount': amount,
            'date': paymentDate,
            'category_id': null,
            'source_id': sourceId,
            'note': txNote,
          };
    transactionId = await (insertTransaction ?? _defaultCashflowInsert)(
      txPayload,
    );
  }

  await (insertPayment ?? _defaultPaymentInsert)({
    'debt_id': debt.id,
    'amount': amount,
    'payment_date': paymentDate,
    'transaction_id': transactionId,
    'note': note,
  });
}

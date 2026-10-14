import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/debts_repo.dart';

void main() {
  group('partial-payment math', () {
    test('remaining subtracts paid so far and the new payment', () {
      expect(
        remainingAfterPayment(amount: 100000, paidSoFar: 20000, payment: 30000),
        50000,
      );
    });

    test('remaining never goes negative on overpayment', () {
      expect(
        remainingAfterPayment(
          amount: 100000,
          paidSoFar: 80000,
          payment: 50000,
        ),
        0,
      );
    });

    test('remaining is zero when fully paid exactly', () {
      expect(
        remainingAfterPayment(
          amount: 100000,
          paidSoFar: 60000,
          payment: 40000,
        ),
        0,
      );
    });

    test('fully-paid flag is true on exact and over payment only', () {
      expect(
        isFullyPaid(amount: 100000, paidSoFar: 60000, payment: 40000),
        isTrue,
      );
      expect(
        isFullyPaid(amount: 100000, paidSoFar: 80000, payment: 50000),
        isTrue,
      );
      expect(
        isFullyPaid(amount: 100000, paidSoFar: 20000, payment: 30000),
        isFalse,
      );
    });

    test('status mirrors the SQL case expression', () {
      expect(debtStatus(amount: 100000, paid: 0), 'pending');
      expect(debtStatus(amount: 100000, paid: 1), 'partially_paid');
      expect(debtStatus(amount: 100000, paid: 99999), 'partially_paid');
      expect(debtStatus(amount: 100000, paid: 100000), 'settled');
      expect(debtStatus(amount: 100000, paid: 150000), 'settled');
    });

    test('paid percent is an int clamped to 0..100', () {
      expect(paidPercent(amount: 100000, paid: 25000), 25);
      expect(paidPercent(amount: 100000, paid: 0), 0);
      expect(paidPercent(amount: 100000, paid: 100000), 100);
      expect(paidPercent(amount: 100000, paid: 150000), 100);
      expect(paidPercent(amount: 0, paid: 0), 0);
    });
  });

  group('validateDebtInput', () {
    test('zero and negative amounts are blocked', () {
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 0,
          date: '2026-10-14',
        ),
        'Amount must be greater than 0',
      );
      expect(
        validateDebtInput(
          type: 'receivable',
          personName: 'Andi',
          amount: -500,
          date: '2026-10-14',
        ),
        'Amount must be greater than 0',
      );
    });

    test('over-maximum amount is blocked', () {
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 9999999999999 + 1,
          date: '2026-10-14',
        ),
        'Amount exceeds maximum limit',
      );
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 9999999999999,
          date: '2026-10-14',
        ),
        isNull,
      );
    });

    test('blank and overlong names are blocked', () {
      expect(
        validateDebtInput(
          type: 'debt',
          personName: '   ',
          amount: 10000,
          date: '2026-10-14',
        ),
        'Person or institution name is required',
      );
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'x' * 101,
          amount: 10000,
          date: '2026-10-14',
        ),
        'Name cannot exceed 100 characters',
      );
    });

    test('invalid type, date, due date and long note are blocked', () {
      expect(
        validateDebtInput(
          type: 'loan',
          personName: 'Bank',
          amount: 10000,
          date: '2026-10-14',
        ),
        'Invalid debt type',
      );
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 10000,
          date: '14-10-2026',
        ),
        'Invalid date format',
      );
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 10000,
          date: '2026-10-14',
          dueDate: '2026-02-30',
        ),
        'Invalid due date format',
      );
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 10000,
          date: '2026-10-14',
          note: 'x' * 501,
        ),
        'Note cannot exceed 500 characters',
      );
    });

    test('valid debt and receivable pass', () {
      expect(
        validateDebtInput(
          type: 'debt',
          personName: 'Bank',
          amount: 5000000,
          date: '2026-10-14',
          dueDate: '2026-12-14',
          note: 'Renovation',
        ),
        isNull,
      );
      expect(
        validateDebtInput(
          type: 'receivable',
          personName: 'Andi',
          amount: 250000,
          date: '2026-10-14',
        ),
        isNull,
      );
    });
  });

  group('validatePaymentInput', () {
    test('zero payment is blocked', () {
      expect(
        validatePaymentInput(amount: 0, paymentDate: '2026-10-14'),
        'Payment amount must be greater than 0',
      );
    });

    test('bad payment date is blocked', () {
      expect(
        validatePaymentInput(amount: 10000, paymentDate: '14-10-2026'),
        'Invalid payment date format',
      );
    });

    test('cash-flow sync requires the type-side ref', () {
      expect(
        validatePaymentInput(
          amount: 10000,
          paymentDate: '2026-10-14',
          recordToCashflow: true,
          debtType: 'debt',
        ),
        'Expense category is required when recording to cash flow',
      );
      expect(
        validatePaymentInput(
          amount: 10000,
          paymentDate: '2026-10-14',
          recordToCashflow: true,
          debtType: 'receivable',
        ),
        'Income source is required when recording to cash flow',
      );
      expect(
        validatePaymentInput(
          amount: 10000,
          paymentDate: '2026-10-14',
          recordToCashflow: true,
          debtType: 'debt',
          categoryId: 'c1',
        ),
        isNull,
      );
      expect(
        validatePaymentInput(
          amount: 10000,
          paymentDate: '2026-10-14',
          recordToCashflow: true,
          debtType: 'receivable',
          sourceId: 's1',
        ),
        isNull,
      );
    });

    test('payment without cash-flow sync needs no refs', () {
      expect(
        validatePaymentInput(
          amount: 10000,
          paymentDate: '2026-10-14',
          debtType: 'debt',
        ),
        isNull,
      );
    });
  });

  group('buildDebtPayload', () {
    test('trims names and nulls blank due date and note', () {
      final p = buildDebtPayload({
        'type': 'debt',
        'person_name': '  Bank  ',
        'amount': 5000000,
        'date': '2026-10-14',
        'due_date': '   ',
        'note': '  ',
      });
      expect(p['person_name'], 'Bank');
      expect(p['amount'], 5000000);
      expect(p['due_date'], isNull);
      expect(p['note'], isNull);
    });

    test('keeps due date and note when present', () {
      final p = buildDebtPayload({
        'type': 'receivable',
        'person_name': 'Andi',
        'amount': '250000',
        'date': '2026-10-14',
        'due_date': '2026-12-01',
        'note': 'Lunch loan',
      });
      expect(p['due_date'], '2026-12-01');
      expect(p['note'], 'Lunch loan');
    });

    test('fractional numeric strings are rejected, never truncated', () {
      expect(debtAmountOf({'amount': '25000.9'}), 0);
      expect(
        () => buildDebtPayload({
          'type': 'debt',
          'person_name': 'Bank',
          'amount': '25000.9',
          'date': '2026-10-14',
        }),
        throwsArgumentError,
      );
    });

    test('invalid values throw ArgumentError', () {
      expect(
        () => buildDebtPayload({
          'type': 'debt',
          'person_name': 'Bank',
          'amount': 0,
          'date': '2026-10-14',
        }),
        throwsArgumentError,
      );
    });
  });

  group('debtAmountOf', () {
    test('tolerates int, numeric String and null (bigint-as-String)', () {
      expect(debtAmountOf({'amount': 25000}), 25000);
      expect(debtAmountOf({'amount': '25000'}), 25000);
      expect(debtAmountOf({'amount': null}), 0);
      expect(debtAmountOf({}), 0);
    });
  });

  group('fetchDebts', () {
    test('uses the debts_with_balance RPC and maps rows', () async {
      String? fn;
      Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
        fn = f;
        return [
          {
            'id': 'd1',
            'type': 'debt',
            'person_name': 'Bank',
            'amount': '100000',
            'date': '2026-10-01',
            'due_date': '2026-12-01',
            'note': null,
            'created_at': '2026-10-01T00:00:00Z',
            'paid_amount': '20000',
            'remaining_amount': '80000',
            'status': 'partially_paid',
            'is_overdue': false,
          },
        ];
      }

      final rows = await fetchDebts(rpc: fake);
      expect(fn, 'debts_with_balance');
      expect(rows, hasLength(1));
      expect(rows.first.personName, 'Bank');
      expect(rows.first.amount, 100000);
      expect(rows.first.paidAmount, 20000);
      expect(rows.first.remainingAmount, 80000);
      expect(rows.first.isSettled, isFalse);
    });
  });

  group('fetchDebtsSummary', () {
    test('uses the debts_summary RPC and maps counts', () async {
      String? fn;
      Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async {
        fn = f;
        return [
          {
            'total_unpaid_debt': '80000',
            'total_unpaid_receivable': '50000',
            'unpaid_debt_count': 2,
            'unpaid_receivable_count': 1,
            'overdue_count': 1,
          },
        ];
      }

      final s = await fetchDebtsSummary(rpc: fake);
      expect(fn, 'debts_summary');
      expect(s.totalUnpaidDebt, 80000);
      expect(s.totalUnpaidReceivable, 50000);
      expect(s.unpaidDebtCount, 2);
      expect(s.unpaidReceivableCount, 1);
      expect(s.overdueCount, 1);
    });

    test('empty rows map to zeros', () async {
      Future<dynamic> fake(String f, {Map<String, dynamic>? params}) async =>
          [];
      final s = await fetchDebtsSummary(rpc: fake);
      expect(s.totalUnpaidDebt, 0);
      expect(s.overdueCount, 0);
    });
  });

  group('writes delegate to injected callers', () {
    DebtRecord debt() => DebtRecord(
          id: 'd1',
          type: 'debt',
          personName: 'Bank',
          amount: 100000,
          date: '2026-10-01',
          dueDate: null,
          note: null,
          createdAt: null,
          paidAmount: 20000,
          remainingAmount: 80000,
          status: 'partially_paid',
          isOverdue: false,
        );

    test('createDebt normalizes the payload', () async {
      Map<String, dynamic>? got;
      await createDebt(
        {
          'type': 'debt',
          'person_name': 'Bank',
          'amount': 100000,
          'date': '2026-10-01',
          'note': 'Renovation',
        },
        insert: (p) async => got = p,
      );
      expect(got?['person_name'], 'Bank');
      expect(got?['amount'], 100000);
    });

    test('recordDebtPayment without cash flow inserts the payment only',
        () async {
      var txCalls = 0;
      Map<String, dynamic>? gotPayment;
      await recordDebtPayment(
        debt: debt(),
        values: {
          'amount': 30000,
          'payment_date': '2026-10-14',
          'record_to_cashflow': false,
        },
        insertTransaction: (p) async {
          txCalls++;
          return 'tx-id';
        },
        insertPayment: (p) async => gotPayment = p,
      );
      expect(txCalls, 0);
      expect(gotPayment?['debt_id'], 'd1');
      expect(gotPayment?['amount'], 30000);
      expect(gotPayment?['payment_date'], '2026-10-14');
      expect(gotPayment?['transaction_id'], isNull);
    });

    test('debt payment with cash flow creates an expense first', () async {
      Map<String, dynamic>? gotTx;
      Map<String, dynamic>? gotPayment;
      await recordDebtPayment(
        debt: debt(),
        values: {
          'amount': 30000,
          'payment_date': '2026-10-14',
          'record_to_cashflow': true,
          'category_id': 'c1',
        },
        insertTransaction: (p) async {
          gotTx = p;
          return 'tx-id';
        },
        insertPayment: (p) async => gotPayment = p,
      );
      expect(gotTx?['type'], 'expense');
      expect(gotTx?['amount'], 30000);
      expect(gotTx?['category_id'], 'c1');
      expect(gotTx?['source_id'], isNull);
      expect(gotPayment?['transaction_id'], 'tx-id');
    });

    test('receivable payment with cash flow creates an income', () async {
      Map<String, dynamic>? gotTx;
      await recordDebtPayment(
        debt: DebtRecord(
          id: 'r1',
          type: 'receivable',
          personName: 'Andi',
          amount: 50000,
          date: '2026-10-01',
          dueDate: null,
          note: null,
          createdAt: null,
          paidAmount: 0,
          remainingAmount: 50000,
          status: 'pending',
          isOverdue: false,
        ),
        values: {
          'amount': 50000,
          'payment_date': '2026-10-14',
          'record_to_cashflow': true,
          'source_id': 's1',
        },
        insertTransaction: (p) async {
          gotTx = p;
          return 'tx-id';
        },
        insertPayment: (p) async {},
      );
      expect(gotTx?['type'], 'income');
      expect(gotTx?['source_id'], 's1');
      expect(gotTx?['category_id'], isNull);
    });

    test('payment defaults the cash-flow note to the person name', () async {
      Map<String, dynamic>? gotTx;
      await recordDebtPayment(
        debt: debt(),
        values: {
          'amount': 10000,
          'payment_date': '2026-10-14',
          'record_to_cashflow': true,
          'category_id': 'c1',
        },
        insertTransaction: (p) async {
          gotTx = p;
          return 'tx-id';
        },
        insertPayment: (p) async {},
      );
      expect(gotTx?['note'], 'Debt payment to Bank');
    });

    test('invalid payment values throw ArgumentError', () {
      expect(
        () => recordDebtPayment(
          debt: debt(),
          values: {'amount': 0, 'payment_date': '2026-10-14'},
        ),
        throwsArgumentError,
      );
    });

    test('deleteDebt and deleteDebtPayment pass the id', () async {
      String? gotDebt;
      await deleteDebt('d1', deleter: (id) async => gotDebt = id);
      expect(gotDebt, 'd1');
      String? gotPayment;
      await deleteDebtPayment('p1', deleter: (id) async => gotPayment = id);
      expect(gotPayment, 'p1');
    });
  });

  group('isNotSignedInError', () {
    test('maps the signed-out StateError to login', () {
      expect(isNotSignedInError(StateError('Not signed in')), isTrue);
      expect(isNotSignedInError(StateError('other problem')), isFalse);
      expect(isNotSignedInError(ArgumentError('x')), isFalse);
    });
  });
}

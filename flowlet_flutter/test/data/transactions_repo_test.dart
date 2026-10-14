import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/transactions_repo.dart';

void main() {
  group('validateTransactionInput', () {
    test('zero amount is blocked', () {
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 0,
          date: '2026-10-14',
          categoryId: 'c1',
        ),
        'Amount must be greater than 0',
      );
    });

    test('negative amount is blocked', () {
      expect(
        validateTransactionInput(
          type: 'income',
          amount: -500,
          date: '2026-10-14',
          sourceId: 's1',
        ),
        'Amount must be greater than 0',
      );
    });

    test('over-maximum amount is blocked', () {
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 9999999999999 + 1,
          date: '2026-10-14',
          categoryId: 'c1',
        ),
        'Amount exceeds maximum limit',
      );
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 9999999999999,
          date: '2026-10-14',
          categoryId: 'c1',
        ),
        isNull,
      );
    });

    test('expense without category is blocked', () {
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 10000,
          date: '2026-10-14',
        ),
        'Please select a category',
      );
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 10000,
          date: '2026-10-14',
          categoryId: '',
        ),
        'Please select a category',
      );
    });

    test('income without source is blocked', () {
      expect(
        validateTransactionInput(
          type: 'income',
          amount: 10000,
          date: '2026-10-14',
        ),
        'Please select an income source',
      );
      expect(
        validateTransactionInput(
          type: 'income',
          amount: 10000,
          date: '2026-10-14',
          sourceId: '',
        ),
        'Please select an income source',
      );
    });

    test('invalid date and long note are blocked', () {      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 10000,
          date: '14-10-2026',
          categoryId: 'c1',
        ),
        'Invalid date format',
      );
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 10000,
          date: '2026-10-14',
          categoryId: 'c1',
          note: 'x' * 501,
        ),
        'Note cannot exceed 500 characters',
      );
    });

    test('impossible calendar dates are rejected', () {
      for (final d in [
        '2026-13-99',
        '2026-02-30',
        '2026-00-10',
        '2026-01-32',
        '2023-02-29',
        '2026-04-31',
      ]) {
        expect(
          validateTransactionInput(
            type: 'expense',
            amount: 10000,
            date: d,
            categoryId: 'c1',
          ),
          'Invalid date format',
          reason: d,
        );
      }
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 10000,
          date: '2024-02-29',
          categoryId: 'c1',
        ),
        isNull,
      );
    });

    test('valid expense and income pass', () {
      expect(
        validateTransactionInput(
          type: 'expense',
          amount: 25000,
          date: '2026-10-14',
          categoryId: 'c1',
          note: 'Lunch',
        ),
        isNull,
      );
      expect(
        validateTransactionInput(
          type: 'income',
          amount: 5000000,
          date: '2026-10-14',
          sourceId: 's1',
        ),
        isNull,
      );
    });
  });

  group('buildTransactionPayload', () {
    test('expense keeps category and nulls source', () {
      final p = buildTransactionPayload({
        'type': 'expense',
        'amount': 25000,
        'date': '2026-10-14',
        'category_id': 'c1',
        'source_id': 's9',
        'note': 'Lunch',
      });
      expect(
        p,
        {'type': 'expense', 'amount': 25000, 'date': '2026-10-14', 'category_id': 'c1', 'source_id': null, 'note': 'Lunch'},
      );
    });

    test('income keeps source and nulls category, blank note becomes null', () {
      final p = buildTransactionPayload({
        'type': 'income',
        'amount': '5000000',
        'date': '2026-10-14',
        'category_id': 'c1',
        'source_id': 's1',
        'note': '   ',
      });
      expect(p['type'], 'income');
      expect(p['amount'], 5000000);
      expect(p['category_id'], isNull);
      expect(p['source_id'], 's1');
      expect(p['note'], isNull);
    });

    test('fractional numeric strings are rejected, never truncated', () {
      expect(txAmountOf({'amount': '25000.9'}), 0);
      expect(
        () => buildTransactionPayload({
          'type': 'expense',
          'amount': '25000.9',
          'date': '2026-10-14',
          'category_id': 'c1',
        }),
        throwsArgumentError,
      );
    });

    test('invalid values throw ArgumentError', () {
      expect(
        () => buildTransactionPayload({
          'type': 'expense',
          'amount': 0,
          'date': '2026-10-14',
          'category_id': 'c1',
        }),
        throwsArgumentError,
      );
    });
  });

  group('txAmountOf', () {
    test('tolerates num, numeric String and null (bigint-as-String)', () {
      expect(txAmountOf({'amount': 25000}), 25000);
      expect(txAmountOf({'amount': '25000'}), 25000);
      expect(txAmountOf({'amount': null}), 0);
      expect(txAmountOf({}), 0);
    });
  });

  group('listTransactions', () {
    test('computes date range from periodStart/periodEnd', () async {
      String? gotStart;
      String? gotEnd;
      Future<List<Map<String, dynamic>>> fake({
        required String start,
        required String end,
        String? type,
        String? refId,
        String? searchPattern,
        required int limitPlusOne,
      }) async {
        gotStart = start;
        gotEnd = end;
        return [];
      }

      await listTransactions(year: 2026, month: 10, startDay: 25, caller: fake);
      expect(gotStart, '2026-10-25');
      expect(gotEnd, '2026-11-24');
    });

    test('escapes ilike search and requests limit+1', () async {
      String? gotPattern;
      int? gotLimit;
      String? gotType;
      String? gotRef;
      Future<List<Map<String, dynamic>>> fake({
        required String start,
        required String end,
        String? type,
        String? refId,
        String? searchPattern,
        required int limitPlusOne,
      }) async {
        gotPattern = searchPattern;
        gotLimit = limitPlusOne;
        gotType = type;
        gotRef = refId;
        return [];
      }

      await listTransactions(
        year: 2026,
        month: 10,
        type: 'expense',
        refId: 'c1',
        search: '100%_x\\y',
        caller: fake,
      );
      expect(gotPattern, '%100\\%\\_x\\\\y%');
      expect(gotLimit, 51);
      expect(gotType, 'expense');
      expect(gotRef, 'c1');
    });

    test('limit+1 pagination trims items and reports hasMore', () async {
      Future<List<Map<String, dynamic>>> fake({
        required String start,
        required String end,
        String? type,
        String? refId,
        String? searchPattern,
        required int limitPlusOne,
      }) async {
        return List.generate(
          limitPlusOne,
          (i) => {'id': 't$i', 'amount': 1000},
        );
      }

      final page = await listTransactions(year: 2026, month: 10, caller: fake);
      expect(page.hasMore, isTrue);
      expect(page.items, hasLength(50));

      Future<List<Map<String, dynamic>>> fakeShort({
        required String start,
        required String end,
        String? type,
        String? refId,
        String? searchPattern,
        required int limitPlusOne,
      }) async {
        return [
          {'id': 't0', 'amount': 1000},
        ];
      }

      final short = await listTransactions(year: 2026, month: 10, caller: fakeShort);
      expect(short.hasMore, isFalse);
      expect(short.items, hasLength(1));
    });
  });

  group('isNotSignedInError', () {
    test('maps the signed-out StateError to login', () {
      expect(isNotSignedInError(StateError('Not signed in')), isTrue);
      expect(isNotSignedInError(StateError('other problem')), isFalse);
      expect(isNotSignedInError(ArgumentError('x')), isFalse);
    });
  });

  group('writes delegate to injected caller with normalized payload', () {
    test('createTransaction', () async {
      Map<String, dynamic>? got;
      await createTransaction(
        {
          'type': 'expense',
          'amount': 25000,
          'date': '2026-10-14',
          'category_id': 'c1',
          'note': 'Lunch',
        },
        insert: (p) async => got = p,
      );
      expect(got?['amount'], 25000);
      expect(got?['category_id'], 'c1');
      expect(got?['source_id'], isNull);
    });

    test('updateTransaction passes id and payload', () async {
      String? gotId;
      Map<String, dynamic>? got;
      await updateTransaction(
        'tx-id',
        {
          'type': 'income',
          'amount': 1000,
          'date': '2026-10-14',
          'source_id': 's1',
        },
        update: (id, p) async {
          gotId = id;
          got = p;
        },
      );
      expect(gotId, 'tx-id');
      expect(got?['source_id'], 's1');
    });

    test('deleteTransaction passes id', () async {
      String? gotId;
      await deleteTransaction('tx-id', deleter: (id) async => gotId = id);
      expect(gotId, 'tx-id');
    });
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/data/debts_repo.dart';
import 'package:flowlet_flutter/features/debts/debts_screen.dart';

const _debts = [
  DebtRecord(
    id: 'd1',
    type: 'debt',
    personName: 'Bank',
    amount: 100000,
    date: '2026-10-01',
    dueDate: '2026-12-01',
    note: null,
    createdAt: null,
    paidAmount: 25000,
    remainingAmount: 75000,
    status: 'partially_paid',
    isOverdue: false,
  ),
  DebtRecord(
    id: 'r1',
    type: 'receivable',
    personName: 'Andi',
    amount: 50000,
    date: '2026-10-02',
    dueDate: '2026-09-01',
    note: null,
    createdAt: null,
    paidAmount: 0,
    remainingAmount: 50000,
    status: 'pending',
    isOverdue: true,
  ),
  DebtRecord(
    id: 'd2',
    type: 'debt',
    personName: 'Settled Co',
    amount: 20000,
    date: '2026-09-01',
    dueDate: null,
    note: null,
    createdAt: null,
    paidAmount: 20000,
    remainingAmount: 0,
    status: 'settled',
    isOverdue: false,
  ),
];

const _summary = DebtsSummary(75000, 50000, 1, 1, 1);

Future<void> _pump(
  WidgetTester tester, {
  List<DebtRecord> debts = _debts,
  DebtsSummary summary = _summary,
  Future<DebtsSummary> Function()? summaryFn,
  Future<void> Function(String id)? deleteDebtFn,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: DebtsScreen(
          debtsFn: () async => debts,
          summaryFn: summaryFn ?? () async => summary,
          categoriesFn: () async => [
            {'id': 'c1', 'name': 'Bills'},
          ],
          sourcesFn: () async => [
            {'id': 's1', 'name': 'Salary'},
          ],
          deleteDebtFn: deleteDebtFn,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => privacyMode.value = false);

  group('DebtsScreen', () {
    testWidgets('shows summary amounts and unpaid count badges',
        (tester) async {
      await _pump(tester);
      expect(find.text('Total unpaid debts'), findsOneWidget);
      expect(find.text('Total unpaid receivables'), findsOneWidget);
      expect(find.text('1 unpaid'), findsNWidgets(2));
      expect(find.textContaining('75.000'), findsWidgets);
      expect(find.textContaining('50.000'), findsWidgets);
    });

    testWidgets('shows overdue banner and badge', (tester) async {
      await _pump(tester);
      expect(find.textContaining('past its due date'), findsOneWidget);
      expect(find.text('Overdue'), findsWidgets);
    });

    testWidgets('settled debts are hidden by the Unpaid filter',
        (tester) async {
      await _pump(tester);
      expect(find.text('Settled Co'), findsNothing);
      await tester.tap(find.text('All statuses'));
      await tester.pumpAndSettle();
      expect(find.text('Settled Co'), findsOneWidget);
    });

    testWidgets('type filter narrows the list', (tester) async {
      await _pump(tester);
      await tester.tap(find.text('Receivables'));
      await tester.pumpAndSettle();
      expect(find.text('Andi'), findsOneWidget);
      expect(find.text('Bank'), findsNothing);
    });

    testWidgets('settled debt has no pay button', (tester) async {
      await _pump(tester);
      await tester.tap(find.text('All statuses'));
      await tester.pumpAndSettle();
      final settledTile = find.ancestor(
        of: find.text('Settled Co'),
        matching: find.byType(DebtTile),
      );
      expect(settledTile, findsOneWidget);
      expect(
        find.descendant(of: settledTile, matching: find.text('Pay')),
        findsNothing,
      );
    });

    testWidgets('privacy mode masks amounts and progress magnitude',
        (tester) async {
      await _pump(tester);
      expect(find.byType(LinearProgressIndicator), findsWidgets);
      privacyMode.value = true;
      await tester.pumpAndSettle();
      expect(find.byType(LinearProgressIndicator), findsNothing);
      expect(find.textContaining('75.000'), findsNothing);
      expect(find.textContaining('50.000'), findsNothing);
      privacyMode.value = false;
    });

    testWidgets('empty list shows empty state', (tester) async {
      await _pump(tester, debts: const []);
      expect(
        find.text('No debts or receivables recorded yet.'),
        findsOneWidget,
      );
    });

    testWidgets('delete refreshes the summary totals', (tester) async {
      var calls = 0;
      await _pump(
        tester,
        debts: [_debts[0]],
        summaryFn: () async {
          calls++;
          return calls == 1
              ? const DebtsSummary(75000, 0, 1, 0, 0)
              : const DebtsSummary(0, 0, 0, 0, 0);
        },
        deleteDebtFn: (_) async {},
      );
      expect(find.textContaining('75.000'), findsWidgets);
      await tester.tap(find.byTooltip('Delete record for Bank'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
      expect(find.text('Record deleted'), findsOneWidget);
      expect(find.text('Bank'), findsNothing);
      expect(calls, greaterThanOrEqualTo(2));
      expect(find.text('Rp 0'), findsWidgets);
      expect(find.textContaining('75.000'), findsNothing);
    });
  });

  group('DebtFormDialog', () {
    testWidgets('blank name is blocked and onSave is not called',
        (tester) async {
      final saved = <Map<String, dynamic>>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DebtFormDialog(
              onSave: (values) async => saved.add(values),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const ValueKey('debt-amount')), '100000');
      await tester.pump();
      await tester.tap(find.text('Save record'));
      await tester.pumpAndSettle();
      expect(
        find.text('Person or institution name is required'),
        findsOneWidget,
      );
      expect(saved, isEmpty);
    });

    testWidgets('valid debt calls onSave with normalized values',
        (tester) async {
      final saved = <Map<String, dynamic>>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DebtFormDialog(
              onSave: (values) async => saved.add(values),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const ValueKey('debt-person')), 'Bank');
      await tester.enterText(
          find.byKey(const ValueKey('debt-amount')), '100000');
      await tester.pump();
      await tester.tap(find.text('Save record'));
      await tester.pumpAndSettle();
      expect(saved, hasLength(1));
      expect(saved.first['type'], 'debt');
      expect(saved.first['amount'], 100000);
      expect(saved.first['person_name'], 'Bank');
      expect(
          saved.first['date'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
    });

    testWidgets('signed-out save redirects to login', (tester) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => Scaffold(
              body: DebtFormDialog(
                onSave: (_) async => throw StateError('Not signed in'),
              ),
            ),
          ),
          GoRoute(
            path: '/login',
            builder: (context, state) =>
                const Scaffold(body: Text('Login page')),
          ),
        ],
      );
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byKey(const ValueKey('debt-person')), 'Bank');
      await tester.enterText(
          find.byKey(const ValueKey('debt-amount')), '100000');
      await tester.pump();
      await tester.tap(find.text('Save record'));
      await tester.pumpAndSettle();
      expect(find.text('Login page'), findsOneWidget);
    });
  });

  group('PaymentDialog', () {
    testWidgets('defaults amount to remaining and records payment',
        (tester) async {
      DebtRecord? gotDebt;
      final saved = <Map<String, dynamic>>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaymentDialog(
              debt: _debts[0],
              categories: const [
                {'id': 'c1', 'name': 'Bills'},
              ],
              onSave: (debt, values) async {
                gotDebt = debt;
                saved.add(values);
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Bank • Remaining: Rp 75.000'),
        findsOneWidget,
      );
      await tester.tap(find.text('Confirm payment'));
      await tester.pumpAndSettle();
      expect(gotDebt?.id, 'd1');
      expect(saved, hasLength(1));
      expect(saved.first['amount'], 75000);
      expect(saved.first['record_to_cashflow'], isTrue);
      expect(saved.first['category_id'], 'c1');
    });

    testWidgets('header remaining is masked when privacy is on',
        (tester) async {
      privacyMode.value = true;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PaymentDialog(
              debt: _debts[0],
              categories: const [
                {'id': 'c1', 'name': 'Bills'},
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Bank • Remaining: Rp ••••••'),
        findsOneWidget,
      );
      expect(find.textContaining('75.000'), findsNothing);
      privacyMode.value = false;
    });

    testWidgets('auth failure redirects to login', (tester) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => Scaffold(
              body: PaymentDialog(
                debt: _debts[0],
                categories: const [
                  {'id': 'c1', 'name': 'Bills'},
                ],
                onSave: (_, __) async =>
                    throw AuthException('signed out'),
              ),
            ),
          ),
          GoRoute(
            path: '/login',
            builder: (context, state) =>
                const Scaffold(body: Text('Login page')),
          ),
        ],
      );
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm payment'));
      await tester.pumpAndSettle();
      expect(find.text('Login page'), findsOneWidget);
    });
  });
}

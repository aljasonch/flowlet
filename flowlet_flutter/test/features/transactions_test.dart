import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/features/transactions/tx_form_screen.dart';
import 'package:flowlet_flutter/features/transactions/tx_list_screen.dart';

const _cats = [
  {'id': 'c1', 'name': 'Food'},
  {'id': 'c2', 'name': 'Transport'},
];
const _srcs = [
  {'id': 's1', 'name': 'Salary'},
];

Future<void> _pumpForm(
  WidgetTester tester, {
  List<Map<String, String>> categories = _cats,
  List<Map<String, String>> sources = _srcs,
  Map<String, dynamic>? initialData,
  List<Map<String, dynamic>>? saved,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: TxFormScreen(
          categories: categories,
          sources: sources,
          initialData: initialData,
          onSave: (values) async => saved?.add(values),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _setAmount(WidgetTester tester, String value) async {
  await tester.enterText(find.byKey(const ValueKey('tx-amount')), value);
  await tester.pump();
}

Future<void> _tapSave(WidgetTester tester) async {
  await tester.tap(find.text('Save transaction'));
  await tester.pumpAndSettle();
}

void main() {
  group('TxFormScreen validation', () {
    testWidgets('zero amount is blocked and onSave is not called', (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _pumpForm(tester, saved: saved);
      await _setAmount(tester, '0');
      await _tapSave(tester);
      expect(find.text('Amount must be greater than 0'), findsOneWidget);
      expect(saved, isEmpty);
    });

    testWidgets('expense with no categories shows category error', (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _pumpForm(tester, categories: const [], saved: saved);
      await _setAmount(tester, '25000');
      await _tapSave(tester);
      expect(find.text('Please select a category'), findsOneWidget);
      expect(saved, isEmpty);
    });

    testWidgets('income with no sources shows source error', (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _pumpForm(tester, sources: const [], saved: saved);
      await tester.tap(find.text('Income'));
      await tester.pumpAndSettle();
      await _setAmount(tester, '50000');
      await _tapSave(tester);
      expect(find.text('Please select an income source'), findsOneWidget);
      expect(saved, isEmpty);
    });

    testWidgets('valid expense calls onSave with normalized values', (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _pumpForm(tester, saved: saved);
      await _setAmount(tester, '25000');
      await tester.enterText(find.byKey(const ValueKey('tx-note')), 'Lunch');
      await tester.pump();
      await _tapSave(tester);
      expect(saved, hasLength(1));
      expect(saved.first['type'], 'expense');
      expect(saved.first['amount'], 25000);
      expect(saved.first['category_id'], 'c1');
      expect(saved.first['date'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
      expect(saved.first['note'], 'Lunch');
    });

    testWidgets('switching to income swaps category for source select', (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _pumpForm(tester, saved: saved);
      await tester.tap(find.text('Income'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('tx-source')), findsOneWidget);
      expect(find.byKey(const ValueKey('tx-category')), findsNothing);
      await _setAmount(tester, '100000');
      await _tapSave(tester);
      expect(saved, hasLength(1));
      expect(saved.first['type'], 'income');
      expect(saved.first['source_id'], 's1');
    });

    testWidgets('edit mode shows Save changes', (tester) async {      await _pumpForm(
        tester,
        initialData: const {
          'id': 't1',
          'type': 'expense',
          'amount': 25000,
          'date': '2026-10-10',
          'category_id': 'c2',
          'source_id': null,
          'note': 'Taxi',
        },
      );
      expect(find.text('Save changes'), findsOneWidget);
      expect(find.text('Edit transaction'), findsOneWidget);
    });
    testWidgets('edit mode without id shows error instead of crashing', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TxFormScreen(
              categories: _cats,
              sources: _srcs,
              initialData: const {
                'type': 'expense',
                'amount': 25000,
                'date': '2026-10-10',
                'category_id': 'c1',
                'source_id': null,
                'note': '',
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();
      expect(find.text('Missing transaction id'), findsWidgets);
    });

    testWidgets('edit mode keeps archived current category selectable', (
      tester,
    ) async {
      await _pumpForm(
        tester,
        categories: const [
          {'id': 'c1', 'name': 'Food'},
        ],
        initialData: const {
          'id': 't1',
          'type': 'expense',
          'amount': 25000,
          'date': '2026-10-10',
          'category_id': 'c-archived',
          'category': {'id': 'c-archived', 'name': 'Old archived'},
          'source_id': null,
          'note': '',
        },
      );
      expect(find.text('Old archived'), findsOneWidget);
    });
  });

  group('TxListScreen privacy toggle', () {
    testWidgets('toggle flips masked and unmasked state', (tester) async {
      SharedPreferences.setMockInitialValues({});
      privacyMode.value = false;
      addTearDown(() => privacyMode.value = false);
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: TxListScreen())),
      );
      await tester.pumpAndSettle();
      expect(find.byTooltip('Hide balances'), findsOneWidget);
      await tester.tap(find.byTooltip('Hide balances'));
      await tester.pumpAndSettle();
      expect(privacyMode.value, isTrue);
      expect(find.byTooltip('Show balances'), findsOneWidget);
      await tester.tap(find.byTooltip('Show balances'));
      await tester.pumpAndSettle();
      expect(privacyMode.value, isFalse);
    });
  });

  group('TxListTile', () {
    Map<String, dynamic> item({
      String type = 'expense',
      dynamic amount = 25000,
      String? note = 'Lunch',
    }) =>
        {
          'id': 't1',
          'type': type,
          'amount': amount,
          'date': '2026-10-14',
          'note': note,
          'category': const {'id': 'c1', 'name': 'Food'},
          'source': null,
        };

    testWidgets('masks amount when privacy is hidden', (tester) async {
      privacyMode.value = true;
      addTearDown(() => privacyMode.value = false);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TxListTile(item: item(), onEdit: () {}, onDelete: () {}),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('Rp ••••••'), findsOneWidget);
    });

    testWidgets('expense shows minus sign, income shows plus sign', (tester) async {
      privacyMode.value = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                TxListTile(item: item(type: 'expense'), onEdit: () {}, onDelete: () {}),
                TxListTile(
                  item: {
                    'id': 't2',
                    'type': 'income',
                    'amount': '5000000',
                    'date': '2026-10-14',
                    'note': null,
                    'category': null,
                    'source': const {'id': 's1', 'name': 'Salary'},
                  },
                  onEdit: () {},
                  onDelete: () {},
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.textContaining('-Rp'), findsOneWidget);
      expect(find.textContaining('+Rp'), findsOneWidget);
      expect(find.text('Food'), findsOneWidget);
      expect(find.text('Salary'), findsOneWidget);
    });
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/data/settings_repo.dart';
import 'package:flowlet_flutter/features/settings/settings_screen.dart';

const _profile = SettingsProfile(
  monthStartDay: 25,
  currency: 'IDR',
  rate: '15750.25',
  rateUpdatedAt: '2026-10-14T00:00:00Z',
);

const _categories = [
  NamedRef(id: 'c1', name: 'Food', isArchived: false),
  NamedRef(id: 'c2', name: 'Old', isArchived: true),
];

const _sources = [
  NamedRef(id: 's1', name: 'Salary', isArchived: false),
  NamedRef(id: 's2', name: 'Legacy', isArchived: true),
];

Future<void> _pump(
  WidgetTester tester, {
  Future<void> Function(int day)? saveMonthFn,
  Future<void> Function(String name)? addCategoryFn,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: SettingsScreen(
          profileFn: () async => _profile,
          categoriesFn: () async => _categories,
          sourcesFn: () async => _sources,
          saveMonthFn: saveMonthFn,
          addCategoryFn: addCategoryFn,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders preferences, read-only IDR and archived sections',
      (tester) async {
    await _pump(tester);

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Reporting preferences'), findsOneWidget);
    expect(find.text('Indonesian Rupiah (IDR)'), findsOneWidget);
    expect(find.text('Expense categories'), findsOneWidget);
    expect(find.text('Food'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Income sources'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Income sources'), findsOneWidget);
    expect(find.text('Salary'), findsOneWidget);
    expect(find.byKey(const ValueKey('settings-archived-categories')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('settings-archived-sources')),
        findsOneWidget);
    // Prefilled from the profile, rate kept as an exact decimal string.
    expect(find.text('25'), findsOneWidget);
    expect(find.text('15750.25'), findsOneWidget);
    expect(
      find.text('Last updated: 2026-10-14T00:00:00Z'),
      findsOneWidget,
    );
  });

  testWidgets('out-of-range month start shows the validation error',
      (tester) async {
    var calls = 0;
    await _pump(tester, saveMonthFn: (_) async => calls++);

    await tester.enterText(
      find.byKey(const ValueKey('settings-month')),
      '32',
    );
    await tester.tap(find.byKey(const ValueKey('settings-month-save')));
    await tester.pumpAndSettle();

    expect(
      find.text('Month start day must be between 1 and 31'),
      findsOneWidget,
    );
    expect(calls, 0);
  });

  testWidgets('duplicate category name surfaces the friendly error',
      (tester) async {
    await _pump(
      tester,
      addCategoryFn: (_) async => throw StateError('That name already exists'),
    );

    await tester.enterText(
      find.byKey(const ValueKey('settings-category-name')),
      'Food',
    );
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    expect(find.text('That name already exists'), findsOneWidget);
  });
}

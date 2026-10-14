import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/privacy.dart';
import 'package:flowlet_flutter/data/dashboard_repo.dart';
import 'package:flowlet_flutter/features/dashboard/dashboard_screen.dart';

void main() {
  test('trendLabel uses M/yy format across year boundaries', () {
    expect(trendLabel(2026, 10), '10/26');
    expect(trendLabel(2026, 12), '12/26');
    expect(trendLabel(2027, 1), '1/27');
  });

  testWidgets('trend chart renders masked placeholder when privacy hidden',
      (tester) async {
    privacyMode.value = true;
    addTearDown(() => privacyMode.value = false);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TrendCard(
            trend: [TrendPoint(2026, 10, 5000000, 2000000)],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Rp ••••••'), findsOneWidget);
    expect(find.text('10/26'), findsNothing);
  });

  testWidgets('trend chart renders M/yy labels when privacy visible',
      (tester) async {
    privacyMode.value = false;

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TrendCard(
            trend: [
              TrendPoint(2026, 12, 5000000, 2000000),
              TrendPoint(2027, 1, 6000000, 1000000),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('12/26'), findsOneWidget);
    expect(find.text('1/27'), findsOneWidget);
    expect(find.text('Rp ••••••'), findsNothing);
  });

  testWidgets('spending chart renders masked placeholder when privacy hidden',
      (tester) async {
    privacyMode.value = true;
    addTearDown(() => privacyMode.value = false);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SpendingCard(
            cats: [CatSpend('id', 'Food', 2500000)],
          ),
        ),
      ),
    );
    await tester.pump();

    // One masked chart placeholder plus one masked legend row.
    expect(find.text('Rp ••••••'), findsNWidgets(2));
    expect(find.text('Food'), findsWidgets);
  });

  testWidgets('spending chart renders bars when privacy visible',
      (tester) async {
    privacyMode.value = false;

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SpendingCard(
            cats: [CatSpend('id', 'Food', 2500000)],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Rp ••••••'), findsNothing);
    expect(find.text('Food'), findsWidgets);
  });
}

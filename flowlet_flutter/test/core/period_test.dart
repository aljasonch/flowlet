import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/period.dart';

void main() {
  test('period table row: start_day 25, label 2026-10', () {
    expect(periodStart(2026, 10, 25), '2026-10-25');
    expect(periodEnd(2026, 10, 25), '2026-11-24');
  });
  test('clamp: start_day 31 in 2026-02', () {
    expect(periodStart(2026, 2, 31), '2026-02-28');
    expect(periodEnd(2026, 2, 31), '2026-03-30');
  });
  test('current period before start uses previous label', () {
    expect(getCurrentPeriod('2026-10-10', 25), const PeriodLabel(2026, 9));
    expect(getCurrentPeriod('2026-10-25', 25), const PeriodLabel(2026, 10));
  });
}

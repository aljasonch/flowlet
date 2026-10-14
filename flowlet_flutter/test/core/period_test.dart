import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/period.dart';

void main() {
  test('period table row: start_day 1, label 2026-10', () {
    expect(periodStart(2026, 10, 1), '2026-10-01');
    expect(periodEnd(2026, 10, 1), '2026-10-31');
  });
  test('period table row: start_day 25, label 2026-10', () {
    expect(periodStart(2026, 10, 25), '2026-10-25');
    expect(periodEnd(2026, 10, 25), '2026-11-24');
  });
  test('period table row: start_day 25, label 2026-12 wraps year', () {
    expect(periodStart(2026, 12, 25), '2026-12-25');
    expect(periodEnd(2026, 12, 25), '2027-01-24');
  });
  test('period table row: start_day 31, label 2026-01', () {
    expect(periodStart(2026, 1, 31), '2026-01-31');
    expect(periodEnd(2026, 1, 31), '2026-02-27');
  });
  test('clamp: start_day 31 in 2026-02', () {
    expect(periodStart(2026, 2, 31), '2026-02-28');
    expect(periodEnd(2026, 2, 31), '2026-03-30');
  });
  test('period table row: start_day 31, label 2028-02 leap', () {
    expect(periodStart(2028, 2, 31), '2028-02-29');
    expect(periodEnd(2028, 2, 31), '2028-03-30');
  });
  test('period table row: start_day 30, label 2026-04', () {
    expect(periodStart(2026, 4, 30), '2026-04-30');
    expect(periodEnd(2026, 4, 30), '2026-05-29');
  });
  test('current period before start uses previous label', () {
    expect(getCurrentPeriod('2026-10-10', 25), const PeriodLabel(2026, 9));
    expect(getCurrentPeriod('2026-10-25', 25), const PeriodLabel(2026, 10));
  });
  test('current period wraps to previous year', () {
    expect(getCurrentPeriod('2027-01-10', 25), const PeriodLabel(2026, 12));
    expect(getCurrentPeriod('2027-01-25', 25), const PeriodLabel(2027, 1));
  });
  test('adjacent periods cross year boundaries', () {
    expect(getAdjacentPeriod(2026, 12, 1), const PeriodLabel(2027, 1));
    expect(getAdjacentPeriod(2027, 1, -1), const PeriodLabel(2026, 12));
    expect(getAdjacentPeriod(2026, 10, 1), const PeriodLabel(2026, 11));
    expect(getAdjacentPeriod(2026, 10, -1), const PeriodLabel(2026, 9));
  });
  test('formatPeriodRange renders the date range', () {
    expect(
      formatPeriodRange('2026-10-25', '2026-11-24'),
      '25 Oct 2026 – 24 Nov 2026',
    );
    expect(
      formatPeriodRange('2026-12-25', '2027-01-24'),
      '25 Dec 2026 – 24 Jan 2027',
    );
  });
}

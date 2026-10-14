import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/staleness.dart';
import 'package:flowlet_flutter/core/today.dart';

void main() {
  test('getTodayDate returns YYYY-MM-DD', () {
    expect(getTodayDate(DateTime(2026, 1, 5)), '2026-01-05');
    expect(RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(getTodayDate()), isTrue);
  });
  test('isPriceStale null or unparsable is stale', () {
    expect(isPriceStale('manual', null), isTrue);
    expect(isPriceStale('coingecko', 'not-a-date'), isTrue);
  });
  test('isPriceStale manual threshold 30 days', () {
    final now = DateTime(2026, 10, 14);
    expect(
      isPriceStale('manual', '2026-09-01T00:00:00.000', now: now),
      isTrue,
    );
    expect(
      isPriceStale('manual', '2026-10-01T00:00:00.000', now: now),
      isFalse,
    );
  });
  test('isPriceStale auto threshold 24 hours', () {
    final now = DateTime(2026, 10, 14, 12);
    expect(
      isPriceStale('coingecko', '2026-10-13T10:00:00.000', now: now),
      isTrue,
    );
    expect(
      isPriceStale('coingecko', '2026-10-14T10:00:00.000', now: now),
      isFalse,
    );
  });
}

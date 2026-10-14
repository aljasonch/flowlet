import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/format.dart';

void main() {
  test('formatIDR uses id-ID grouping', () {
    expect(formatIDR(1250000), contains('1.250.000'));
  });
  test('formatIDRNullable returns dash for null', () {
    expect(formatIDRNullable(null), '-');
    expect(formatIDRNullable(5000), contains('5.000'));
  });
  test('formatQuantity trims trailing zeros', () {
    expect(formatQuantity('0.00540000'), '0.0054');
    expect(formatQuantity('1.00000000'), '1');
  });
  test('formatPercent shows explicit sign', () {
    expect(formatPercent('2.5'), '+2.50%');
    expect(formatPercent('-1.234'), '-1.23%');
  });
  test('formatPrice IDR and USD', () {
    expect(formatPrice('1250000', 'IDR'), contains('1.250.000'));
    expect(formatPrice('1.5', 'USD'), contains('1.50'));
  });
}

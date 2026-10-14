import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/parse.dart';

void main() {
  test('parseAmountInput strips Rp and separators', () {
    expect(parseAmountInput('Rp 1.250.000'), 1250000);
  });
  test('parseAmountInput clamps to max', () {
    expect(parseAmountInput('99999999999999'), maxAmount);
    expect(maxAmount, 9999999999999);
  });
  test('parseAmountInput empty returns 0', () {
    expect(parseAmountInput(''), 0);
  });
  test('parseDecimalInput Indonesian comma', () {
    expect(parseDecimalInput('1.250,5'), '1250.5');
    expect(parseDecimalInput('0,0054'), '0.0054');
  });
  test('parseDecimalInput rejects invalid', () {
    expect(parseDecimalInput(''), isNull);
    expect(parseDecimalInput('1,2,3'), isNull);
  });
  test('escapeIlike escapes wildcards', () {
    expect(escapeIlike('100%_x\\y'), r'100\%\_x\\y');
  });
}

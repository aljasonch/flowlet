import 'package:decimal/decimal.dart';
import 'package:intl/intl.dart';

final _idr = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
final _usd2 = NumberFormat.currency(locale: 'en_US', symbol: r'$', decimalDigits: 2);
final _usInt = NumberFormat.decimalPattern('en_US');
final _idInt = NumberFormat.decimalPattern('id_ID');

String formatIDR(int amount) => _idr.format(amount);
String formatIDRNullable(int? amount) => amount == null ? '-' : _idr.format(amount);

String formatQuantity(String quantity) {
  final d = Decimal.parse(quantity);
  return d.toStringAsFixed(8).replaceFirst(RegExp(r'\.?0+$'), '');
}

String formatPercent(String percent) {
  final d = Decimal.parse(percent);
  final sign = d >= Decimal.zero ? '+' : '';
  return '$sign${d.toStringAsFixed(2)}%';
}

String formatPrice(String amount, String currency, [int maxDecimals = 8]) {
  final d = Decimal.parse(amount);
  final fixed = d.toStringAsFixed(maxDecimals).replaceFirst(RegExp(r'\.?0+$'), '');
  final parts = fixed.split('.');
  final dec = parts.length > 1 ? parts[1] : '';
  if (currency == 'USD') {
    final head = _usInt.format(int.parse(parts[0]));
    if (dec.length > 2) return '\$$head.$dec';
    return _usd2.format(double.parse(d.toStringAsFixed(2)));
  }
  final head = _idInt.format(int.parse(parts[0]));
  if (dec.isNotEmpty) return 'Rp $head,$dec';
  return 'Rp $head';
}

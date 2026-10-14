bool isPriceStale(String priceSource, String? priceAsOf, {DateTime? now}) {
  if (priceAsOf == null) return true;
  final asOf = DateTime.tryParse(priceAsOf);
  if (asOf == null) return true;
  final diffHours = (now ?? DateTime.now()).difference(asOf).inMinutes / 60.0;
  if (priceSource == 'manual') return diffHours > 30 * 24;
  return diffHours > 24;
}

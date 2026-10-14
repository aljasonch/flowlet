const maxAmount = 9999999999999;

int parseAmountInput(String input) {
  if (input.isEmpty) return 0;
  final digits = input.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return 0;
  final parsed = int.tryParse(digits) ?? 0;
  return parsed > maxAmount ? maxAmount : parsed;
}

String? parseDecimalInput(String input) {
  final trimmed = input.trim();
  if (trimmed.isEmpty) return null;
  final noDots = trimmed.replaceAll('.', '');
  if (RegExp(',').allMatches(noDots).length > 1) return null;
  final normalized = noDots.replaceFirst(',', '.');
  if (!RegExp(r'^\d+(\.\d+)?$').hasMatch(normalized)) return null;
  return normalized;
}

String escapeIlike(String input) =>
    input.replaceAllMapped(RegExp(r'[%_\\]'), (m) => '\\${m[0]}');

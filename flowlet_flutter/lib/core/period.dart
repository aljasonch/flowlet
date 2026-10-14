class PeriodLabel {
  final int year;
  final int month;
  const PeriodLabel(this.year, this.month);
  @override
  bool operator ==(Object other) =>
      other is PeriodLabel && other.year == year && other.month == month;
  @override
  int get hashCode => Object.hash(year, month);
}

bool isLeapYear(int year) =>
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

int daysInMonth(int year, int month) {
  if (month == 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].contains(month)) return 30;
  return 31;
}

String _fmt(int y, int m, int d) =>
    '${y.toString().padLeft(4, '0')}-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';

String periodStart(int year, int month, int startDay) {
  final clamped = startDay < daysInMonth(year, month) ? startDay : daysInMonth(year, month);
  return _fmt(year, month, clamped);
}

String periodEnd(int year, int month, int startDay) {
  final ny = month == 12 ? year + 1 : year;
  final nm = month == 12 ? 1 : month + 1;
  final nextStart = startDay < daysInMonth(ny, nm) ? startDay : daysInMonth(ny, nm);
  if (nextStart > 1) return _fmt(ny, nm, nextStart - 1);
  return _fmt(year, month, daysInMonth(year, month));
}

PeriodLabel getCurrentPeriod(String today, int startDay) {
  final year = int.parse(today.substring(0, 4));
  final month = int.parse(today.substring(5, 7));
  final start = periodStart(year, month, startDay);
  if (today.compareTo(start) < 0) {
    if (month == 1) return PeriodLabel(year - 1, 12);
    return PeriodLabel(year, month - 1);
  }
  return PeriodLabel(year, month);
}

PeriodLabel getAdjacentPeriod(int year, int month, int offset) {
  var m = month + offset;
  var y = year;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return PeriodLabel(y, m);
}

String formatPeriodRange(String start, String end) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  String one(String s) {
    final y = int.parse(s.substring(0, 4));
    final m = int.parse(s.substring(5, 7));
    final d = int.parse(s.substring(8, 10));
    return '$d ${months[m - 1]} $y';
  }
  return '${one(start)} – ${one(end)}';
}

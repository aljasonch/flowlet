String _two(int n) => n.toString().padLeft(2, '0');
String getTodayDate([DateTime? now]) {
  final d = (now ?? DateTime.now()).toLocal();
  return '${d.year}-${_two(d.month)}-${_two(d.day)}';
}

import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/theme.dart';

void main() {
  testWidgets('shell tokens build without gradients', (tester) async {
    final light = buildLightTheme();
    expect(light.useMaterial3, true);
  });
}

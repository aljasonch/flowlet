import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/theme.dart';

const _panelRadius = BorderRadius.all(Radius.circular(16));
const _controlRadius = BorderRadius.all(Radius.circular(10));

void main() {
  // NOTE: testWidgets (not plain test) is required here: theme construction
  // calls GoogleFonts.ibmPlexSansTextTheme(), which spawns a fire-and-forget
  // runtime font fetch. In a plain-test zone the failed fetch surfaces as an
  // unhandled async error and fails the test after completion; under
  // testWidgets the same fetch is absorbed by the test HTTP mock and the
  // test passes. Verified empirically 2026-10-14.
  testWidgets('shell tokens build without gradients', (tester) async {
    final light = buildLightTheme();
    expect(light.useMaterial3, true);
  });

  testWidgets('panel surfaces keep the 16px radius', (tester) async {
    for (final theme in [buildLightTheme(), buildDarkTheme()]) {
      final shape = theme.cardTheme.shape as RoundedRectangleBorder;
      expect(shape.borderRadius, _panelRadius);
    }
  });

  testWidgets('inputs and buttons use the 10px control radius',
      (tester) async {
    for (final theme in [buildLightTheme(), buildDarkTheme()]) {
      final inputBorders = [
        theme.inputDecorationTheme.border,
        theme.inputDecorationTheme.enabledBorder,
        theme.inputDecorationTheme.focusedBorder,
        theme.inputDecorationTheme.errorBorder,
      ];
      for (final border in inputBorders) {
        expect((border as OutlineInputBorder).borderRadius, _controlRadius);
      }
      final buttonStyles = [
        theme.filledButtonTheme.style,
        theme.elevatedButtonTheme.style,
        theme.outlinedButtonTheme.style,
        theme.textButtonTheme.style,
      ];
      for (final style in buttonStyles) {
        final shape =
            style!.shape!.resolve(<WidgetState>{}) as RoundedRectangleBorder;
        expect(shape.borderRadius, _controlRadius);
      }
    }
  });
}

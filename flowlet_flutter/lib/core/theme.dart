import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Panel radius (cards, dialogs, sheets).
const _panelRadius = BorderRadius.all(Radius.circular(16));

/// Control radius (inputs, buttons). Mirrors the web `--radius-control`.
const _controlRadius = BorderRadius.all(Radius.circular(10));

ThemeData _base(Brightness b) {
  final scheme = b == Brightness.light
      ? const ColorScheme.light(primary: Color(0xFF1F5FBF))
      : const ColorScheme.dark(primary: Color(0xFF7FB0F5));
  const controlShape =
      RoundedRectangleBorder(borderRadius: _controlRadius);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    textTheme: GoogleFonts.ibmPlexSansTextTheme(),
    cardTheme: const CardThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: _panelRadius,
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: _controlRadius),
      enabledBorder: OutlineInputBorder(borderRadius: _controlRadius),
      focusedBorder: OutlineInputBorder(borderRadius: _controlRadius),
      errorBorder: OutlineInputBorder(borderRadius: _controlRadius),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(shape: controlShape),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(shape: controlShape),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(shape: controlShape),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(shape: controlShape),
    ),
  );
}

ThemeData buildLightTheme() => _base(Brightness.light);
ThemeData buildDarkTheme() => _base(Brightness.dark);

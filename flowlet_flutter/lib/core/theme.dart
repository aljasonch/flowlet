import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData _base(Brightness b) {
  final scheme = b == Brightness.light
      ? const ColorScheme.light(primary: Color(0xFF1F5FBF))
      : const ColorScheme.dark(primary: Color(0xFF7FB0F5));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    textTheme: GoogleFonts.ibmPlexSansTextTheme(),
    cardTheme: const CardThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
    ),
  );
}

ThemeData buildLightTheme() => _base(Brightness.light);
ThemeData buildDarkTheme() => _base(Brightness.dark);

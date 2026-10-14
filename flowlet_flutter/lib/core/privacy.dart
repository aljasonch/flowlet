import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

const privacyKey = 'hide_financial_numbers';
final ValueNotifier<bool> privacyMode = ValueNotifier(false);

Future<void> loadPrivacy() async {
  final prefs = await SharedPreferences.getInstance();
  privacyMode.value = prefs.getBool(privacyKey) ?? false;
}

Future<void> setPrivacy(bool value) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(privacyKey, value);
  privacyMode.value = value;
}

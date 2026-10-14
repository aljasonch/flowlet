import 'package:flutter/material.dart';
import 'package:flowlet_flutter/core/router.dart';
import 'package:flowlet_flutter/core/supabase_client.dart';
import 'package:flowlet_flutter/core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL');
  const anonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  if (url.isNotEmpty && anonKey.isNotEmpty) {
    await initSupabase(url: url, anonKey: anonKey);
  }
  runApp(const FlowletApp());
}

class FlowletApp extends StatelessWidget {
  const FlowletApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Flowlet',
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      routerConfig: buildRouter(),
    );
  }
}

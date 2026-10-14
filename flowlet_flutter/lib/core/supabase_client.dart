import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> initSupabase({required String url, required String anonKey}) {
  // ignore: deprecated_member_use
  return Supabase.initialize(url: url, anonKey: anonKey);
}

SupabaseClient get db => Supabase.instance.client;

Future<String?> currentAccessToken() async {
  final session = Supabase.instance.client.auth.currentSession;
  return session?.accessToken;
}

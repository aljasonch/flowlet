import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/features/auth/login_screen.dart';
import 'package:flowlet_flutter/features/dashboard/dashboard_screen.dart';
import 'package:flowlet_flutter/features/shared/app_shell.dart';

GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final loggingIn = state.matchedLocation == '/login';
      if (session == null && !loggingIn) return '/login';
      if (session != null && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      ShellRoute(
        builder: (c, s, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (c, s) => const DashboardScreen()),
          GoRoute(path: '/transactions', builder: (c, s) => const TxPlaceholder()),
          GoRoute(path: '/portfolio', builder: (c, s) => const PortfolioPlaceholder()),
          GoRoute(path: '/debts', builder: (c, s) => const DebtsPlaceholder()),
          GoRoute(path: '/settings', builder: (c, s) => const SettingsPlaceholder()),
        ],
      ),
    ],
  );
}

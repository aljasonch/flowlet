import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/features/auth/login_screen.dart';
import 'package:flowlet_flutter/features/dashboard/dashboard_screen.dart';
import 'package:flowlet_flutter/features/shared/app_shell.dart';
import 'package:flowlet_flutter/features/transactions/tx_form_screen.dart';
import 'package:flowlet_flutter/features/transactions/tx_list_screen.dart';

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
          GoRoute(
            path: '/transactions',
            builder: (c, s) => const TxListScreen(),
            routes: [
              GoRoute(
                path: 'new',
                builder: (c, s) => const TxFormScreen(),
              ),
              GoRoute(
                path: ':id/edit',
                builder: (c, s) => TxFormScreen(
                  transactionId: s.pathParameters['id'],
                ),
              ),
            ],
          ),
          GoRoute(path: '/portfolio', builder: (c, s) => const PortfolioPlaceholder()),
          GoRoute(path: '/debts', builder: (c, s) => const DebtsPlaceholder()),
          GoRoute(path: '/settings', builder: (c, s) => const SettingsPlaceholder()),
        ],
      ),
    ],
  );
}

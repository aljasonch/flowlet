import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flowlet_flutter/features/auth/login_screen.dart';
import 'package:flowlet_flutter/features/dashboard/dashboard_screen.dart';
import 'package:flowlet_flutter/features/debts/debts_screen.dart';
import 'package:flowlet_flutter/features/shared/app_shell.dart';
import 'package:flowlet_flutter/features/portfolio/portfolio_screen.dart';
import 'package:flowlet_flutter/features/settings/settings_screen.dart';
import 'package:flowlet_flutter/features/transactions/tx_form_screen.dart';
import 'package:flowlet_flutter/features/transactions/tx_list_screen.dart';

/// Notifies the router on Supabase auth changes so post-login redirects
/// fire without manual navigation. The subscription is lazy: [ensureSubscribed]
/// runs on the first redirect evaluation, so constructing the router never
/// touches `Supabase.instance` (tests and key-less boots stay crash-free).
/// Pass [events] in tests to avoid the real auth stream.
class SupabaseAuthListenable extends ChangeNotifier {
  SupabaseAuthListenable({this._events});

  final Stream<dynamic>? _events;
  StreamSubscription<dynamic>? _sub;
  bool _subscribed = false;

  @visibleForTesting
  bool get isSubscribed => _subscribed;

  void ensureSubscribed() {
    if (_subscribed) return;
    _subscribed = true;
    final stream = _events ?? Supabase.instance.client.auth.onAuthStateChange;
    _sub = stream.listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

GoRouter buildRouter({Listenable? refreshListenable}) {
  final authRefresh =
      refreshListenable == null ? SupabaseAuthListenable() : null;
  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshListenable ?? authRefresh,
    redirect: (context, state) {
      authRefresh?.ensureSubscribed();
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
          GoRoute(path: '/portfolio', builder: (c, s) => const PortfolioScreen()),
          GoRoute(path: '/debts', builder: (c, s) => const DebtsScreen()),
          GoRoute(path: '/settings', builder: (c, s) => const SettingsScreen()),
        ],
      ),
    ],
  );
}

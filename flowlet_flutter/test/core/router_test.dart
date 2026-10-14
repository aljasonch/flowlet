import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flowlet_flutter/core/router.dart';
import 'package:flowlet_flutter/features/auth/login_screen.dart';
import 'package:flowlet_flutter/main.dart';

void main() {
  test('auth listenable notifies on auth events', () async {
    final events = StreamController<dynamic>.broadcast();
    final listenable = SupabaseAuthListenable(events: events.stream);
    var notified = 0;
    listenable.addListener(() => notified++);
    expect(listenable.isSubscribed, isFalse);
    listenable.ensureSubscribed();
    expect(listenable.isSubscribed, isTrue);
    events.add(null);
    await Future<void>.delayed(Duration.zero);
    expect(notified, 1);
    listenable.ensureSubscribed();
    events.add(null);
    await Future<void>.delayed(Duration.zero);
    expect(notified, 2);
    listenable.dispose();
    await events.close();
  });

  test('buildRouter honors an injected refreshListenable', () {
    final injected = ChangeNotifier();
    final router = buildRouter(refreshListenable: injected);
    expect(router, isNotNull);
    injected.dispose();
    router.dispose();
  });

  test('buildRouter constructs without a Supabase session', () {
    final router = buildRouter(refreshListenable: ChangeNotifier());
    expect(router, isNotNull);
    router.dispose();
  });

  testWidgets('key-less boot lands on login without throwing', (tester) async {
    // No Supabase.initialize: mirrors lib/main.dart when the SUPABASE_URL /
    // SUPABASE_ANON_KEY defines are absent. Router construction plus redirect
    // evaluation must not touch Supabase.instance in a throwing way.
    await tester.pumpWidget(const FlowletApp());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}

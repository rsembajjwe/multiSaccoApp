import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'core/auth_events.dart';
import 'core/theme.dart';
import 'features/auth/lock_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/loans/loans_screen.dart';
import 'features/messages/messages_screen.dart';
import 'features/payments/payments_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/shell/home_shell.dart';
import 'providers.dart';

class SaccoMemberApp extends ConsumerStatefulWidget {
  const SaccoMemberApp({super.key});

  @override
  ConsumerState<SaccoMemberApp> createState() => _SaccoMemberAppState();
}

class _SaccoMemberAppState extends ConsumerState<SaccoMemberApp>
    with WidgetsBindingObserver {
  bool _wasBackgrounded = false;
  late final GoRouter _router = GoRouter(
    initialLocation: '/login',
    refreshListenable: sessionExpiredNotifier,
    redirect: (context, state) {
      if (sessionExpiredNotifier.value &&
          state.matchedLocation != '/login') {
        return '/login';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/home', builder: (_, __) => const HomeShell()),
      GoRoute(path: '/lock', builder: (_, __) => const LockScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
      GoRoute(path: '/loans', builder: (_, __) => const LoansScreen()),
      GoRoute(path: '/payments', builder: (_, __) => const PaymentsScreen()),
      GoRoute(path: '/messages', builder: (_, __) => const MessagesScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initPush();
  }

  Future<void> _initPush() async {
    try {
      final push = ref.read(pushServiceProvider);
      await push.requestPermission();
      final id = await ref.read(sessionStoreProvider).readMemberId();
      if (id != null && id.isNotEmpty) await push.subscribeMember(id);
      FirebaseMessaging.onMessage.listen((_) {
        ref.invalidate(notificationsProvider);
        ref.invalidate(dashboardProvider);
      });
    } catch (_) {
      // Push not configured — app works without it.
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _wasBackgrounded = true;
    } else if (state == AppLifecycleState.resumed && _wasBackgrounded) {
      _wasBackgrounded = false;
      _maybeLock();
    }
  }

  Future<void> _maybeLock() async {
    if (appLockedNotifier.value) return;
    final store = ref.read(sessionStoreProvider);
    final token = await store.readToken();
    if (token == null) return;
    final enabled = await store.biometricLockEnabled();
    if (!enabled) return;
    appLockedNotifier.value = true;
    _router.go('/lock');
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Tereka',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: _router,
    );
  }
}

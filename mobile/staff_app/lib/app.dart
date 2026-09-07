import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'core/auth_events.dart';
import 'core/theme.dart';
import 'features/auth/lock_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'providers.dart';

class SaccoStaffApp extends ConsumerStatefulWidget {
  const SaccoStaffApp({super.key});

  @override
  ConsumerState<SaccoStaffApp> createState() => _SaccoStaffAppState();
}

class _SaccoStaffAppState extends ConsumerState<SaccoStaffApp>
    with WidgetsBindingObserver {
  bool _wasBackgrounded = false;

  late final GoRouter _router = GoRouter(
    initialLocation: '/login',
    refreshListenable: sessionExpiredNotifier,
    redirect: (context, state) {
      // Never mutate the refreshListenable here: doing so re-enters redirect
      // and cancels the navigation. The login screen resets the flag on arrival.
      if (sessionExpiredNotifier.value && state.matchedLocation != '/login') {
        return '/login';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, __) => const DashboardScreen()),
      GoRoute(path: '/lock', builder: (_, __) => const LockScreen()),
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
      final code = await ref.read(sessionStoreProvider).readSacco();
      if (code != null && code.isNotEmpty) await push.subscribeStaff(code);
      FirebaseMessaging.onMessage.listen((_) {
        ref.invalidate(saccoStatusProvider);
      });
    } catch (_) {
      // Push not configured — the app works without it.
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
    if (!await store.biometricLockEnabled()) return;
    appLockedNotifier.value = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _router.go('/lock');
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SACCO Administrator',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeProvider),
      routerConfig: _router,
    );
  }
}

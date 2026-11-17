import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';
import 'models.dart';
import 'providers.dart';
import 'screens/login_screen.dart';
import 'screens/platform_shell.dart';
import 'theme.dart';

final authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<PlatformSession?>>((ref) {
      return AuthController(ref.watch(authRepositoryProvider));
    });

class AuthController extends StateNotifier<AsyncValue<PlatformSession?>> {
  AuthController(this._repository) : super(const AsyncLoading()) {
    restore();
  }

  final AuthRepository _repository;

  Future<void> restore() async {
    if (!await _repository.hasSession()) {
      state = const AsyncData(null);
      return;
    }
    try {
      state = AsyncData(await _repository.me());
    } catch (error, trace) {
      state = AsyncError(error, trace);
      await _repository.logout();
      state = const AsyncData(null);
    }
  }

  Future<LoginResult> login(String username, String password) async {
    final result = await _repository.login(
      username: username,
      password: password,
    );
    if (result.session != null) state = AsyncData(result.session);
    return result;
  }

  Future<void> completePasswordChange(
    String username,
    String temporaryPassword,
    String newPassword,
  ) => _repository.changeTemporaryPassword(
    username: username,
    temporaryPassword: temporaryPassword,
    newPassword: newPassword,
  );

  Future<void> verifyMfa(String challengeId, String code) async {
    state = AsyncData(
      await _repository.verifyMfa(challengeId: challengeId, code: code),
    );
  }

  Future<void> updateContact(String email, String phone) async {
    state = AsyncData(
      await _repository.updateContact(email: email, phone: phone),
    );
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AsyncData(null);
  }
}

class TerekaProprietorApp extends ConsumerWidget {
  const TerekaProprietorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    return MaterialApp(
      title: 'Tereka Proprietor',
      debugShowCheckedModeBanner: false,
      theme: ProprietorTheme.light(),
      home: auth.when(
        loading: () => const _SplashScreen(),
        error: (error, _) => LoginScreen(initialError: '$error'),
        data: (session) => session == null
            ? const LoginScreen()
            : PlatformShell(session: session),
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: ProprietorTheme.navy,
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.account_balance_rounded,
            color: ProprietorTheme.gold,
            size: 64,
          ),
          SizedBox(height: 18),
          Text(
            'TEREKA',
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w900,
              letterSpacing: 4,
            ),
          ),
          SizedBox(height: 20),
          CircularProgressIndicator(color: ProprietorTheme.gold),
        ],
      ),
    ),
  );
}

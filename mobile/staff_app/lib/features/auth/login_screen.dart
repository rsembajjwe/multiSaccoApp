import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth_events.dart';
import '../../core/config.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _sacco =
      TextEditingController(text: AppConfig.isProduction ? '' : 'GREE');
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;
  MfaChallenge? _mfa;

  @override
  void initState() {
    super.initState();
    // Everything that could notify the router (the refreshListenable) or
    // navigate must run AFTER this frame, never synchronously during
    // initState/build, or GoRouter markNeedsBuild()s while the tree is still
    // building. Reaching the login screen means any prior session is over, so
    // we clear the expiry flag here (safe post-frame; the router's redirect
    // already ignores the flag while on /login, so there is no loop), then
    // skip ahead only if a token is actually stored (re-validated by /auth/me
    // on the dashboard).
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      sessionExpiredNotifier.value = false;
      final has = await ref.read(authRepositoryProvider).hasSession();
      if (!has || !mounted) return;
      final locked =
          await ref.read(sessionStoreProvider).biometricLockEnabled();
      if (!mounted) return;
      context.go(locked ? '/lock' : '/home');
    });
  }

  @override
  void dispose() {
    _sacco.dispose();
    _username.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final outcome = await ref.read(authRepositoryProvider).login(
            saccoCode: _sacco.text.trim(),
            username: _username.text.trim(),
            password: _password.text,
          );
      if (!mounted) return;
      if (outcome.needsMfa) {
        setState(() => _mfa = outcome.mfa);
      } else {
        ref.invalidate(sessionProvider);
        ref.invalidate(saccoStatusProvider);
        context.go('/home');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_code.text.trim().isEmpty) {
      setState(() => _error = 'Enter the verification code.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).verifyMfa(
            challengeId: _mfa!.challengeId,
            code: _code.text.trim(),
            saccoCode: _sacco.text.trim(),
          );
      if (mounted) {
        ref.invalidate(sessionProvider);
        ref.invalidate(saccoStatusProvider);
        context.go('/home');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: scheme.primaryContainer,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Image.asset(
                        'assets/icon/splash_logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Icon(
                            Icons.admin_panel_settings,
                            size: 40,
                            color: scheme.onPrimaryContainer),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('SACCO Administrator',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(_mfa == null ? 'Staff sign in' : 'Two-factor verification',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: scheme.onSurfaceVariant)),
                  const SizedBox(height: 28),
                  if (_mfa == null) ...[
                    TextField(
                      controller: _sacco,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'SACCO code'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _username,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                          labelText: 'Username or email'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      obscureText: true,
                      onSubmitted: (_) => _submit(),
                      decoration: const InputDecoration(labelText: 'Password'),
                    ),
                  ] else ...[
                    Text(
                      'A code was sent via ${_mfa!.deliveryChannel.isEmpty ? 'your configured channel' : _mfa!.deliveryChannel}.'
                      '${!AppConfig.isProduction && _mfa!.demoCode.isNotEmpty ? ' Demo code: ${_mfa!.demoCode}' : ''}',
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _code,
                      keyboardType: TextInputType.number,
                      onSubmitted: (_) => _verify(),
                      decoration:
                          const InputDecoration(labelText: 'Verification code'),
                    ),
                  ],
                  const SizedBox(height: 10),
                  if (_error != null)
                    Text(_error!, style: TextStyle(color: scheme.error)),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : (_mfa == null ? _submit : _verify),
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(_mfa == null ? 'Sign in' : 'Verify'),
                  ),
                  if (_mfa != null)
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() {
                                _mfa = null;
                                _code.clear();
                                _error = null;
                              }),
                      child: const Text('Back'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

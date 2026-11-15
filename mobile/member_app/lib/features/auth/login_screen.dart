import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth_events.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'forgot_password_screen.dart';
import 'group_registration_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _sacco = TextEditingController(text: 'GREE');
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // If a session already exists, skip straight to the dashboard.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (sessionExpiredNotifier.value) return;
      final has = await ref.read(memberRepositoryProvider).hasSession();
      if (!has || !mounted) return;
      final locked =
          await ref.read(sessionStoreProvider).biometricLockEnabled() &&
              await ref.read(biometricServiceProvider).isSupported();
      if (locked) {
        if (mounted) context.go('/lock');
        return;
      }
      final subscription =
          await ref.read(memberRepositoryProvider).membership();
      if (mounted) context.go(_destination(subscription));
    });
  }

  @override
  void dispose() {
    _sacco.dispose();
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(memberRepositoryProvider).login(
            saccoCode: _sacco.text.trim(),
            identifier: _identifier.text.trim(),
            password: _password.text,
          );
      sessionExpiredNotifier.value = false;
      final subscription =
          await ref.read(memberRepositoryProvider).membership();
      if (mounted) context.go(_destination(subscription));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _destination(MemberSubscription? subscription) {
    final expiry = subscription?.expiry;
    final active = subscription?.status == 'active' &&
        expiry != null &&
        !expiry.isBefore(DateTime.now());
    return active ? '/home' : '/subscription';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Icon(Icons.account_balance,
                          size: 36,
                          color:
                              Theme.of(context).colorScheme.onPrimaryContainer),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('SACCO Member',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Sign in to your account',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 28),
                  TextField(
                    controller: _sacco,
                    textInputAction: TextInputAction.next,
                    decoration:
                        const InputDecoration(labelText: 'Organization code'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _identifier,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                        labelText: 'Email, phone or membership no.'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(labelText: 'Password'),
                  ),
                  const SizedBox(height: 8),
                  if (_error != null)
                    Text(_error!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error)),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Sign in'),
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ForgotPasswordScreen(
                                    saccoCode: _sacco.text.trim().isEmpty
                                        ? 'GREE'
                                        : _sacco.text.trim()),
                              ),
                            ),
                    child: const Text('Forgot password?'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const GroupRegistrationScreen(),
                              ),
                            ),
                    icon: const Icon(Icons.group_add_outlined),
                    label: const Text('Register an organization'),
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

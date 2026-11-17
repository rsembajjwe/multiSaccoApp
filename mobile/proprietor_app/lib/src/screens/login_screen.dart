import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api_client.dart';
import '../app.dart';
import '../config.dart';
import '../theme.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.initialError});
  final String? initialError;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController(text: 'rsembajjwe@gmail.com');
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _error = widget.initialError;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your platform email and password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .login(_email.text.trim(), _password.text);
      if (!mounted) return;
      if (result.passwordChange) {
        await _showPasswordChange();
      } else if (result.needsMfa) {
        await _showMfa(result.challengeId!);
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showPasswordChange() async {
    final next = TextEditingController();
    final confirm = TextEditingController();
    final changed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Secure your account'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Create a permanent password before continuing.'),
            const SizedBox(height: 16),
            TextField(
              controller: next,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirm,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm password'),
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () async {
              if (next.text.length < 12 || next.text != confirm.text) return;
              await ref
                  .read(authControllerProvider.notifier)
                  .completePasswordChange(
                    _email.text.trim(),
                    _password.text,
                    next.text,
                  );
              if (dialogContext.mounted) Navigator.pop(dialogContext, true);
            },
            child: const Text('Change password'),
          ),
        ],
      ),
    );
    next.dispose();
    confirm.dispose();
    if (changed == true) {
      _password.clear();
      setState(
        () => _error = 'Password changed. Sign in with your new password.',
      );
    }
  }

  Future<void> _showMfa(String challengeId) async {
    final code = TextEditingController();
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Additional verification'),
        content: TextField(
          controller: code,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Verification code'),
        ),
        actions: [
          FilledButton(
            onPressed: () async {
              try {
                await ref
                    .read(authControllerProvider.notifier)
                    .verifyMfa(challengeId, code.text);
                if (dialogContext.mounted) Navigator.pop(dialogContext);
              } on ApiException catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(error.message)));
                }
              }
            },
            child: const Text('Verify'),
          ),
        ],
      ),
    );
    code.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: ProprietorTheme.navy,
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                const Icon(
                  Icons.admin_panel_settings_rounded,
                  size: 72,
                  color: ProprietorTheme.gold,
                ),
                const SizedBox(height: 16),
                const Text(
                  'TEREKA PROPRIETOR',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Secure platform administration',
                  style: TextStyle(color: Colors.white70),
                ),
                const SizedBox(height: 6),
                Text(
                  AppConfig.apiBaseUrl.startsWith('https://globalntereka.com')
                      ? 'Connected to Tereka Online'
                      : 'Connected to ${AppConfig.apiBaseUrl}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: ProprietorTheme.gold,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 24),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      children: [
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Platform email',
                            prefixIcon: Icon(Icons.alternate_email),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _password,
                          obscureText: _obscure,
                          onSubmitted: (_) => _busy ? null : _login(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              tooltip: _obscure
                                  ? 'Show password'
                                  : 'Hide password',
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                            ),
                          ),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.red),
                          ),
                        ],
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _busy ? null : _login,
                            icon: _busy
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.login),
                            label: const Text('Sign in securely'),
                          ),
                        ),
                        TextButton(
                          onPressed: _busy
                              ? null
                              : () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ForgotPasswordScreen(
                                      identifier: _email.text.trim(),
                                    ),
                                  ),
                                ),
                          child: const Text('Forgot password?'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Restricted to authorised Tereka platform personnel.\nAll sensitive actions are audited.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white60, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

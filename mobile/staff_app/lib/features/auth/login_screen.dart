import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth_events.dart';
import '../../core/config.dart';
import '../../data/app_version_service.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'forgot_password_screen.dart';

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
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  bool _obscurePassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  String? _error;
  MfaChallenge? _mfa;
  FirstLoginRequirement? _firstLogin;

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
    _newPassword.dispose();
    _confirmPassword.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final policy = await ref.read(appVersionPolicyProvider.future);
      if (policy?.upgradeRequired == true) {
        if (mounted) {
          setState(() => _error = policy!.message.isEmpty
              ? 'Install the latest approved Staff app to continue.'
              : policy.message);
        }
        return;
      }
      final outcome = await ref.read(authRepositoryProvider).login(
            saccoCode: _sacco.text.trim(),
            username: _username.text.trim(),
            password: _password.text,
          );
      if (!mounted) return;
      if (outcome.needsMfa) {
        setState(() => _mfa = outcome.mfa);
      } else if (outcome.needsPasswordChange) {
        setState(() => _firstLogin = outcome.firstLogin);
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

  Future<void> _changePassword() async {
    if (_newPassword.text != _confirmPassword.text) {
      setState(() => _error = 'The new passwords do not match.');
      return;
    }
    if (_newPassword.text.length < 12) {
      setState(
          () => _error = 'Use a new password with at least 12 characters.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).completeFirstLogin(
            saccoCode: _sacco.text.trim(),
            username: _username.text.trim(),
            temporaryPassword: _password.text,
            newPassword: _newPassword.text,
          );
      if (!mounted) return;
      setState(() {
        _firstLogin = null;
        _password.clear();
        _newPassword.clear();
        _confirmPassword.clear();
        _error = 'Password changed. Sign in with your new password.';
      });
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
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
    final versionPolicy = ref.watch(appVersionPolicyProvider).asData?.value;
    if (versionPolicy?.upgradeRequired == true) {
      return _UpgradeRequiredScreen(
        policy: versionPolicy!,
        onRetry: () => ref.invalidate(appVersionPolicyProvider),
      );
    }
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
                  Text(
                      _firstLogin != null
                          ? 'Secure your account'
                          : _mfa == null
                              ? 'Staff sign in'
                              : 'Two-factor verification',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: scheme.onSurfaceVariant)),
                  if (versionPolicy?.updateAvailable == true) ...[
                    const SizedBox(height: 16),
                    _UpdateAvailableNotice(policy: versionPolicy!),
                  ],
                  const SizedBox(height: 28),
                  if (_firstLogin != null) ...[
                    Text(
                      'Your temporary password verified access to ${_firstLogin!.verificationChannel}. Choose a permanent password to continue.',
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _newPassword,
                      obscureText: _obscureNewPassword,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        labelText: 'New password',
                        suffixIcon: IconButton(
                          tooltip: _obscureNewPassword
                              ? 'Show new password'
                              : 'Hide new password',
                          onPressed: () => setState(
                              () => _obscureNewPassword = !_obscureNewPassword),
                          icon: Icon(
                            _obscureNewPassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _confirmPassword,
                      obscureText: _obscureConfirmPassword,
                      onSubmitted: (_) => _changePassword(),
                      decoration: InputDecoration(
                        labelText: 'Confirm new password',
                        suffixIcon: IconButton(
                          tooltip: _obscureConfirmPassword
                              ? 'Show confirm password'
                              : 'Hide confirm password',
                          onPressed: () => setState(() =>
                              _obscureConfirmPassword =
                                  !_obscureConfirmPassword),
                          icon: Icon(
                            _obscureConfirmPassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                    ),
                  ] else if (_mfa == null) ...[
                    TextField(
                      controller: _sacco,
                      textInputAction: TextInputAction.next,
                      decoration:
                          const InputDecoration(labelText: 'SACCO code'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _username,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email or phone number',
                        hintText: '+256 700 123456',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      obscureText: _obscurePassword,
                      onSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Show password'
                              : 'Hide password',
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
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
                    onPressed: _busy
                        ? null
                        : _firstLogin != null
                            ? _changePassword
                            : (_mfa == null ? _submit : _verify),
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(_firstLogin != null
                            ? 'Change password'
                            : _mfa == null
                                ? 'Sign in'
                                : 'Verify'),
                  ),
                  if (_mfa == null && _firstLogin == null)
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => Navigator.of(context).push(MaterialPageRoute(
                                builder: (_) => ForgotPasswordScreen(
                                  saccoCode: _sacco.text.trim(),
                                  identifier: _username.text.trim(),
                                ),
                              )),
                      child: const Text('Forgot password?'),
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

class _UpdateAvailableNotice extends StatelessWidget {
  const _UpdateAvailableNotice({required this.policy});

  final AppVersionPolicy policy;

  @override
  Widget build(BuildContext context) => Material(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              const Icon(Icons.system_update_alt),
              const SizedBox(width: 10),
              Expanded(
                child: Text(policy.message.isEmpty
                    ? 'A newer approved Staff app is available.'
                    : policy.message),
              ),
            ],
          ),
        ),
      );
}

class _UpgradeRequiredScreen extends StatelessWidget {
  const _UpgradeRequiredScreen({required this.policy, required this.onRetry});

  final AppVersionPolicy policy;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.system_update,
                        size: 72, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(height: 20),
                    Text('Staff app update required',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 12),
                    Text(
                      policy.message.isEmpty
                          ? 'Install the latest approved Staff app to continue.'
                          : policy.message,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Installed build ${policy.currentVersionCode} · Minimum build ${policy.minimumVersionCode}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                    if (policy.updateUrl.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      SelectableText(policy.updateUrl,
                          textAlign: TextAlign.center),
                    ],
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: onRetry,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Check again'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../providers.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.identifier = ''});
  final String identifier;

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  late final _identifier = TextEditingController(text: widget.identifier);
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String _channel = 'email';
  bool _requested = false;
  bool _busy = false;
  String? _error;
  String? _message;
  String? _destination;

  @override
  void dispose() {
    _identifier.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    if (_identifier.text.trim().isEmpty) {
      setState(() => _error = 'Enter your platform email or phone number.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final destination = await ref
          .read(authRepositoryProvider)
          .requestPasswordReset(
            identifier: _identifier.text,
            channel: _channel,
          );
      if (!mounted) return;
      setState(() {
        _requested = true;
        _destination = destination;
        _message = destination == null
            ? 'If the account exists, a reset code was sent by ${_channel == 'sms' ? 'SMS' : 'email'}.'
            : 'Reset code sent to your registered ${_channel == 'sms' ? 'phone number' : 'email'}: $destination';
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    if (_code.text.trim().length != 8 ||
        _password.text.length < 12 ||
        _password.text != _confirm.text) {
      setState(
        () => _error =
            'Enter the 8-character code and matching passwords of at least 12 characters.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .confirmPasswordReset(token: _code.text, newPassword: _password.text);
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password reset. Sign in with your new password.'),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Reset password')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(
            controller: _identifier,
            decoration: const InputDecoration(
              labelText: 'Platform email or phone',
              hintText: '+256 700 123456',
            ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'email', label: Text('Email (free)')),
              ButtonSegment(value: 'sms', label: Text('SMS')),
            ],
            selected: {_channel},
            onSelectionChanged: _busy
                ? null
                : (value) => setState(() {
                    _channel = value.first;
                    _destination = null;
                  }),
          ),
          if (_channel == 'sms')
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('SMS uses the main platform SMS account.'),
            ),
          if (_destination != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text('Registered destination: $_destination'),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _request,
            child: Text(_requested ? 'Resend reset code' : 'Send reset code'),
          ),
          if (_requested) ...[
            const Divider(height: 32),
            TextField(
              controller: _code,
              maxLength: 8,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp('[a-zA-Z0-9]')),
              ],
              decoration: const InputDecoration(
                labelText: '8-character reset code',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirm,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm new password',
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _reset,
              child: const Text('Reset password'),
            ),
          ],
          if (_message != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _message!,
                style: TextStyle(color: Theme.of(context).colorScheme.primary),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
        ],
      ),
    ),
  );
}

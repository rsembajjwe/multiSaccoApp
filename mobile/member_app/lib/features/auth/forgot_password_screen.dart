import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.saccoCode = 'GREE'});
  final String saccoCode;

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  late final TextEditingController _sacco =
      TextEditingController(text: widget.saccoCode);
  final TextEditingController _identifier = TextEditingController();
  final TextEditingController _token = TextEditingController();
  final TextEditingController _newPassword = TextEditingController();
  String _channel = 'sms';
  bool _sent = false;
  bool _busy = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _sacco.dispose();
    _identifier.dispose();
    _token.dispose();
    _newPassword.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    if (_identifier.text.trim().isEmpty) {
      setState(() => _error = 'Enter your email, phone or membership number.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      await ref.read(memberRepositoryProvider).requestPasswordReset(
            saccoCode: _sacco.text.trim(),
            identifier: _identifier.text.trim(),
            channel: _channel,
          );
      if (!mounted) return;
      setState(() {
        _sent = true;
        _info =
            'If the account exists, a reset code was sent by ${_channel == 'sms' ? 'SMS' : 'email'}. Enter it below.';
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    if (_token.text.trim().isEmpty || _newPassword.text.isEmpty) {
      setState(() => _error = 'Enter the reset code and a new password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(memberRepositoryProvider).confirmPasswordReset(
            token: _token.text.trim(),
            newPassword: _newPassword.text,
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated. Please sign in.')),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _sacco,
                decoration:
                    const InputDecoration(labelText: 'Organization code'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _identifier,
                decoration: const InputDecoration(
                    labelText: 'Email, phone or membership no.'),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'sms', label: Text('SMS')),
                  ButtonSegment(value: 'email', label: Text('Email')),
                ],
                selected: {_channel},
                onSelectionChanged: (s) => setState(() => _channel = s.first),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _busy ? null : _request,
                child: Text(_sent ? 'Resend code' : 'Send reset code'),
              ),
              if (_sent) ...[
                const Divider(height: 32),
                TextField(
                  controller: _token,
                  decoration: const InputDecoration(labelText: 'Reset code'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _newPassword,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _busy ? null : _confirm,
                  child: const Text('Update password'),
                ),
              ],
              const SizedBox(height: 12),
              if (_info != null)
                Text(_info!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.primary)),
              if (_error != null)
                Text(_error!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error)),
            ],
          ),
        ),
      ),
    );
  }
}

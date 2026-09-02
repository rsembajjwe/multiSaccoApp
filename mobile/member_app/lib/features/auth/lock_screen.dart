import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth_events.dart';
import '../../providers.dart';

class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    appLockedNotifier.value = true;
    WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
  }

  Future<void> _unlock() async {
    if (_busy) return;
    setState(() => _busy = true);
    final ok = await ref.read(biometricServiceProvider).authenticate();
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      appLockedNotifier.value = false;
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline, size: 64),
            const SizedBox(height: 16),
            Text('Locked', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _busy ? null : _unlock,
              icon: const Icon(Icons.fingerprint),
              label: const Text('Unlock'),
            ),
            TextButton(
              onPressed: () async {
                appLockedNotifier.value = false;
                await ref.read(memberRepositoryProvider).logout();
                if (context.mounted) context.go('/login');
              },
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}

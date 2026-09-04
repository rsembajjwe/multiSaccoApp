import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../domain/models.dart';
import '../../providers.dart';

/// Account & security: profile, biometric app lock, and sign out.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(sessionProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          sessionAsync.maybeWhen(
            data: (s) => _ProfileCard(session: s),
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),
          Text('Security', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          const _BiometricToggle(),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout, color: Color(0xFFB91C1C)),
              title: const Text('Sign out'),
              onTap: () async {
                await ref.read(authRepositoryProvider).logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text('SACCO Administrator · v0.1.0',
                style: Theme.of(context).textTheme.bodySmall),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.session});
  final StaffSession session;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: scheme.primaryContainer,
                  child: Icon(Icons.person_outline,
                      color: scheme.onPrimaryContainer),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          session.userName.isEmpty
                              ? 'Administrator'
                              : session.userName,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800)),
                      if (session.saccoName.isNotEmpty)
                        Text(session.saccoName,
                            style: TextStyle(
                                fontSize: 12, color: scheme.onSurfaceVariant)),
                      if (session.email.isNotEmpty)
                        Text(session.email,
                            style: TextStyle(
                                fontSize: 12, color: scheme.onSurfaceVariant)),
                    ],
                  ),
                ),
              ],
            ),
            if (session.roleNames.isNotEmpty) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children:
                    session.roleNames.map((r) => Chip(label: Text(r))).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BiometricToggle extends ConsumerWidget {
  const _BiometricToggle();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supportedAsync = ref.watch(biometricSupportedProvider);
    final enabledAsync = ref.watch(biometricLockProvider);
    final supported = supportedAsync.asData?.value ?? false;
    final enabled = enabledAsync.asData?.value ?? false;
    return Card(
      child: SwitchListTile(
        secondary: const Icon(Icons.fingerprint),
        title: const Text('Biometric app lock'),
        subtitle: Text(supported
            ? 'Require fingerprint or face to reopen the app.'
            : 'Not available on this device.'),
        value: enabled && supported,
        onChanged: supported
            ? (v) async {
                await ref.read(sessionStoreProvider).setBiometricLock(v);
                ref.invalidate(biometricLockProvider);
              }
            : null,
      ),
    );
  }
}

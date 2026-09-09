import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/widgets/confirm_action.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import '../funds/fund_sources_screen.dart';
import '../subscription/subscriptions_hub_screen.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(sessionProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: sessionAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Could not load settings: $e'),
              ),
            ),
          ],
        ),
        data: (session) => _SettingsBody(session: session),
      ),
    );
  }
}

class _SettingsBody extends ConsumerWidget {
  const _SettingsBody({required this.session});
  final StaffSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canManageProfile =
        session.can('sacco-profile:manage') || session.can('tenants:manage');
    final canManageFunds = session.can('fund-types:manage');
    final canManageTerms = session.can('loans:terms');
    final canPaySubscription = session.can('subscriptions:manage');
    final canManageMemberSubscriptions = session.can('member-subscription:manage');
    final canPromptMemberSubscriptions = canManageMemberSubscriptions ||
        session.can('member-subscription:prompt');
    final profileAsync = session.tenantId.isEmpty
        ? null
        : ref.watch(saccoProfileProvider(session.tenantId));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _ProfileCard(session: session, profileAsync: profileAsync),
        const SizedBox(height: 16),
        _AccessSummaryCard(session: session),
        const SizedBox(height: 16),
        Text('SACCO controls', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        _SettingsTile(
          icon: Icons.percent,
          title: 'Loan interest rate',
          subtitle: profileAsync?.maybeWhen(
                data: (p) => '${p.loanInterestRate.toStringAsFixed(2)}% monthly default',
                orElse: () => 'Set default rate for new loans and top-ups',
              ) ??
              'Set default rate for new loans and top-ups',
          enabled: canManageTerms && session.tenantId.isNotEmpty,
          onTap: () => _showInterestDialog(context, ref, session, profileAsync),
        ),
        _SettingsTile(
          icon: Icons.account_balance_wallet_outlined,
          title: 'Fund sources',
          subtitle: 'Savings, shares, welfare and custom funds',
          enabled: canManageFunds,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => FundSourcesScreen(canManage: canManageFunds),
          )),
        ),
        _SettingsTile(
          icon: Icons.workspace_premium_outlined,
          title: 'Subscriptions',
          subtitle: 'Platform subscription, member dues and SMS credits',
          enabled: session.can('subscriptions:view') ||
              session.can('member-subscription:view') ||
              session.can('notifications:manage'),
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => SubscriptionsHubScreen(
              canViewSubscription: session.can('subscriptions:view'),
              canPaySubscription: canPaySubscription,
              canViewMemberSubscriptions:
                  session.can('member-subscription:view'),
              canManageMemberSubscriptions: canManageMemberSubscriptions,
              canPromptMemberSubscriptions: canPromptMemberSubscriptions,
              canManageNotifications: session.can('notifications:manage'),
            ),
          )),
        ),
        _SettingsTile(
          icon: Icons.image_outlined,
          title: 'SACCO logo',
          subtitle: 'Upload or replace the SACCO logo',
          enabled: canManageProfile && session.tenantId.isNotEmpty,
          onTap: () => _pickLogo(context, ref, session),
        ),
        const SizedBox(height: 24),
        Text('Appearance', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        const _ThemeModeControl(),
        const SizedBox(height: 24),
        Text('Security', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        const _BiometricToggle(),
        const SizedBox(height: 24),
        Card(
          child: ListTile(
            leading: const Icon(Icons.logout, color: Color(0xFFB91C1C)),
            title: const Text('Sign out'),
            onTap: () async {
              final confirmed = await confirmAction(
                context,
                title: 'Sign out?',
                message:
                    'You will need to enter your SACCO code, username, and password again.',
                confirmLabel: 'Sign out',
                icon: Icons.logout,
              );
              if (!confirmed || !context.mounted) return;
              await ref.read(authRepositoryProvider).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text('SACCO Administrator - v0.1.0',
              style: Theme.of(context).textTheme.bodySmall),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Future<void> _showInterestDialog(
    BuildContext context,
    WidgetRef ref,
    StaffSession session,
    AsyncValue<SaccoProfile>? profileAsync,
  ) async {
    final current = profileAsync?.asData?.value.loanInterestRate;
    final value = await showDialog<num>(
      context: context,
      builder: (_) => _InterestRateDialog(initialRate: current),
    );
    if (value == null) return;
    if (value < 0 || value > 100) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Interest rate must be between 0 and 100 percent.')));
      }
      return;
    }
    try {
      await ref
          .read(adminRepositoryProvider)
          .updateSaccoProfile(session.tenantId, loanInterestRate: value);
      ref.invalidate(saccoProfileProvider(session.tenantId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Loan interest rate updated.')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _pickLogo(
      BuildContext context, WidgetRef ref, StaffSession session) async {
    final image = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 82,
    );
    if (image == null) return;
    final bytes = await image.readAsBytes();
    if (bytes.length > 512 * 1024) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Choose a logo under 512 KB.')));
      }
      return;
    }
    final mime = _mimeFor(image.name);
    final dataUrl = 'data:$mime;base64,${base64Encode(bytes)}';
    if (!context.mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Update SACCO logo?',
      message:
          'Replace the logo shown to staff and members for ${session.saccoName}.',
      confirmLabel: 'Update logo',
      icon: Icons.image_outlined,
    );
    if (!confirmed || !context.mounted) return;
    try {
      await ref
          .read(adminRepositoryProvider)
          .updateSaccoProfile(session.tenantId, logoDataUrl: dataUrl);
      ref.invalidate(saccoProfileProvider(session.tenantId));
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('SACCO logo updated.')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  String _mimeFor(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/png';
  }
}

class _InterestRateDialog extends StatefulWidget {
  const _InterestRateDialog({required this.initialRate});

  final num? initialRate;

  @override
  State<_InterestRateDialog> createState() => _InterestRateDialogState();
}

class _InterestRateDialogState extends State<_InterestRateDialog> {
  late final TextEditingController _controller;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final rate = widget.initialRate;
    _controller = TextEditingController(
        text: rate == null || rate == 0 ? '' : rate.toStringAsFixed(2));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    final parsed = num.tryParse(_controller.text.trim().replaceAll(',', ''));
    Navigator.of(context).pop(parsed);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Loan interest rate'),
      content: Form(
        key: _formKey,
        child: TextFormField(
          controller: _controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Monthly rate (%)',
            prefixIcon: Icon(Icons.percent),
          ),
          validator: (v) {
            final parsed =
                num.tryParse((v ?? '').trim().replaceAll(',', ''));
            return parsed == null || parsed < 0 || parsed > 100
                ? 'Enter a rate from 0 to 100.'
                : null;
          },
          onFieldSubmitted: (_) => _save(),
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: _save,
          child: const Text('Save'),
        ),
      ],
    );
  }
}

class _AccessSummaryCard extends StatelessWidget {
  const _AccessSummaryCard({required this.session});
  final StaffSession session;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final functions = _accessibleFunctions(session);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.admin_panel_settings_outlined,
                    color: scheme.primary),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text('Access summary',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                Chip(label: Text('${session.permissions.length} permissions')),
              ],
            ),
            if (session.roleNames.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children:
                    session.roleNames.map((r) => Chip(label: Text(r))).toList(),
              ),
            ],
            const SizedBox(height: 10),
            if (functions.isEmpty)
              Text('No staff functions are enabled for this account.',
                  style: TextStyle(color: scheme.error))
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children:
                    functions.map((f) => InputChip(label: Text(f))).toList(),
              ),
          ],
        ),
      ),
    );
  }

  List<String> _accessibleFunctions(StaffSession session) {
    final functions = <String>[];
    void add(String label, List<String> perms) {
      if (session.canAny(perms)) functions.add(label);
    }

    add('Members', ['members:view', 'members:create', 'members:approve']);
    add('Loans', ['loans:view', 'loans:create', 'loans:terms']);
    add('Transactions',
        ['transactions:view', 'transactions:create', 'transactions:approve']);
    add('Mobile money', ['accounting:view', 'accounting:post']);
    add('Subscriptions', [
      'subscriptions:view',
      'subscriptions:manage',
      'member-subscription:view',
    ]);
    add('SMS', ['notifications:manage']);
    add('Fund sources', ['fund-types:view', 'fund-types:manage']);
    add('Reports', ['reports:view']);
    add('Audit', ['audit:view']);
    add('Users & roles', ['users:view', 'roles:view']);
    return functions;
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.session, required this.profileAsync});
  final StaffSession session;
  final AsyncValue<SaccoProfile>? profileAsync;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final profile = profileAsync?.asData?.value;
    final logoBytes = _decodeLogo(profile?.logoDataUrl ?? '');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: scheme.primaryContainer,
              backgroundImage:
                  logoBytes == null ? null : MemoryImage(logoBytes),
              child: logoBytes == null
                  ? Icon(Icons.account_balance_outlined,
                      color: scheme.onPrimaryContainer)
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.userName.isEmpty ? 'Administrator' : session.userName,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  Text(
                    profile?.legalName.isNotEmpty == true
                        ? profile!.legalName
                        : session.saccoName,
                    style:
                        TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                  if (session.email.isNotEmpty)
                    Text(session.email,
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  if (session.roleNames.isNotEmpty) ...[
                    const SizedBox(height: 8),
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
          ],
        ),
      ),
    );
  }

  Uint8List? _decodeLogo(String dataUrl) {
    final comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    try {
      return base64Decode(dataUrl.substring(comma + 1));
    } catch (_) {
      return null;
    }
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: ListTile(
        enabled: enabled,
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
        onTap: enabled ? onTap : null,
      ),
    );
  }
}

class _ThemeModeControl extends ConsumerWidget {
  const _ThemeModeControl();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.brightness_6_outlined, color: scheme.primary),
                const SizedBox(width: 12),
                const Text('Theme',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: SegmentedButton<ThemeMode>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(
                      value: ThemeMode.system, label: Text('System')),
                  ButtonSegment(value: ThemeMode.light, label: Text('Light')),
                  ButtonSegment(value: ThemeMode.dark, label: Text('Dark')),
                ],
                selected: {mode},
                onSelectionChanged: (selection) => ref
                    .read(themeModeProvider.notifier)
                    .setMode(selection.first),
              ),
            ),
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

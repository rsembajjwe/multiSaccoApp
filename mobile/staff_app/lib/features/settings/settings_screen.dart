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
    final profileAsync = session.tenantId.isEmpty
        ? null
        : ref.watch(saccoProfileProvider(session.tenantId));
    final canOpenSaccoSetup = session.canAny([
      'sacco-profile:manage',
      'tenants:manage',
      'fund-types:manage',
      'loans:terms',
      'subscriptions:view',
      'subscriptions:manage',
      'member-subscription:view',
      'member-subscription:manage',
      'member-subscription:prompt',
      'notifications:manage',
    ]);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _ProfileCard(session: session, profileAsync: profileAsync),
        const SizedBox(height: 16),
        Text('Manage', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (canOpenSaccoSetup)
          _SettingsTile(
            icon: Icons.account_balance_outlined,
            title: 'SACCO setup',
            subtitle: 'Loan terms, fund types, logo and subscriptions',
            enabled: true,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => _SaccoControlsScreen(session: session),
            )),
          ),
        _SettingsTile(
          icon: Icons.tune_outlined,
          title: 'App preferences',
          subtitle: 'Theme and biometric app lock',
          enabled: true,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => const _AppPreferencesScreen(),
          )),
        ),
        _SettingsTile(
          icon: Icons.admin_panel_settings_outlined,
          title: 'My access',
          subtitle: 'Roles, permissions and available staff functions',
          enabled: true,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => _AccessSummaryScreen(session: session),
          )),
        ),
        const SizedBox(height: 16),
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
}

class _SaccoControlsScreen extends ConsumerWidget {
  const _SaccoControlsScreen({required this.session});

  final StaffSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canManageProfile =
        session.can('sacco-profile:manage') || session.can('tenants:manage');
    final canManageFunds = session.can('fund-types:manage');
    final canManageTerms = session.can('loans:terms');
    final canPaySubscription = session.can('subscriptions:manage');
    final canManageMemberSubscriptions =
        session.can('member-subscription:manage');
    final canPromptMemberSubscriptions = canManageMemberSubscriptions ||
        session.can('member-subscription:prompt');
    final profileAsync = session.tenantId.isEmpty
        ? null
        : ref.watch(saccoProfileProvider(session.tenantId));

    return Scaffold(
      appBar: AppBar(title: const Text('SACCO setup')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Configuration shared by all staff and members.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          _SettingsTile(
            icon: Icons.percent,
            title: 'Loan interest rate',
            subtitle: profileAsync?.maybeWhen(
                  data: (profile) =>
                      '${profile.loanInterestRate.toStringAsFixed(2)}% monthly default',
                  orElse: () => 'Set default rate for new loans and top-ups',
                ) ??
                'Set default rate for new loans and top-ups',
            enabled: canManageTerms && session.tenantId.isNotEmpty,
            onTap: () =>
                _showInterestDialog(context, ref, session, profileAsync),
          ),
          _SettingsTile(
            icon: Icons.event_repeat_outlined,
            title: 'Savings cycle and withdrawals',
            subtitle: profileAsync?.maybeWhen(
                  data: (profile) => profile.savingsCyclePeriod == 'annual'
                      ? 'Annual cycle; withdrawals open ${profile.savingsCycleStartDay}/${profile.savingsCycleStartMonth} for ${profile.savingsWithdrawalWindowDays} days'
                      : 'Continuous withdrawals',
                  orElse: () => 'Configure continuous or annual savings access',
                ) ??
                'Configure continuous or annual savings access',
            enabled: canManageProfile && session.tenantId.isNotEmpty,
            onTap: () =>
                _showSavingsCycleDialog(context, ref, session, profileAsync),
          ),
          _SettingsTile(
            icon: Icons.account_balance_wallet_outlined,
            title: 'Fund types',
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
        ],
      ),
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
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
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
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _showSavingsCycleDialog(
    BuildContext context,
    WidgetRef ref,
    StaffSession session,
    AsyncValue<SaccoProfile>? profileAsync,
  ) async {
    final profile = profileAsync?.asData?.value;
    final value = await showDialog<_SavingsCycleDraft>(
      context: context,
      builder: (_) => _SavingsCycleDialog(profile: profile),
    );
    if (value == null) return;
    try {
      await ref.read(adminRepositoryProvider).updateSaccoProfile(
            session.tenantId,
            savingsCyclePeriod: value.period,
            savingsCycleStartMonth: value.startMonth,
            savingsCycleStartDay: value.startDay,
            savingsWithdrawalWindowDays: value.windowDays,
          );
      ref.invalidate(saccoProfileProvider(session.tenantId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Savings withdrawal policy updated.')));
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
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

class _AppPreferencesScreen extends StatelessWidget {
  const _AppPreferencesScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('App preferences')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Text('Appearance'),
          SizedBox(height: 8),
          _ThemeModeControl(),
          SizedBox(height: 24),
          Text('Security'),
          SizedBox(height: 8),
          _BiometricToggle(),
        ],
      ),
    );
  }
}

class _AccessSummaryScreen extends StatelessWidget {
  const _AccessSummaryScreen({required this.session});

  final StaffSession session;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My access')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Your access is assigned by your SACCO administrator.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          _AccessSummaryCard(session: session),
        ],
      ),
    );
  }
}

class _SavingsCycleDraft {
  const _SavingsCycleDraft({
    required this.period,
    required this.startMonth,
    required this.startDay,
    required this.windowDays,
  });

  final String period;
  final int startMonth;
  final int startDay;
  final int windowDays;
}

class _SavingsCycleDialog extends StatefulWidget {
  const _SavingsCycleDialog({required this.profile});

  final SaccoProfile? profile;

  @override
  State<_SavingsCycleDialog> createState() => _SavingsCycleDialogState();
}

class _SavingsCycleDialogState extends State<_SavingsCycleDialog> {
  late String _period;
  late int _month;
  late int _day;
  late final TextEditingController _window;

  @override
  void initState() {
    super.initState();
    _period = widget.profile?.savingsCyclePeriod ?? 'continuous';
    _month = widget.profile?.savingsCycleStartMonth ?? 1;
    _day = widget.profile?.savingsCycleStartDay ?? 1;
    _window = TextEditingController(
        text: '${widget.profile?.savingsWithdrawalWindowDays ?? 30}');
  }

  @override
  void dispose() {
    _window.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final annual = _period == 'annual';
    return AlertDialog(
      title: const Text('Savings withdrawals'),
      content: SizedBox(
        width: 420,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _period,
              decoration: const InputDecoration(labelText: 'Savings cycle'),
              items: const [
                DropdownMenuItem(
                    value: 'continuous', child: Text('Continuous access')),
                DropdownMenuItem(
                    value: 'annual', child: Text('Annual withdrawal window')),
              ],
              onChanged: (value) => setState(() => _period = value!),
            ),
            if (annual) ...[
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: DropdownButtonFormField<int>(
                    initialValue: _month,
                    decoration: const InputDecoration(labelText: 'Opening month'),
                    items: [
                      for (var month = 1; month <= 12; month++)
                        DropdownMenuItem(value: month, child: Text('$month')),
                    ],
                    onChanged: (value) => setState(() => _month = value!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<int>(
                    initialValue: _day,
                    decoration: const InputDecoration(labelText: 'Opening day'),
                    items: [
                      for (var day = 1; day <= 31; day++)
                        DropdownMenuItem(value: day, child: Text('$day')),
                    ],
                    onChanged: (value) => setState(() => _day = value!),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextField(
                controller: _window,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'Withdrawal window (days)',
                    helperText: 'Members may withdraw only during this period.'),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            final days = int.tryParse(_window.text.trim()) ?? 0;
            if (days < 1 || days > 366) return;
            Navigator.pop(
                context,
                _SavingsCycleDraft(
                    period: _period,
                    startMonth: _month,
                    startDay: _day,
                    windowDays: days));
          },
          child: const Text('Save'),
        ),
      ],
    );
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
            final parsed = num.tryParse((v ?? '').trim().replaceAll(',', ''));
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
    add('Fund types', ['fund-types:view', 'fund-types:manage']);
    add('Reports', ['reports:view']);
    add('Audit', ['audit:view']);
    add('Users & roles', ['users:view', 'roles:view']);
    return functions;
  }
}

class _ProfileCard extends ConsumerWidget {
  const _ProfileCard({required this.session, required this.profileAsync});
  final StaffSession session;
  final AsyncValue<SaccoProfile>? profileAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                    session.userName.isEmpty
                        ? 'Administrator'
                        : session.userName,
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
                  if (session.phone.isNotEmpty)
                    Text(session.phone,
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  if (session.roleNames.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: session.roleNames
                          .map((r) => Chip(label: Text(r)))
                          .toList(),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              tooltip: 'Edit contact details',
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                final updated = await showModalBottomSheet<bool>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => _StaffContactSheet(session: session),
                );
                if (updated == true) {
                  ref.invalidate(sessionProvider);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Contact details updated.')),
                    );
                  }
                }
              },
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

class _StaffContactSheet extends ConsumerStatefulWidget {
  const _StaffContactSheet({required this.session});

  final StaffSession session;

  @override
  ConsumerState<_StaffContactSheet> createState() =>
      _StaffContactSheetState();
}

class _StaffContactSheetState extends ConsumerState<_StaffContactSheet> {
  late final TextEditingController _email =
      TextEditingController(text: widget.session.email);
  late final TextEditingController _phone =
      TextEditingController(text: widget.session.phone);
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final email = _email.text.trim();
    final phone = _phone.text.trim();
    if (!email.contains('@') || phone.isEmpty) {
      setState(() => _error = 'Enter a valid email and telephone number.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .updateContact(email: email, phone: phone);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          MediaQuery.viewInsetsOf(context).bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Edit contact details',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email address'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration:
                  const InputDecoration(labelText: 'Telephone number'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!,
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save changes'),
            ),
          ],
        ),
      );
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
                  ButtonSegment(value: ThemeMode.system, label: Text('System')),
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

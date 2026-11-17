import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';

import '../app.dart';
import '../models.dart';
import '../providers.dart';
import '../widgets.dart';
import 'advanced_reports_screen.dart';
import 'billing_administration_screen.dart';
import 'sms_broadcast_screen.dart';
import 'notification_operations_screen.dart';
import 'payment_operations_screen.dart';
import 'security_operations_screen.dart';
import 'fleet_operations_screen.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('More')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(session.name),
            subtitle: Text(
              '${session.email}${session.phone.isEmpty ? '' : '\n${session.phone}'}\n${session.roles.join(', ')}',
            ),
            isThreeLine: true,
            trailing: const Icon(Icons.edit_outlined),
            onTap: () => _editContact(context, ref),
          ),
        ),
        const SizedBox(height: 10),
        if (session.can('complaints:view'))
          _Link(
            icon: Icons.support_agent,
            title: 'Customer support',
            subtitle: 'Prioritise, resolve and close support cases',
            page: SupportScreen(session: session),
          ),
        if (session.can('subscriptions:view') || session.can('tenants:view'))
          _Link(
            icon: Icons.insights_outlined,
            title: 'Business reports',
            subtitle: 'Revenue, collections and portfolio exposure',
            page: AdvancedReportsScreen(session: session),
          ),
        if (session.can('subscriptions:view'))
          _Link(
            icon: Icons.inventory_2_outlined,
            title: 'SMS inventory report',
            subtitle:
                'AfroSMS balance, available SMS, customer credits, margin and top-up warnings',
            page: BillingAdministrationScreen(session: session),
          ),
        if (session.can('users:view'))
          _Link(
            icon: Icons.badge_outlined,
            title: 'Platform staff',
            subtitle: 'Invite, activate and suspend employees',
            page: StaffScreen(session: session),
          ),
        if (session.can('notifications:manage'))
          const _Link(
            icon: Icons.sms_outlined,
            title: 'Message SACCOs',
            subtitle: 'Send SMS to all or selected SACCO leaders',
            page: SmsBroadcastScreen(),
          ),
        if (session.can('notifications:view'))
          _Link(
            icon: Icons.notifications_active_outlined,
            title: 'Notification operations',
            subtitle: 'Provider health, campaign history and failed deliveries',
            page: NotificationOperationsScreen(session: session),
          ),
        if (session.can('notifications:view'))
          _Link(
            icon: Icons.sync_alt,
            title: 'Payment operations',
            subtitle: 'Mobile-money evidence and reconciliation',
            page: PaymentOperationsScreen(session: session),
          ),
        if (session.isPlatform)
          _Link(
            icon: Icons.hub_outlined,
            title: 'Fleet operations',
            subtitle: 'Bulk SACCO actions, job results and incidents',
            page: FleetOperationsScreen(session: session),
          ),
        if (session.isPlatform)
          _Link(
            icon: Icons.admin_panel_settings_outlined,
            title: 'Platform security',
            subtitle: 'Password policy, audit history and staff controls',
            page: SecurityOperationsScreen(session: session),
          ),
        _Link(
          icon: Icons.security_outlined,
          title: 'Security settings',
          subtitle: 'Biometric lock and session controls',
          page: const SecuritySettingsScreen(),
        ),
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          icon: const Icon(Icons.logout),
          label: const Text('Sign out'),
        ),
      ],
    ),
  );

  Future<void> _editContact(BuildContext context, WidgetRef ref) async {
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ProprietorContactSheet(session: session),
    );
    if (updated == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contact details updated.')),
      );
    }
  }
}

class _ProprietorContactSheet extends ConsumerStatefulWidget {
  const _ProprietorContactSheet({required this.session});

  final PlatformSession session;

  @override
  ConsumerState<_ProprietorContactSheet> createState() =>
      _ProprietorContactSheetState();
}

class _ProprietorContactSheetState
    extends ConsumerState<_ProprietorContactSheet> {
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
          .read(authControllerProvider.notifier)
          .updateContact(email, phone);
      if (mounted) Navigator.of(context).pop(true);
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

class _Link extends StatelessWidget {
  const _Link({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.page,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget page;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: () =>
          Navigator.push(context, MaterialPageRoute(builder: (_) => page)),
    ),
  );
}

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(fleetSummaryProvider);
    final subscriptions = ref.watch(subscriptionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Business reports')),
      body: AsyncPane(
        value: summary,
        onRetry: () => ref.invalidate(fleetSummaryProvider),
        builder: (fleet) => subscriptions.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('$error')),
          data: (items) {
            final active = items
                .where((item) => item.status == 'active')
                .length;
            final trials = items.where((item) => item.status == 'trial').length;
            final collection = items.fold<num>(
              0,
              (sum, item) => sum + item.paid,
            );
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Current portfolio',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: MetricCard(
                        label: 'Actual collections',
                        value: money(collection),
                        icon: Icons.account_balance_wallet_outlined,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: MetricCard(
                        label: 'Invoiced value',
                        value: money(fleet.revenue),
                        icon: Icons.receipt_long_outlined,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: [
                        _ReportLine('Active subscriptions', '$active'),
                        _ReportLine('Trial subscriptions', '$trials'),
                        _ReportLine(
                          'Outstanding balance',
                          money(fleet.outstanding),
                        ),
                        _ReportLine('Renewals due', '${fleet.renewalsDue}'),
                        _ReportLine(
                          'Expired subscriptions',
                          '${fleet.expired}',
                        ),
                        _ReportLine(
                          'Average onboarding',
                          '${fleet.averageOnboarding}%',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(18),
                    child: Text(
                      'Exports are generated by the backend and remain permission-controlled. Member funds are excluded from proprietor revenue.',
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ReportLine extends StatelessWidget {
  const _ReportLine(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 9),
    child: Row(
      children: [
        Expanded(child: Text(label)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
    ),
  );
}

class SupportScreen extends ConsumerWidget {
  const SupportScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tickets = ref.watch(ticketsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Customer support')),
      body: AsyncPane(
        value: tickets,
        onRetry: () => ref.invalidate(ticketsProvider),
        builder: (items) => items.isEmpty
            ? const Center(child: Text('No support cases found.'))
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(ticketsProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (_, index) {
                    final ticket = items[index];
                    return Card(
                      child: ListTile(
                        title: Text(
                          ticket.subject,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        subtitle: Text(
                          '${ticket.tenantId} • ${label(ticket.category)}\n${ticket.description}',
                        ),
                        isThreeLine: true,
                        trailing: StatusPill(ticket.status),
                        onTap: session.can('complaints:manage')
                            ? () => _update(context, ref, ticket)
                            : null,
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }

  Future<void> _update(
    BuildContext context,
    WidgetRef ref,
    SupportTicket ticket,
  ) async {
    String status = ticket.status == 'resolved' ? 'closed' : 'resolved';
    final notes = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(ticket.subject),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: status,
                decoration: const InputDecoration(labelText: 'New status'),
                items: const [
                  DropdownMenuItem(
                    value: 'in_progress',
                    child: Text('In progress'),
                  ),
                  DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                  DropdownMenuItem(value: 'closed', child: Text('Closed')),
                ],
                onChanged: (value) => setState(() => status = value ?? status),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notes,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Resolution notes',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .updateTicket(ticket.id, status, notes.text.trim());
        ref.invalidate(ticketsProvider);
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    notes.dispose();
  }
}

class StaffScreen extends ConsumerWidget {
  const StaffScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final users = ref.watch(platformUsersProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Platform staff'),
        actions: [
          if (_canManageUsers)
            IconButton(
              onPressed: () => _invite(context, ref),
              icon: const Icon(Icons.person_add_alt_1),
            ),
        ],
      ),
      floatingActionButton: _canManageUsers
          ? FloatingActionButton.extended(
              onPressed: () => _invite(context, ref),
              icon: const Icon(Icons.person_add),
              label: const Text('Invite'),
            )
          : null,
      body: AsyncPane(
        value: users,
        onRetry: () => ref.invalidate(platformUsersProvider),
        builder: (items) => ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (_, index) {
            final user = items[index];
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  child: Text(user.name.isEmpty ? '?' : user.name[0]),
                ),
                title: Text(
                  user.name,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  '${user.email.isEmpty ? user.phone : user.email}\nMFA ${user.mfaEnabled ? 'enabled' : 'required for privileged roles'}',
                ),
                isThreeLine: true,
                trailing: StatusPill(user.status),
                onTap: _canManageUsers
                    ? () => _securityActions(context, ref, user)
                    : null,
                onLongPress: _canManageUsers
                    ? () => _toggleStatus(context, ref, user)
                    : null,
              ),
            );
          },
        ),
      ),
    );
  }

  bool get _canManageUsers =>
      session.can('users:manage') || session.can('users:create');

  Future<void> _securityActions(
    BuildContext context,
    WidgetRef ref,
    PlatformUser user,
  ) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: Icon(user.mfaEnabled ? Icons.lock_open : Icons.security),
              title: Text(user.mfaEnabled ? 'Disable MFA' : 'Enable MFA'),
              subtitle: const Text(
                'Change server-side multi-factor authentication',
              ),
              onTap: () => Navigator.pop(sheetContext, 'mfa'),
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Force logout'),
              subtitle: Text('${user.activeSessionCount} active session(s)'),
              onTap: () => Navigator.pop(sheetContext, 'sessions'),
            ),
            ListTile(
              leading: const Icon(Icons.password),
              title: const Text('Require password reset'),
              subtitle: Text(
                user.passwordResetRequired
                    ? 'Already required'
                    : 'Create a 30-minute reset request',
              ),
              onTap: user.passwordResetRequired
                  ? null
                  : () => Navigator.pop(sheetContext, 'password'),
            ),
            ListTile(
              leading: Icon(
                user.status == 'active' ? Icons.block : Icons.check_circle,
              ),
              title: Text(
                user.status == 'active' ? 'Suspend user' : 'Activate user',
              ),
              onTap: () => Navigator.pop(sheetContext, 'status'),
            ),
          ],
        ),
      ),
    );
    if (action == null || !context.mounted) return;
    try {
      final repository = ref.read(platformRepositoryProvider);
      switch (action) {
        case 'mfa':
          await repository.updateUserMfa(user.id, !user.mfaEnabled);
          break;
        case 'sessions':
          await repository.revokeUserSessions(user.id);
          break;
        case 'password':
          await repository.requestUserPasswordReset(user.id);
          break;
        case 'status':
          await _toggleStatus(context, ref, user);
          return;
      }
      ref.invalidate(platformUsersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Security action completed and audited.'),
          ),
        );
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _invite(BuildContext context, WidgetRef ref) async {
    final name = TextEditingController();
    final email = TextEditingController();
    final phone = TextEditingController();
    String channel = 'email';
    final roles = await ref.read(platformRolesProvider.future);
    String roleId = roles.isEmpty ? '' : roles.first.id;
    if (!context.mounted) return;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Invite platform employee'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Full name'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Active email'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Verified telephone',
                  ),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: channel,
                  decoration: const InputDecoration(
                    labelText: 'Temporary password delivery',
                  ),
                  items: const [
                    DropdownMenuItem(value: 'email', child: Text('Email')),
                    DropdownMenuItem(value: 'sms', child: Text('SMS')),
                  ],
                  onChanged: (value) =>
                      setState(() => channel = value ?? 'email'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: roleId.isEmpty ? null : roleId,
                  decoration: const InputDecoration(labelText: 'Platform role'),
                  items: roles
                      .map(
                        (role) => DropdownMenuItem(
                          value: role.id,
                          child: Text(role.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => roleId = value ?? ''),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Send invitation'),
            ),
          ],
        ),
      ),
    );
    final contact = channel == 'email' ? email.text.trim() : phone.text.trim();
    if (submit == true && name.text.trim().isNotEmpty && contact.isNotEmpty) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .createUser(
              name: name.text.trim(),
              email: email.text.trim(),
              phone: phone.text.trim(),
              channel: channel,
              roleId: roleId,
            );
        ref.invalidate(platformUsersProvider);
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    name.dispose();
    email.dispose();
    phone.dispose();
  }

  Future<void> _toggleStatus(
    BuildContext context,
    WidgetRef ref,
    PlatformUser user,
  ) async {
    final status = user.status == 'active' ? 'suspended' : 'active';
    final reason = await reasonDialog(
      context,
      title: '${label(status)} ${user.name}?',
      actionLabel: label(status),
    );
    if (reason == null) return;
    await ref
        .read(platformRepositoryProvider)
        .updateUserStatus(user.id, status);
    ref.invalidate(platformUsersProvider);
  }
}

class SecuritySettingsScreen extends ConsumerStatefulWidget {
  const SecuritySettingsScreen({super.key});
  @override
  ConsumerState<SecuritySettingsScreen> createState() =>
      _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState
    extends ConsumerState<SecuritySettingsScreen> {
  bool _enabled = false;
  bool _supported = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = LocalAuthentication();
    final supported = await auth.isDeviceSupported();
    final enabled = await ref.read(sessionStoreProvider).biometricEnabled();
    if (mounted) {
      setState(() {
        _supported = supported;
        _enabled = enabled;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Security settings')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: SwitchListTile(
            value: _enabled && _supported,
            onChanged: _supported
                ? (value) async {
                    if (value) {
                      final verified = await LocalAuthentication().authenticate(
                        localizedReason:
                            'Enable biometric protection for Tereka Proprietor',
                      );
                      if (!verified) return;
                    }
                    await ref
                        .read(sessionStoreProvider)
                        .setBiometricEnabled(value);
                    setState(() => _enabled = value);
                  }
                : null,
            secondary: const Icon(Icons.fingerprint),
            title: const Text('Biometric app lock'),
            subtitle: Text(
              _supported
                  ? 'Require device verification when reopening the app.'
                  : 'Biometric authentication is unavailable on this device.',
            ),
          ),
        ),
        const Card(
          child: ListTile(
            leading: Icon(Icons.policy_outlined),
            title: Text('Server-side controls'),
            subtitle: Text(
              'Permissions, MFA, maker-checker rules, tenant isolation and audit logs remain enforced by the backend.',
            ),
          ),
        ),
      ],
    ),
  );
}

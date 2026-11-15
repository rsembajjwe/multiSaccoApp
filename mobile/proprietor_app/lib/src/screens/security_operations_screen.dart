import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers.dart';

class SecurityOperationsScreen extends ConsumerStatefulWidget {
  const SecurityOperationsScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  ConsumerState<SecurityOperationsScreen> createState() =>
      _SecurityOperationsScreenState();
}

class _SecurityOperationsScreenState
    extends ConsumerState<SecurityOperationsScreen> {
  final _search = TextEditingController();
  String _searchTerm = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final policy = ref.watch(platformSecurityPolicyProvider);
    final audit = ref.watch(platformAuditEventsProvider(_searchTerm));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Platform security'),
        actions: [
          IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Password and lockout policy',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                ),
                if (widget.session.can('roles:create'))
                  IconButton(
                    tooltip: 'Edit policy',
                    onPressed: () =>
                        policy.whenData((value) => _editPolicy(value)),
                    icon: const Icon(Icons.edit_outlined),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            policy.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => _ErrorCard('$error'),
              data: (value) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _line(
                        'Minimum password length',
                        '${value.minimumPasswordLength}',
                      ),
                      _line(
                        'Uppercase required',
                        value.requireUppercase ? 'Yes' : 'No',
                      ),
                      _line(
                        'Lowercase required',
                        value.requireLowercase ? 'Yes' : 'No',
                      ),
                      _line(
                        'Number required',
                        value.requireNumber ? 'Yes' : 'No',
                      ),
                      _line(
                        'Symbol required',
                        value.requireSymbol ? 'Yes' : 'No',
                      ),
                      _line(
                        'Password expiry',
                        value.passwordExpiryDays == 0
                            ? 'Disabled'
                            : '${value.passwordExpiryDays} days',
                      ),
                      _line(
                        'Failed attempts before lockout',
                        '${value.lockoutFailedAttempts}',
                      ),
                      _line(
                        'Lockout duration',
                        '${value.lockoutMinutes} minutes',
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Audit history',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                labelText: 'Search actor, action, resource or tenant',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchTerm.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          _search.clear();
                          setState(() => _searchTerm = '');
                        },
                        icon: const Icon(Icons.clear),
                      ),
              ),
              onSubmitted: (value) =>
                  setState(() => _searchTerm = value.trim()),
            ),
            const SizedBox(height: 10),
            audit.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _ErrorCard('$error'),
              data: (page) => page.items.isEmpty
                  ? const _ErrorCard('No audit events match this search.')
                  : Column(children: page.items.map(_auditCard).toList()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _auditCard(PlatformAuditEvent event) => Card(
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.history)),
      title: Text(
        event.action,
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
      subtitle: Text(
        '${event.actorName.isEmpty ? 'System' : event.actorName} - ${event.tenantId}\n${event.resourceType}${event.resourceId.isEmpty ? '' : ': ${event.resourceId}'}${event.createdAt == null ? '' : ' - ${DateFormat('dd MMM, HH:mm').format(event.createdAt!.toLocal())}'}',
      ),
      isThreeLine: true,
    ),
  );

  Widget _line(String name, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      children: [
        Expanded(child: Text(name)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
    ),
  );

  Future<void> _refresh() async {
    ref.invalidate(platformSecurityPolicyProvider);
    ref.invalidate(platformAuditEventsProvider(_searchTerm));
    await Future.wait([
      ref.read(platformSecurityPolicyProvider.future),
      ref.read(platformAuditEventsProvider(_searchTerm).future),
    ]);
  }

  Future<void> _editPolicy(PlatformSecurityPolicy policy) async {
    final minimumLength = TextEditingController(
      text: '${policy.minimumPasswordLength}',
    );
    final expiry = TextEditingController(text: '${policy.passwordExpiryDays}');
    final failedAttempts = TextEditingController(
      text: '${policy.lockoutFailedAttempts}',
    );
    final lockoutMinutes = TextEditingController(
      text: '${policy.lockoutMinutes}',
    );
    var uppercase = policy.requireUppercase;
    var lowercase = policy.requireLowercase;
    var number = policy.requireNumber;
    var symbol = policy.requireSymbol;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit security policy'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _numberField(minimumLength, 'Minimum password length'),
                SwitchListTile(
                  value: uppercase,
                  onChanged: (value) => setDialogState(() => uppercase = value),
                  title: const Text('Require uppercase'),
                ),
                SwitchListTile(
                  value: lowercase,
                  onChanged: (value) => setDialogState(() => lowercase = value),
                  title: const Text('Require lowercase'),
                ),
                SwitchListTile(
                  value: number,
                  onChanged: (value) => setDialogState(() => number = value),
                  title: const Text('Require number'),
                ),
                SwitchListTile(
                  value: symbol,
                  onChanged: (value) => setDialogState(() => symbol = value),
                  title: const Text('Require symbol'),
                ),
                _numberField(expiry, 'Password expiry days (0 disables)'),
                _numberField(failedAttempts, 'Failed attempts before lockout'),
                _numberField(lockoutMinutes, 'Lockout minutes'),
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
              child: const Text('Save policy'),
            ),
          ],
        ),
      ),
    );
    if (submit == true && mounted) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .updateSecurityPolicy(
              PlatformSecurityPolicy(
                minimumPasswordLength:
                    int.tryParse(minimumLength.text) ??
                    policy.minimumPasswordLength,
                requireUppercase: uppercase,
                requireLowercase: lowercase,
                requireNumber: number,
                requireSymbol: symbol,
                passwordExpiryDays:
                    int.tryParse(expiry.text) ?? policy.passwordExpiryDays,
                lockoutFailedAttempts:
                    int.tryParse(failedAttempts.text) ??
                    policy.lockoutFailedAttempts,
                lockoutMinutes:
                    int.tryParse(lockoutMinutes.text) ?? policy.lockoutMinutes,
                updatedAt: policy.updatedAt,
              ),
            );
        ref.invalidate(platformSecurityPolicyProvider);
        ref.invalidate(platformAuditEventsProvider(_searchTerm));
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    minimumLength.dispose();
    expiry.dispose();
    failedAttempts.dispose();
    lockoutMinutes.dispose();
  }

  Widget _numberField(TextEditingController controller, String labelText) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: labelText),
        ),
      );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard(this.message);
  final String message;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: const EdgeInsets.all(16), child: Text(message)),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class SaccoLifecycleScreen extends ConsumerStatefulWidget {
  const SaccoLifecycleScreen({
    super.key,
    required this.tenantId,
    required this.session,
  });
  final String tenantId;
  final PlatformSession session;

  @override
  ConsumerState<SaccoLifecycleScreen> createState() =>
      _SaccoLifecycleScreenState();
}

class _SaccoLifecycleScreenState extends ConsumerState<SaccoLifecycleScreen> {
  bool _changed = false;

  @override
  Widget build(BuildContext context) {
    final lifecycle = ref.watch(saccoLifecycleProvider(widget.tenantId));
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) Navigator.pop(context, _changed);
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Manage SACCO'),
          actions: [
            IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
          ],
        ),
        body: AsyncPane(
          value: lifecycle,
          onRetry: _refresh,
          builder: (data) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _detailsCard(data),
              const SizedBox(height: 12),
              _collectionCard(data),
              const SizedBox(height: 12),
              _officialsCard(data),
              const SizedBox(height: 12),
              _accountsCard(data),
              if (widget.session.can('tenants:delete')) ...[
                const SizedBox(height: 18),
                _deletionCard(data.tenant),
              ],
            ],
          ),
        ),
      ),
    );
  }

  bool get _canManage => widget.session.can('tenants:manage');

  Widget _detailsCard(SaccoLifecycleData data) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  data.tenant.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              StatusPill(data.tenant.status),
              if (_canManage)
                IconButton(
                  onPressed: () => _editDetails(data.tenant),
                  icon: const Icon(Icons.edit_outlined),
                ),
            ],
          ),
          _line('SACCO code', data.tenant.code),
          _line('Registration', data.tenant.registrationNo),
          _line('District', data.tenant.district),
          _line('Country', data.tenant.country),
          _line('Package', data.tenant.packageId),
        ],
      ),
    ),
  );

  Widget _collectionCard(SaccoLifecycleData data) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Collection controls',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          _line('Allowed mode', label(data.tenant.allowedCollectionMode)),
          _line(
            'Mobile money active',
            data.tenant.mobileMoneyActive ? 'Yes' : 'No',
          ),
          _line('Bank active', data.tenant.bankActive ? 'Yes' : 'No'),
          if (_canManage) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => _editCollections(data.tenant),
              icon: const Icon(Icons.tune),
              label: const Text('Configure collections'),
            ),
          ],
        ],
      ),
    ),
  );

  Widget _officialsCard(SaccoLifecycleData data) {
    final officialsByOffice = {
      for (final official in data.officials) official.office: official,
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'SACCO officials',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            for (final office in const [
              'chairperson',
              'treasurer',
              'secretary',
            ])
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.badge_outlined),
                title: Text(label(office)),
                subtitle: Text(
                  officialsByOffice[office]?.fullName.isNotEmpty == true
                      ? '${officialsByOffice[office]!.fullName} (${officialsByOffice[office]!.membershipNo})'
                      : 'Not assigned',
                ),
                trailing: _canManage ? const Icon(Icons.swap_horiz) : null,
                onTap: _canManage
                    ? () => _assignOfficial(
                        data,
                        office,
                        officialsByOffice[office]?.memberId ?? '',
                      )
                    : null,
              ),
          ],
        ),
      ),
    );
  }

  Widget _accountsCard(SaccoLifecycleData data) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Collection accounts',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
              ),
              if (_canManage)
                IconButton(
                  onPressed: () => _addAccount(data.tenant),
                  icon: const Icon(Icons.add_card),
                ),
            ],
          ),
          if (data.paymentAccounts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('No collection accounts configured.'),
            )
          else
            ...data.paymentAccounts.map(
              (account) => SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: account.active,
                onChanged: _canManage
                    ? (value) => _toggleAccount(account, value)
                    : null,
                title: Text(account.accountName),
                subtitle: Text(
                  '${label(account.channel)}${account.network.isEmpty ? '' : ' - ${account.network}'}\n${account.accountNumber}',
                ),
                isThreeLine: true,
              ),
            ),
        ],
      ),
    ),
  );

  Widget _deletionCard(TenantLifecycleDetail tenant) => Card(
    color: Theme.of(context).colorScheme.errorContainer,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Permanent deletion',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          const Text(
            'Deletion is blocked when financial history exists and may be disabled on production.',
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => _deleteTenant(tenant),
            icon: const Icon(Icons.delete_forever),
            label: const Text('Delete SACCO'),
          ),
        ],
      ),
    ),
  );

  Widget _line(String name, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        Expanded(child: Text(name)),
        Flexible(
          child: Text(
            value.isEmpty ? 'Not set' : value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
      ],
    ),
  );

  void _refresh() => ref.invalidate(saccoLifecycleProvider(widget.tenantId));

  Future<void> _run(Future<void> Function() action, String success) async {
    try {
      await action();
      _changed = true;
      _refresh();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(success)));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _editDetails(TenantLifecycleDetail tenant) async {
    final name = TextEditingController(text: tenant.name);
    final registration = TextEditingController(text: tenant.registrationNo);
    final district = TextEditingController(text: tenant.district);
    final country = TextEditingController(text: tenant.country);
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit SACCO details'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _field(name, 'SACCO name'),
              _field(registration, 'Registration number'),
              _field(district, 'District'),
              _field(country, 'Country'),
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
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (submit == true) {
      await _run(
        () => ref
            .read(platformRepositoryProvider)
            .updateTenantDetails(
              tenant.id,
              name: name.text.trim(),
              registrationNo: registration.text.trim(),
              district: district.text.trim(),
              country: country.text.trim(),
            ),
        'SACCO details updated.',
      );
    }
    name.dispose();
    registration.dispose();
    district.dispose();
    country.dispose();
  }

  Future<void> _editCollections(TenantLifecycleDetail tenant) async {
    var mode = tenant.allowedCollectionMode;
    var mobile = tenant.mobileMoneyActive;
    var bank = tenant.bankActive;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Collection controls'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: mode,
                decoration: const InputDecoration(
                  labelText: 'Allowed collection mode',
                ),
                items: const [
                  DropdownMenuItem(value: 'NONE', child: Text('None')),
                  DropdownMenuItem(
                    value: 'MOBILE_MONEY_ONLY',
                    child: Text('Mobile money only'),
                  ),
                  DropdownMenuItem(
                    value: 'BANK_ONLY',
                    child: Text('Bank only'),
                  ),
                  DropdownMenuItem(value: 'BOTH', child: Text('Both')),
                ],
                onChanged: (value) => setDialogState(() {
                  mode = value ?? mode;
                  if (mode == 'NONE' || mode == 'BANK_ONLY') mobile = false;
                  if (mode == 'NONE' || mode == 'MOBILE_MONEY_ONLY') {
                    bank = false;
                  }
                }),
              ),
              SwitchListTile(
                value: mobile,
                onChanged: mode == 'MOBILE_MONEY_ONLY' || mode == 'BOTH'
                    ? (value) => setDialogState(() => mobile = value)
                    : null,
                title: const Text('Activate mobile money'),
              ),
              SwitchListTile(
                value: bank,
                onChanged: mode == 'BANK_ONLY' || mode == 'BOTH'
                    ? (value) => setDialogState(() => bank = value)
                    : null,
                title: const Text('Activate bank collection'),
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
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      await _run(() async {
        final repository = ref.read(platformRepositoryProvider);
        await repository.updateCollectionMode(tenant.id, mode);
        await repository.updateCollectionSettings(
          tenant.id,
          mobileMoneyActive: mobile,
          bankActive: bank,
        );
      }, 'Collection controls updated.');
    }
  }

  Future<void> _assignOfficial(
    SaccoLifecycleData data,
    String office,
    String currentMemberId,
  ) async {
    if (data.members.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add SACCO members before assigning officials.'),
        ),
      );
      return;
    }
    var memberId = currentMemberId.isEmpty
        ? data.members.first.id
        : currentMemberId;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Assign ${label(office)}'),
          content: DropdownButtonFormField<String>(
            initialValue: memberId,
            isExpanded: true,
            items: data.members
                .map(
                  (member) => DropdownMenuItem(
                    value: member.id,
                    child: Text(member.name),
                  ),
                )
                .toList(),
            onChanged: (value) =>
                setDialogState(() => memberId = value ?? memberId),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      await _run(
        () => ref
            .read(platformRepositoryProvider)
            .assignOfficial(data.tenant.id, office, memberId),
        '${label(office)} updated.',
      );
    }
  }

  Future<void> _addAccount(TenantLifecycleDetail tenant) async {
    var channel = 'mobile_money';
    final network = TextEditingController();
    final accountName = TextEditingController();
    final accountNumber = TextEditingController();
    final bankName = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add collection account'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: channel,
                  items: const [
                    DropdownMenuItem(
                      value: 'mobile_money',
                      child: Text('Mobile money'),
                    ),
                    DropdownMenuItem(value: 'bank', child: Text('Bank')),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => channel = value ?? channel),
                ),
                _field(network, 'Network (MTN/Airtel)'),
                _field(accountName, 'Account name'),
                _field(accountNumber, 'Account number'),
                if (channel == 'bank') _field(bankName, 'Bank name'),
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
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      await _run(
        () =>
            ref.read(platformRepositoryProvider).addPaymentAccount(tenant.id, {
              'channel': channel,
              'network': network.text.trim(),
              'accountName': accountName.text.trim(),
              'accountNumber': accountNumber.text.trim(),
              'bankName': bankName.text.trim(),
              'active': true,
            }),
        'Collection account added.',
      );
    }
    network.dispose();
    accountName.dispose();
    accountNumber.dispose();
    bankName.dispose();
  }

  Future<void> _toggleAccount(SaccoPaymentAccountItem account, bool active) =>
      _run(
        () => ref
            .read(platformRepositoryProvider)
            .updatePaymentAccount(widget.tenantId, account, active),
        'Collection account updated.',
      );

  Future<void> _deleteTenant(TenantLifecycleDetail tenant) async {
    final confirmation = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Delete ${tenant.name}?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'This is permanent. Type the SACCO code exactly to continue.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmation,
              decoration: InputDecoration(labelText: tenant.code),
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
            child: const Text('Delete permanently'),
          ),
        ],
      ),
    );
    if (submit == true && mounted) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .deleteTenant(tenant.id, confirmation.text.trim());
        if (mounted) {
          Navigator.pop(context, true);
        }
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    confirmation.dispose();
  }

  Widget _field(TextEditingController controller, String labelText) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: controller,
      decoration: InputDecoration(labelText: labelText),
    ),
  );
}

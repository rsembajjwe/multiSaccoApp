import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';
import 'sacco_lifecycle_screen.dart';

class SaccosScreen extends ConsumerStatefulWidget {
  const SaccosScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  ConsumerState<SaccosScreen> createState() => _SaccosScreenState();
}

class _SaccosScreenState extends ConsumerState<SaccosScreen> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fleet = ref.watch(fleetProvider(_query));
    return Scaffold(
      appBar: AppBar(
        title: const Text('SACCO directory'),
        actions: [
          if (widget.session.can('tenants:manage'))
            IconButton(
              tooltip: 'Register SACCO',
              onPressed: _register,
              icon: const Icon(Icons.add_business),
            ),
        ],
      ),
      floatingActionButton: widget.session.can('tenants:manage')
          ? FloatingActionButton.extended(
              heroTag: 'register-sacco',
              onPressed: _register,
              icon: const Icon(Icons.add),
              label: const Text('Register'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              onSubmitted: (value) => setState(() => _query = value.trim()),
              decoration: InputDecoration(
                hintText: 'Name, code, registration number or district',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  onPressed: () {
                    _search.clear();
                    setState(() => _query = '');
                  },
                  icon: const Icon(Icons.clear),
                ),
              ),
            ),
          ),
          Expanded(
            child: AsyncPane(
              value: fleet,
              onRetry: () => ref.invalidate(fleetProvider(_query)),
              builder: (page) => page.items.isEmpty
                  ? const Center(child: Text('No SACCOs match this search.'))
                  : RefreshIndicator(
                      onRefresh: () async =>
                          ref.invalidate(fleetProvider(_query)),
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                        itemCount: page.items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (_, index) => _TenantCard(
                          item: page.items[index],
                          canManage: widget.session.can('tenants:manage'),
                          onStatus: _changeStatus,
                          onOpen: _openSacco,
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _changeStatus(TenantFleetItem item, String status) async {
    final reason = await reasonDialog(
      context,
      title: '${label(status)} ${item.name}?',
      actionLabel: label(status),
    );
    if (reason == null || !mounted) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .updateTenantStatus(item.id, status);
      ref.invalidate(fleetProvider(_query));
      ref.invalidate(fleetSummaryProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${item.name} is now ${label(status)}.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _register() async {
    final created = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const RegistrationWizard()),
    );
    if (created == true) {
      ref.invalidate(fleetProvider(_query));
      ref.invalidate(fleetSummaryProvider);
    }
  }

  Future<void> _openSacco(TenantFleetItem item) async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            SaccoLifecycleScreen(tenantId: item.id, session: widget.session),
      ),
    );
    if (changed == true) {
      ref.invalidate(fleetProvider(_query));
      ref.invalidate(fleetSummaryProvider);
    }
  }
}

class _TenantCard extends StatelessWidget {
  const _TenantCard({
    required this.item,
    required this.canManage,
    required this.onStatus,
    required this.onOpen,
  });
  final TenantFleetItem item;
  final bool canManage;
  final Future<void> Function(TenantFleetItem, String) onStatus;
  final ValueChanged<TenantFleetItem> onOpen;

  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      onTap: () => onOpen(item),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  child: Text(item.code.isEmpty ? 'S' : item.code[0]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        '${item.code} • ${item.district.isEmpty ? 'District not set' : item.district}',
                      ),
                    ],
                  ),
                ),
                StatusPill(item.health),
              ],
            ),
            const SizedBox(height: 14),
            Text(item.healthReason),
            const SizedBox(height: 12),
            Row(
              children: [
                StatusPill(item.status),
                const SizedBox(width: 8),
                StatusPill(item.subscriptionStatus),
                const Spacer(),
                Text(
                  '${item.onboarding}% setup',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            if (canManage) ...[
              const Divider(height: 24),
              Align(
                alignment: Alignment.centerRight,
                child: PopupMenuButton<String>(
                  onSelected: (status) => onStatus(item, status),
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'active', child: Text('Activate')),
                    PopupMenuItem(
                      value: 'pending_review',
                      child: Text('Return to review'),
                    ),
                    PopupMenuItem(
                      value: 'suspended',
                      child: Text('Suspend access'),
                    ),
                  ],
                  child: const Chip(
                    avatar: Icon(Icons.manage_accounts, size: 18),
                    label: Text('Lifecycle action'),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

class RegistrationWizard extends ConsumerStatefulWidget {
  const RegistrationWizard({super.key});

  @override
  ConsumerState<RegistrationWizard> createState() => _RegistrationWizardState();
}

class _RegistrationWizardState extends ConsumerState<RegistrationWizard> {
  int _step = 0;
  bool _saving = false;
  final _name = TextEditingController();
  final _registration = TextEditingController();
  final _district = TextEditingController();
  final _parish = TextEditingController();
  final _phone = TextEditingController();
  final _adminName = TextEditingController();
  final _adminEmail = TextEditingController();
  final _adminPhone = TextEditingController();
  final _treasurerName = TextEditingController();
  final _treasurerEmail = TextEditingController();
  final _treasurerPhone = TextEditingController();
  final _secretaryName = TextEditingController();
  final _secretaryEmail = TextEditingController();
  final _secretaryPhone = TextEditingController();
  String _delivery = 'email';
  String _treasurerDelivery = 'email';
  String _secretaryDelivery = 'email';
  String _package = '';
  bool _paid = false;

  @override
  void dispose() {
    for (final controller in [
      _name,
      _registration,
      _district,
      _parish,
      _phone,
      _adminName,
      _adminEmail,
      _adminPhone,
      _treasurerName,
      _treasurerEmail,
      _treasurerPhone,
      _secretaryName,
      _secretaryEmail,
      _secretaryPhone,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final packages = ref.watch(packagesProvider).asData?.value ?? const [];
    _package = _package.isEmpty && packages.isNotEmpty
        ? packages.first.id
        : _package;
    SubscriptionPackage? selectedPackage;
    for (final item in packages) {
      if (item.id == _package) selectedPackage = item;
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Register SACCO')),
      body: Stepper(
        currentStep: _step,
        onStepContinue: _step < 3 ? () => setState(() => _step++) : _save,
        onStepCancel: _step == 0 ? null : () => setState(() => _step--),
        controlsBuilder: (context, details) => Padding(
          padding: const EdgeInsets.only(top: 20),
          child: Row(
            children: [
              FilledButton(
                onPressed: _saving ? null : details.onStepContinue,
                child: Text(_step == 3 ? 'Create and invite' : 'Continue'),
              ),
              if (_step > 0)
                TextButton(
                  onPressed: details.onStepCancel,
                  child: const Text('Back'),
                ),
            ],
          ),
        ),
        steps: [
          Step(
            title: const Text('Organisation'),
            isActive: _step >= 0,
            content: Column(
              children: [
                _field(_name, 'Organisation name', required: true),
                _field(_registration, 'Registration number'),
                _field(_district, 'District', required: true),
                _field(_parish, 'Subcounty / parish'),
                _field(_phone, 'Organisation phone', phone: true),
              ],
            ),
          ),
          Step(
            title: const Text('SACCO officials'),
            isActive: _step >= 1,
            content: Column(
              children: [
                _officialSection(
                  'Chairperson',
                  _adminName,
                  _adminEmail,
                  _adminPhone,
                  _delivery,
                  (value) => setState(() => _delivery = value),
                ),
                _officialSection(
                  'Treasurer',
                  _treasurerName,
                  _treasurerEmail,
                  _treasurerPhone,
                  _treasurerDelivery,
                  (value) => setState(() => _treasurerDelivery = value),
                ),
                _officialSection(
                  'Secretary',
                  _secretaryName,
                  _secretaryEmail,
                  _secretaryPhone,
                  _secretaryDelivery,
                  (value) => setState(() => _secretaryDelivery = value),
                ),
              ],
            ),
          ),
          Step(
            title: const Text('Subscription'),
            isActive: _step >= 2,
            content: Column(
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _package.isEmpty ? null : _package,
                  decoration: const InputDecoration(labelText: 'Plan'),
                  items: packages
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.id,
                          child: Text(
                            item.isPerMember
                                ? '${item.name} • ${money(item.price)} per member'
                                : '${item.name} • ${money(item.price)} annually',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _package = value ?? ''),
                ),
                if (selectedPackage != null) ...[
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            selectedPackage.tierLabel,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            selectedPackage.isPerMember
                                ? '${money(selectedPackage.price)} per registered member each year.'
                                : '${money(selectedPackage.price)} for the full annual package. Partial payments are not accepted.',
                          ),
                          if (selectedPackage.modules.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(selectedPackage.modules),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
                SwitchListTile(
                  value: _paid,
                  onChanged: (value) => setState(() => _paid = value),
                  title: const Text('Payment already verified'),
                  subtitle: const Text(
                    'Otherwise start the controlled setup trial.',
                  ),
                ),
              ],
            ),
          ),
          Step(
            title: const Text('Review'),
            isActive: _step >= 3,
            content: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _name.text,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text('${_registration.text} • ${_district.text}'),
                    const Divider(),
                    Text('Chairperson: ${_adminName.text}'),
                    Text('Treasurer: ${_treasurerName.text}'),
                    Text('Secretary: ${_secretaryName.text}'),
                    const Text(
                      'Each official receives a temporary password through the selected email or SMS channel.',
                    ),
                    const Divider(),
                    Text(
                      'Plan: ${selectedPackage?.name ?? (_package.isEmpty ? 'Unassigned' : _package)}',
                    ),
                    if (selectedPackage != null)
                      Text(
                        selectedPackage.isPerMember
                            ? '${money(selectedPackage.price)} per registered member annually'
                            : '${money(selectedPackage.price)} payable in full annually',
                      ),
                    Text(
                      _paid
                          ? 'Payment verified'
                          : 'Setup trial / payment pending',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String labelText, {
    bool required = false,
    bool email = false,
    bool phone = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      controller: controller,
      keyboardType: email
          ? TextInputType.emailAddress
          : phone
          ? TextInputType.phone
          : TextInputType.text,
      decoration: InputDecoration(
        labelText: required ? '$labelText *' : labelText,
      ),
    ),
  );

  Widget _officialSection(
    String office,
    TextEditingController name,
    TextEditingController email,
    TextEditingController phone,
    String deliveryChannel,
    ValueChanged<String> onDeliveryChanged,
  ) => Card(
    margin: const EdgeInsets.only(bottom: 14),
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(office, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          _field(name, 'Full name', required: true),
          _field(email, 'Active email', email: true),
          _field(phone, 'Active telephone (+country code)', phone: true),
          DropdownButtonFormField<String>(
            initialValue: deliveryChannel,
            decoration: const InputDecoration(
              labelText: 'Temporary-password channel',
            ),
            items: const [
              DropdownMenuItem(value: 'email', child: Text('Email')),
              DropdownMenuItem(value: 'sms', child: Text('SMS')),
            ],
            onChanged: (value) => onDeliveryChanged(value ?? 'email'),
          ),
        ],
      ),
    ),
  );

  Future<void> _save() async {
    final officials = [
      _officialPayload(
        'chairperson',
        _adminName,
        _adminEmail,
        _adminPhone,
        _delivery,
      ),
      _officialPayload(
        'treasurer',
        _treasurerName,
        _treasurerEmail,
        _treasurerPhone,
        _treasurerDelivery,
      ),
      _officialPayload(
        'secretary',
        _secretaryName,
        _secretaryEmail,
        _secretaryPhone,
        _secretaryDelivery,
      ),
    ];
    final invalidOfficial = officials.any((official) {
      final email = '${official['email']}';
      final phone = '${official['phone']}';
      final channel = '${official['deliveryChannel']}';
      return '${official['fullName']}'.isEmpty ||
          (email.isEmpty && phone.isEmpty) ||
          (channel == 'email' && email.isEmpty) ||
          (channel == 'sms' && phone.isEmpty);
    });
    if (_name.text.trim().isEmpty ||
        _district.text.trim().isEmpty ||
        invalidOfficial) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Complete all organisation fields and provide each official with an active email or phone matching the selected delivery channel.',
          ),
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(platformRepositoryProvider).createTenant({
        'name': _name.text.trim(),
        'registrationNo': _registration.text.trim(),
        'district': _district.text.trim(),
        'parish': _parish.text.trim(),
        'contactNumber': _phone.text.trim(),
        'country': 'Uganda',
        'currencyCode': 'UGX',
        'currencyDigits': 0,
        'packageId': _package,
        'paymentStatus': _paid ? 'paid' : 'unpaid',
        'officials': officials,
      });
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Map<String, String> _officialPayload(
    String office,
    TextEditingController name,
    TextEditingController email,
    TextEditingController phone,
    String deliveryChannel,
  ) => {
    'office': office,
    'fullName': name.text.trim(),
    'email': email.text.trim(),
    'phone': phone.text.replaceAll(' ', '').trim(),
    'deliveryChannel': deliveryChannel,
  };
}

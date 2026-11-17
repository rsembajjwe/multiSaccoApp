import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class BillingAdministrationScreen extends ConsumerWidget {
  const BillingAdministrationScreen({super.key, required this.session});

  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) => DefaultTabController(
    length: 5,
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Billing administration'),
        bottom: const TabBar(
          isScrollable: true,
          tabs: [
            Tab(text: 'SMS inventory'),
            Tab(text: 'Rates'),
            Tab(text: 'SACCO items'),
            Tab(text: 'Sales'),
            Tab(text: 'Packages'),
          ],
        ),
      ),
      body: TabBarView(
        children: [
          _SmsInventoryTab(canManage: session.can('subscriptions:manage')),
          _RatesTab(canManage: session.can('subscriptions:manage')),
          _BillingItemsTab(canManage: session.can('subscriptions:manage')),
          const _SalesTab(),
          _PackagesTab(canManage: session.can('subscriptions:manage')),
        ],
      ),
    ),
  );
}

class _SmsInventoryTab extends ConsumerWidget {
  const _SmsInventoryTab({required this.canManage});

  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(smsInventoryProvider);
    return AsyncPane(
      value: inventory,
      onRetry: () => ref.invalidate(smsInventoryProvider),
      builder: (summary) => RefreshIndicator(
        onRefresh: () => ref.refresh(smsInventoryProvider.future),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _alertCard(context, summary),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'AfroSMS supply',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        StatusPill(summary.providerStatus),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _line('Cash balance', money(summary.providerBalance)),
                    _line('Supply cost per SMS', money(summary.providerUnitCost)),
                    _line(
                      'Available provider SMS',
                      _count(summary.providerAvailableCredits),
                      bold: true,
                    ),
                    _line('Low-stock threshold', _count(summary.lowStockThreshold)),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Customer credit commitments',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _line('SACCO wallet credits', _count(summary.saccoCreditsOutstanding)),
                    _line('Member wallet credits', _count(summary.memberCreditsOutstanding)),
                    _line('Total credits owed', _count(summary.totalCreditsOutstanding)),
                    const Divider(),
                    _line(
                      'Uncommitted reserve',
                      _count(summary.reserveCredits),
                      bold: true,
                    ),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pricing and sales',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _line('SACCO selling rate', money(summary.saccoSellingRate)),
                    _line('Gross margin per SMS', money(summary.grossMarginPerSms)),
                    _line('Gross margin', '${summary.grossMarginPercent.toStringAsFixed(2)}%'),
                    _line('Credits sold to date', _count(summary.totalCreditsSold)),
                    _line('Recorded SMS revenue', money(summary.totalSalesRevenue)),
                  ],
                ),
              ),
            ),
            if (canManage)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: FilledButton.icon(
                  onPressed: () => _editSettings(context, ref, summary),
                  icon: const Icon(Icons.tune),
                  label: const Text('Configure SMS pricing and warning'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _alertCard(BuildContext context, SmsInventorySummary summary) {
    final critical = summary.alertLevel == 'critical';
    final warning = summary.alertLevel == 'warning';
    final color = critical
        ? Theme.of(context).colorScheme.error
        : warning
        ? Colors.orange.shade800
        : Colors.green.shade700;
    return Card(
      color: color.withValues(alpha: 0.10),
      child: ListTile(
        leading: Icon(
          critical
              ? Icons.error_outline
              : warning
              ? Icons.warning_amber_rounded
              : Icons.check_circle_outline,
          color: color,
        ),
        title: Text(
          label(summary.alertCode),
          style: TextStyle(fontWeight: FontWeight.w900, color: color),
        ),
        subtitle: Text(
          summary.suggestedTopUpAmount > 0
              ? '${summary.alertMessage}\nSuggested top-up: ${money(summary.suggestedTopUpAmount)}'
              : summary.alertMessage,
        ),
        isThreeLine: summary.suggestedTopUpAmount > 0,
      ),
    );
  }

  Widget _line(String title, String value, {bool bold = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      children: [
        Expanded(child: Text(title)),
        Text(
          value,
          style: TextStyle(fontWeight: bold ? FontWeight.w900 : null),
        ),
      ],
    ),
  );

  String _count(int value) => NumberFormat.decimalPattern().format(value);

  Future<void> _editSettings(
    BuildContext context,
    WidgetRef ref,
    SmsInventorySummary summary,
  ) async {
    final providerCost = TextEditingController(
      text: '${summary.providerUnitCost}',
    );
    final sellingRate = TextEditingController(
      text: '${summary.saccoSellingRate}',
    );
    final threshold = TextEditingController(
      text: '${summary.lowStockThreshold}',
    );
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('SMS inventory settings'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: providerCost,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'AfroSMS supply cost per SMS (UGX)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: sellingRate,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'SACCO selling rate per SMS (UGX)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: threshold,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Low-stock warning reserve (SMS)',
                  helperText: 'Warning uses provider capacity minus customer wallet credits.',
                ),
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
            child: const Text('Save'),
          ),
        ],
      ),
    );
    final cost = num.tryParse(providerCost.text.trim());
    final rate = num.tryParse(sellingRate.text.trim());
    final warningAt = int.tryParse(threshold.text.trim());
    providerCost.dispose();
    sellingRate.dispose();
    threshold.dispose();
    if (submit != true || cost == null || cost <= 0 || rate == null || rate <= 0 || warningAt == null || warningAt < 0) {
      return;
    }
    try {
      await ref.read(platformRepositoryProvider).updateSmsInventorySettings(
        providerUnitCost: cost,
        saccoSellingRate: rate,
        lowStockThreshold: warningAt,
      );
      ref.invalidate(smsInventoryProvider);
      ref.invalidate(billingCatalogProvider);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$error')),
        );
      }
    }
  }
}

class _RatesTab extends ConsumerWidget {
  const _RatesTab({required this.canManage});
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalog = ref.watch(billingCatalogProvider);
    return AsyncPane(
      value: catalog,
      onRetry: () => ref.invalidate(billingCatalogProvider),
      builder: (items) => ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (_, index) {
          final rate = items[index];
          return Card(
            child: ListTile(
              leading: const Icon(Icons.price_change_outlined),
              title: Text(
                rate.name,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(
                '${label(rate.category)} • ${label(rate.billingPeriod)}',
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    money(rate.unitPrice),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  StatusPill(rate.active ? 'active' : 'inactive'),
                ],
              ),
              onTap: canManage ? () => _edit(context, ref, rate) : null,
            ),
          );
        },
      ),
    );
  }

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref,
    BillingRate rate,
  ) async {
    final price = TextEditingController(text: '${rate.unitPrice}');
    bool active = rate.active;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(rate.name),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Unit price (UGX)',
                ),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: active,
                title: const Text('Available for billing'),
                onChanged: (value) => setState(() => active = value),
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
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    final amount = num.tryParse(price.text.trim());
    price.dispose();
    if (submit != true || amount == null || amount < 0) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .updateBillingRate(
            code: rate.code,
            unitPrice: amount,
            active: active,
          );
      ref.invalidate(billingCatalogProvider);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }
}

class _BillingItemsTab extends ConsumerStatefulWidget {
  const _BillingItemsTab({required this.canManage});
  final bool canManage;

  @override
  ConsumerState<_BillingItemsTab> createState() => _BillingItemsTabState();
}

class _BillingItemsTabState extends ConsumerState<_BillingItemsTab> {
  String _tenantId = '';
  Future<(List<TenantBillingItem>, TenantBillingSummary)>? _data;

  void _load() {
    if (_tenantId.isEmpty) return;
    setState(() {
      _data =
          Future.wait<dynamic>([
            ref.read(platformRepositoryProvider).billingItems(_tenantId),
            ref.read(platformRepositoryProvider).billingSummary(_tenantId),
          ]).then(
            (values) => (
              values[0] as List<TenantBillingItem>,
              values[1] as TenantBillingSummary,
            ),
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final fleet = ref.watch(fleetProvider(''));
    return fleet.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('$error')),
      data: (page) {
        if (_tenantId.isEmpty && page.items.isNotEmpty) {
          _tenantId = page.items.first.id;
          _data =
              Future.wait<dynamic>([
                ref.read(platformRepositoryProvider).billingItems(_tenantId),
                ref.read(platformRepositoryProvider).billingSummary(_tenantId),
              ]).then(
                (values) => (
                  values[0] as List<TenantBillingItem>,
                  values[1] as TenantBillingSummary,
                ),
              );
        }
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _tenantId.isEmpty ? null : _tenantId,
                      decoration: const InputDecoration(labelText: 'SACCO'),
                      items: page.items
                          .map(
                            (tenant) => DropdownMenuItem(
                              value: tenant.id,
                              child: Text(tenant.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        _tenantId = value ?? '';
                        _load();
                      },
                    ),
                  ),
                  if (widget.canManage) ...[
                    const SizedBox(width: 8),
                    IconButton.filledTonal(
                      tooltip: 'Add billing item',
                      onPressed: _tenantId.isEmpty ? null : _addItem,
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ],
              ),
            ),
            Expanded(
              child:
                  FutureBuilder<
                    (List<TenantBillingItem>, TenantBillingSummary)
                  >(
                    future: _data,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState != ConnectionState.done) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (snapshot.hasError) {
                        return Center(child: Text('${snapshot.error}'));
                      }
                      final items = snapshot.data?.$1 ?? const [];
                      final summary = snapshot.data?.$2;
                      return ListView(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                        children: [
                          if (summary != null) _summaryCard(summary),
                          const SizedBox(height: 10),
                          const Text(
                            'Assigned billing items',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          if (items.isEmpty)
                            const Card(
                              child: Padding(
                                padding: EdgeInsets.all(16),
                                child: Text(
                                  'No add-ons or service items assigned.',
                                ),
                              ),
                            ),
                          ...items.map(
                            (item) => Card(
                              child: ListTile(
                                title: Text(item.name),
                                subtitle: Text(
                                  '${item.quantity} × ${money(item.unitPrice)} • '
                                  '${label(item.billingPeriod)}',
                                ),
                                trailing:
                                    item.status == 'active' && widget.canManage
                                    ? IconButton(
                                        onPressed: () => _cancelItem(item),
                                        icon: const Icon(Icons.cancel_outlined),
                                      )
                                    : StatusPill(item.status),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
            ),
          ],
        );
      },
    );
  }

  Widget _summaryCard(TenantBillingSummary summary) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _line('Annual recurring', money(summary.annualRecurringTotal)),
          _line('One-time charges', money(summary.oneTimeTotal)),
          _line('Usage charges', money(summary.usageTotal)),
          const Divider(),
          _line('Composed bill', money(summary.total), bold: true),
        ],
      ),
    ),
  );

  Widget _line(String title, String value, {bool bold = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      children: [
        Expanded(child: Text(title)),
        Text(
          value,
          style: TextStyle(fontWeight: bold ? FontWeight.w900 : null),
        ),
      ],
    ),
  );

  Future<void> _addItem() async {
    final catalog = await ref.read(billingCatalogProvider.future);
    final options = catalog
        .where(
          (rate) =>
              rate.active &&
              const {
                'addon_module',
                'support',
                'setup',
              }.contains(rate.category),
        )
        .toList();
    if (options.isEmpty || !mounted) return;
    String code = options.first.code;
    final quantity = TextEditingController(text: '1');
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add SACCO billing item'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: code,
                decoration: const InputDecoration(labelText: 'Service'),
                items: options
                    .map(
                      (rate) => DropdownMenuItem(
                        value: rate.code,
                        child: Text('${rate.name} — ${money(rate.unitPrice)}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => code = value ?? code),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: quantity,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantity'),
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
              child: const Text('Add item'),
            ),
          ],
        ),
      ),
    );
    final count = int.tryParse(quantity.text.trim()) ?? 0;
    quantity.dispose();
    if (submit != true || count < 1) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .addBillingItem(
            tenantId: _tenantId,
            catalogCode: code,
            quantity: count,
          );
      _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _cancelItem(TenantBillingItem item) async {
    try {
      await ref
          .read(platformRepositoryProvider)
          .cancelBillingItem(item.id, _tenantId);
      _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }
}

class _SalesTab extends ConsumerWidget {
  const _SalesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final smsSales = ref.watch(smsSalesProvider);
    final payments = ref.watch(subscriptionPaymentsProvider);
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(smsSalesProvider);
        ref.invalidate(subscriptionPaymentsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'SMS credit sales',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
          ),
          smsSales.when(
            loading: () => const LinearProgressIndicator(),
            error: (error, _) => Text('$error'),
            data: (items) => items.isEmpty
                ? const Card(
                    child: ListTile(title: Text('No SMS sales recorded.')),
                  )
                : Column(children: items.take(50).map(_smsSale).toList()),
          ),
          const SizedBox(height: 18),
          const Text(
            'Subscription receipt evidence',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
          ),
          payments.when(
            loading: () => const LinearProgressIndicator(),
            error: (error, _) => Text('$error'),
            data: (items) => items.isEmpty
                ? const Card(
                    child: ListTile(title: Text('No receipts recorded.')),
                  )
                : Column(children: items.take(50).map(_receipt).toList()),
          ),
        ],
      ),
    );
  }

  Widget _smsSale(SmsSaleItem sale) => Card(
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.sms_outlined)),
      title: Text('${sale.quantity} SMS • ${money(sale.amount)}'),
      subtitle: Text('${sale.tenantId}\nReceipt ${sale.reference}'),
      isThreeLine: true,
      trailing: sale.createdAt == null
          ? null
          : Text(DateFormat('dd MMM').format(sale.createdAt!.toLocal())),
    ),
  );

  Widget _receipt(SubscriptionPaymentItem payment) => Card(
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.receipt_long_outlined)),
      title: Text('${money(payment.amount)} • ${label(payment.channel)}'),
      subtitle: Text('${payment.tenantId}\nReceipt ${payment.reference}'),
      isThreeLine: true,
      trailing: payment.receivedAt == null
          ? null
          : Text(DateFormat('dd MMM').format(payment.receivedAt!.toLocal())),
    ),
  );
}

class _PackagesTab extends ConsumerWidget {
  const _PackagesTab({required this.canManage});
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final packages = ref.watch(adminPackagesProvider);
    return AsyncPane(
      value: packages,
      onRetry: () => ref.invalidate(adminPackagesProvider),
      builder: (items) => ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (_, index) {
          final package = items[index];
          return Card(
            child: ListTile(
              title: Text(
                package.name,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(
                '${package.tierLabel} • ${money(package.price)}\n'
                '${package.userLimit} users • ${package.branchLimit} branches',
              ),
              isThreeLine: true,
              trailing: StatusPill(package.status),
              onTap: canManage ? () => _edit(context, ref, package) : null,
            ),
          );
        },
      ),
    );
  }

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref,
    SubscriptionPackage package,
  ) async {
    final name = TextEditingController(text: package.name);
    final price = TextEditingController(text: '${package.price}');
    final minMembers = TextEditingController(text: '${package.minMembers}');
    final memberLimit = TextEditingController(text: '${package.memberLimit}');
    final tierLabel = TextEditingController(text: package.tierLabel);
    final userLimit = TextEditingController(text: '${package.userLimit}');
    final branchLimit = TextEditingController(text: '${package.branchLimit}');
    final modules = TextEditingController(text: package.modules);
    String period = package.billingPeriod;
    String status = package.status;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Configure ${package.name}'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: price,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Price (UGX)'),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: minMembers,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Minimum members',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: memberLimit,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Member limit',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: tierLabel,
                    decoration: const InputDecoration(labelText: 'Tier label'),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: userLimit,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Staff limit',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: branchLimit,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Branch limit',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: modules,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Included modules',
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: period,
                          decoration: const InputDecoration(
                            labelText: 'Billing period',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'annual',
                              child: Text('Annual'),
                            ),
                            DropdownMenuItem(
                              value: 'monthly',
                              child: Text('Monthly'),
                            ),
                          ],
                          onChanged: (value) =>
                              setState(() => period = value ?? period),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: status,
                          decoration: const InputDecoration(
                            labelText: 'Status',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'active',
                              child: Text('Active'),
                            ),
                            DropdownMenuItem(
                              value: 'inactive',
                              child: Text('Inactive'),
                            ),
                          ],
                          onChanged: (value) =>
                              setState(() => status = value ?? status),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Save package'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      final updated = SubscriptionPackage(
        id: package.id,
        name: name.text.trim(),
        price: num.tryParse(price.text) ?? -1,
        billingPeriod: period,
        minMembers: int.tryParse(minMembers.text) ?? -1,
        memberLimit: int.tryParse(memberLimit.text) ?? -1,
        tierLabel: tierLabel.text.trim(),
        modules: modules.text.trim(),
        userLimit: int.tryParse(userLimit.text) ?? 0,
        branchLimit: int.tryParse(branchLimit.text) ?? 0,
        status: status,
      );
      try {
        await ref.read(platformRepositoryProvider).updatePackage(updated);
        ref.invalidate(adminPackagesProvider);
        ref.invalidate(packagesProvider);
        ref.invalidate(subscriptionsProvider);
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    for (final controller in [
      name,
      price,
      minMembers,
      memberLimit,
      tierLabel,
      userLimit,
      branchLimit,
      modules,
    ]) {
      controller.dispose();
    }
  }
}

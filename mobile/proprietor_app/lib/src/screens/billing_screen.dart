import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';
import 'billing_administration_screen.dart';

class BillingScreen extends ConsumerWidget {
  const BillingScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref.watch(subscriptionsProvider);
    final packages =
        ref.watch(packagesProvider).asData?.value ??
        const <SubscriptionPackage>[];
    final catalog =
        ref.watch(billingCatalogProvider).asData?.value ??
        const <BillingRate>[];
    final smsRates = catalog.where((item) => item.code == 'sms_rate');
    final smsRate = smsRates.isEmpty ? null : smsRates.first;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff app billing'),
        actions: [
          if (session.can('subscriptions:view'))
            IconButton(
              tooltip: 'Billing administration',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BillingAdministrationScreen(session: session),
                ),
              ),
              icon: const Icon(Icons.settings_outlined),
            ),
          IconButton(
            onPressed: () => ref.invalidate(subscriptionsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: AsyncPane(
        value: subscriptions,
        onRetry: () => ref.invalidate(subscriptionsProvider),
        builder: (items) {
          final collected = items.fold<num>(0, (sum, item) => sum + item.paid);
          final outstanding = items.fold<num>(
            0,
            (sum, item) => sum + item.balance,
          );
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(subscriptionsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _SmsRevenueCard(
                  rate: smsRate,
                  canManage: session.can('subscriptions:manage'),
                  onSetRate: () => _setSmsRate(context, ref, smsRate),
                  onRecordCash: () =>
                      _recordSmsCashPayment(context, ref, items, smsRate),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: MetricCard(
                        label: 'Collected',
                        value: money(collected),
                        icon: Icons.savings_outlined,
                        tone: const Color(0xFF087F5B),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: MetricCard(
                        label: 'Outstanding',
                        value: money(outstanding),
                        icon: Icons.pending_actions,
                        tone: const Color(0xFFC92A2A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  '${items.length} SACCO staff-app subscription account(s)',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                if (items.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('No subscription accounts found.'),
                    ),
                  ),
                ...items.map(
                  (item) => _SubscriptionCard(
                    subscription: item,
                    canManage: session.can('subscriptions:manage'),
                    onRecordPayment: () => _recordPayment(context, ref, item),
                    onExtendTrial: () => _extendTrial(context, ref, item),
                    onUpgrade: () =>
                        _upgradePackage(context, ref, item, packages),
                    canUpgrade: _upgradeOptions(item, packages).isNotEmpty,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _setSmsRate(
    BuildContext context,
    WidgetRef ref,
    BillingRate? current,
  ) async {
    final controller = TextEditingController(
      text: current == null ? '' : '${current.unitPrice}',
    );
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Set SMS selling rate'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Price per SMS (UGX)',
            helperText: 'Used for cash and mobile-money purchases.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Save rate'),
          ),
        ],
      ),
    );
    final rate = num.tryParse(controller.text.trim());
    controller.dispose();
    if (submit != true || rate == null || rate <= 0) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .updateBillingRate(code: 'sms_rate', unitPrice: rate, active: true);
      ref.invalidate(billingCatalogProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('SMS selling rate updated.')),
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

  Future<void> _recordSmsCashPayment(
    BuildContext context,
    WidgetRef ref,
    List<PlatformSubscription> subscriptions,
    BillingRate? smsRate,
  ) async {
    if (subscriptions.isEmpty || smsRate == null || smsRate.unitPrice <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Set the SMS rate and register a SACCO first.'),
        ),
      );
      return;
    }
    String tenantId = subscriptions.first.tenantId;
    final credits = TextEditingController(text: '100');
    final reference = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) {
          final count = int.tryParse(credits.text.trim()) ?? 0;
          return AlertDialog(
            title: const Text('Record cash SMS purchase'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: tenantId,
                  decoration: const InputDecoration(labelText: 'SACCO'),
                  items: subscriptions
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.tenantId,
                          child: Text(item.tenantId),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => tenantId = value ?? tenantId),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: credits,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'SMS credits'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Cash received: ${money(count * smsRate.unitPrice)}',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reference,
                  decoration: const InputDecoration(
                    labelText: 'Cash receipt reference',
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
                child: const Text('Credit SMS wallet'),
              ),
            ],
          );
        },
      ),
    );
    final count = int.tryParse(credits.text.trim()) ?? 0;
    final receipt = reference.text.trim();
    credits.dispose();
    reference.dispose();
    if (submit != true || count <= 0 || receipt.isEmpty) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .recordSmsCashPayment(
            tenantId: tenantId,
            smsCount: count,
            reference: receipt,
          );
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$count SMS credits added.')));
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _recordPayment(
    BuildContext context,
    WidgetRef ref,
    PlatformSubscription subscription,
  ) async {
    final amount = TextEditingController(text: '${subscription.balance}');
    final reference = TextEditingController();
    String channel = 'bank';
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Record verified payment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amount,
                readOnly: subscription.unitPrice == null,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Amount (UGX)',
                  helperText: subscription.unitPrice == null
                      ? 'Fixed packages must be paid in one full payment.'
                      : 'Per-member packages may be paid as members are registered.',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: channel,
                decoration: const InputDecoration(labelText: 'Channel'),
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('Cash receipt')),
                  DropdownMenuItem(value: 'bank', child: Text('Bank deposit')),
                  DropdownMenuItem(
                    value: 'mobile_money',
                    child: Text('Mobile money'),
                  ),
                  DropdownMenuItem(
                    value: 'manual',
                    child: Text('Approved manual payment'),
                  ),
                ],
                onChanged: (value) => setState(() => channel = value ?? 'bank'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reference,
                decoration: const InputDecoration(
                  labelText: 'External reference',
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
              child: const Text('Record payment'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .recordPayment(
              subscriptionId: subscription.id,
              amount: num.tryParse(amount.text) ?? 0,
              channel: channel,
              reference: reference.text.trim(),
            );
        ref.invalidate(subscriptionsProvider);
        ref.invalidate(fleetSummaryProvider);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment recorded and audited.')),
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
    amount.dispose();
    reference.dispose();
  }

  List<SubscriptionPackage> _upgradeOptions(
    PlatformSubscription subscription,
    List<SubscriptionPackage> packages,
  ) {
    final current = packages.where((item) => item.id == subscription.packageId);
    final currentLimit = current.isEmpty ? -1 : current.first.memberLimit;
    return packages
        .where((item) => item.memberLimit > currentLimit)
        .toList(growable: false);
  }

  Future<void> _upgradePackage(
    BuildContext context,
    WidgetRef ref,
    PlatformSubscription subscription,
    List<SubscriptionPackage> packages,
  ) async {
    final options = _upgradeOptions(subscription, packages);
    if (options.isEmpty) return;
    String packageId = options.first.id;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) {
          final selected = options.firstWhere((item) => item.id == packageId);
          return AlertDialog(
            title: const Text('Upgrade package'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: packageId,
                  decoration: const InputDecoration(labelText: 'New package'),
                  items: options
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.id,
                          child: Text('${item.name} • ${item.tierLabel}'),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => packageId = value ?? packageId),
                ),
                const SizedBox(height: 12),
                Text('${money(selected.price)} payable in full annually.'),
                const SizedBox(height: 4),
                Text(selected.modules),
                const SizedBox(height: 8),
                const Text(
                  'Existing verified payments are credited. The remaining upgraded-package balance must be paid at once.',
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
                child: const Text('Upgrade'),
              ),
            ],
          );
        },
      ),
    );
    if (submit != true) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .upgradeSubscription(
            subscriptionId: subscription.id,
            packageId: packageId,
          );
      ref.invalidate(subscriptionsProvider);
      ref.invalidate(fleetProvider);
      ref.invalidate(fleetSummaryProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Subscription package upgraded.')),
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

  Future<void> _extendTrial(
    BuildContext context,
    WidgetRef ref,
    PlatformSubscription subscription,
  ) async {
    final days = TextEditingController(text: '7');
    final reason = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Extend free access'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: days,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Extension days (1-31)',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reason,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Reason',
                hintText: 'Required for the audit trail',
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
            child: const Text('Extend'),
          ),
        ],
      ),
    );
    final extensionDays = int.tryParse(days.text);
    final extensionReason = reason.text.trim();
    if (submit == true) {
      if (extensionDays == null ||
          extensionDays < 1 ||
          extensionDays > 31 ||
          extensionReason.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Enter 1-31 days and an extension reason.'),
            ),
          );
        }
      } else {
        try {
          await ref
              .read(platformRepositoryProvider)
              .extendTrial(
                subscriptionId: subscription.id,
                days: extensionDays,
                reason: extensionReason,
              );
          ref.invalidate(subscriptionsProvider);
          ref.invalidate(fleetSummaryProvider);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Free access extension recorded.')),
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
    }
    days.dispose();
    reason.dispose();
  }
}

class _SmsRevenueCard extends StatelessWidget {
  const _SmsRevenueCard({
    required this.rate,
    required this.canManage,
    required this.onSetRate,
    required this.onRecordCash,
  });

  final BillingRate? rate;
  final bool canManage;
  final VoidCallback onSetRate;
  final VoidCallback onRecordCash;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sms_outlined),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'SMS revenue',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                rate == null
                    ? 'Not configured'
                    : '${money(rate!.unitPrice)} / SMS',
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'The proprietor controls the selling rate. SACCO cash purchases are recorded here; mobile-money purchases remain available in the staff app.',
          ),
          if (canManage) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: onSetRate,
                  icon: const Icon(Icons.price_change_outlined),
                  label: const Text('Set SMS rate'),
                ),
                FilledButton.tonalIcon(
                  onPressed: onRecordCash,
                  icon: const Icon(Icons.payments_outlined),
                  label: const Text('Record cash purchase'),
                ),
              ],
            ),
          ],
        ],
      ),
    ),
  );
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({
    required this.subscription,
    required this.canManage,
    required this.onRecordPayment,
    required this.onExtendTrial,
    required this.onUpgrade,
    required this.canUpgrade,
  });
  final PlatformSubscription subscription;
  final bool canManage;
  final VoidCallback onRecordPayment;
  final VoidCallback onExtendTrial;
  final VoidCallback onUpgrade;
  final bool canUpgrade;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  subscription.tenantId,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              StatusPill(subscription.status),
            ],
          ),
          const SizedBox(height: 6),
          Text('${subscription.packageId} • Invoice ${subscription.invoice}'),
          const SizedBox(height: 4),
          Text(
            subscription.billingDescription.isEmpty
                ? subscription.tierLabel
                : subscription.billingDescription,
          ),
          const SizedBox(height: 4),
          Text(
            subscription.status == 'trial'
                ? 'Staff app is in its free-access period'
                : 'Staff-app billing basis: ${subscription.memberCount} registered member(s)',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (subscription.expiry != null)
            Text(
              'Access until ${subscription.expiry!.toLocal().toString().split(' ').first}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          const SizedBox(height: 14),
          LinearProgressIndicator(
            value: subscription.amount <= 0
                ? 0
                : (subscription.paid / subscription.amount)
                      .clamp(0, 1)
                      .toDouble(),
            minHeight: 8,
            borderRadius: BorderRadius.circular(99),
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              Text('Paid ${money(subscription.paid)}'),
              const Spacer(),
              Text(
                'Due ${money(subscription.balance)}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ],
          ),
          if (canManage && subscription.balance > 0) ...[
            const Divider(height: 24),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.tonalIcon(
                onPressed: onRecordPayment,
                icon: const Icon(Icons.verified_outlined),
                label: const Text('Verify payment'),
              ),
            ),
          ],
          if (canManage && canUpgrade) ...[
            const Divider(height: 24),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: onUpgrade,
                icon: const Icon(Icons.upgrade),
                label: const Text('Upgrade package'),
              ),
            ),
          ],
          if (canManage &&
              (subscription.status == 'trial' ||
                  subscription.status == 'expired')) ...[
            const Divider(height: 24),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: onExtendTrial,
                icon: const Icon(Icons.more_time),
                label: const Text('Extend free access'),
              ),
            ),
          ],
        ],
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class BillingScreen extends ConsumerWidget {
  const BillingScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptions = ref.watch(subscriptionsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Billing & subscriptions'),
        actions: [
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
                  '${items.length} subscription account(s)',
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
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
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
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount (UGX)'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: channel,
                decoration: const InputDecoration(labelText: 'Channel'),
                items: const [
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
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({
    required this.subscription,
    required this.canManage,
    required this.onRecordPayment,
  });
  final PlatformSubscription subscription;
  final bool canManage;
  final VoidCallback onRecordPayment;

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
        ],
      ),
    ),
  );
}

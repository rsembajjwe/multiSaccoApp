import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class PaymentOperationsScreen extends ConsumerStatefulWidget {
  const PaymentOperationsScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  ConsumerState<PaymentOperationsScreen> createState() =>
      _PaymentOperationsScreenState();
}

class _PaymentOperationsScreenState
    extends ConsumerState<PaymentOperationsScreen> {
  bool _reconciling = false;

  @override
  Widget build(BuildContext context) {
    final evidence = ref.watch(paymentOperationsEvidenceProvider);
    final payments = widget.session.can('subscriptions:view')
        ? ref.watch(subscriptionPaymentsProvider)
        : null;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment operations'),
        actions: [
          IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            evidence.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _ErrorCard('$error'),
              data: _evidenceBody,
            ),
            if (payments != null) ...[
              const SizedBox(height: 18),
              const Text(
                'Recent subscription collections',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 10),
              payments.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => _ErrorCard('$error'),
                data: (items) => items.isEmpty
                    ? const _ErrorCard('No subscription payments recorded.')
                    : Column(
                        children: items.take(20).map(_paymentCard).toList(),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _evidenceBody(PaymentOperationsEvidence evidence) {
    final mobileMoney = evidence.mobileMoney;
    final reconciliation = mobileMoney.reconciliation;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Mobile-money evidence',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
            ),
            StatusPill(mobileMoney.status),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: MetricCard(
                label: 'Pending',
                value: '${mobileMoney.pendingPaymentRequests}',
                icon: Icons.hourglass_top,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: MetricCard(
                label: 'Failed',
                value: '${mobileMoney.failedPaymentRequests}',
                icon: Icons.error_outline,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: MetricCard(
                label: 'Posted',
                value: '${mobileMoney.postedPaymentRequests}',
                icon: Icons.check_circle_outline,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: MetricCard(
                label: 'Callbacks',
                value: '${mobileMoney.callbacksReceived}',
                icon: Icons.webhook,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Callback controls',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                _line(
                  'Pending approval',
                  '${mobileMoney.callbacksPendingApproval}',
                ),
                _line('Posted callbacks', '${mobileMoney.callbacksPosted}'),
                _line('Total requests', '${mobileMoney.paymentRequests}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Configured providers',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        if (mobileMoney.providers.isEmpty)
          const _ErrorCard('No mobile-money providers are configured.')
        else
          ...mobileMoney.providers.map(
            (provider) => Card(
              child: ListTile(
                leading: Icon(
                  provider.available ? Icons.check_circle : Icons.cancel,
                  color: provider.available ? Colors.green : Colors.red,
                ),
                title: Text(
                  provider.name,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text('${provider.network} - ${provider.providerId}'),
                trailing: StatusPill(
                  provider.available ? 'available' : 'unavailable',
                ),
              ),
            ),
          ),
        const SizedBox(height: 12),
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
                        'Last reconciliation',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                    StatusPill(reconciliation.status),
                  ],
                ),
                const SizedBox(height: 8),
                Text(reconciliation.message),
                const SizedBox(height: 8),
                _line('Scanned', '${reconciliation.scanned}'),
                _line('Updated', '${reconciliation.updated}'),
                _line('Failed', '${reconciliation.failed}'),
                if (reconciliation.ranAt != null)
                  _line(
                    'Completed',
                    DateFormat(
                      'dd MMM yyyy, HH:mm',
                    ).format(reconciliation.ranAt!.toLocal()),
                  ),
                if (widget.session.can('notifications:manage')) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _reconciling ? null : _runReconciliation,
                      icon: _reconciling
                          ? const SizedBox.square(
                              dimension: 17,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.sync),
                      label: Text(
                        _reconciling
                            ? 'Reconciling...'
                            : 'Run reconciliation now',
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _paymentCard(SubscriptionPaymentItem payment) => Card(
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.payments_outlined)),
      title: Text(
        money(payment.amount),
        style: const TextStyle(fontWeight: FontWeight.w900),
      ),
      subtitle: Text(
        '${payment.tenantId} - ${label(payment.channel)}\n${payment.reference}${payment.receivedAt == null ? '' : ' - ${DateFormat('dd MMM yyyy').format(payment.receivedAt!.toLocal())}'}',
      ),
      isThreeLine: true,
    ),
  );

  Widget _line(String name, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        Expanded(child: Text(name)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
    ),
  );

  Future<void> _refresh() async {
    ref.invalidate(paymentOperationsEvidenceProvider);
    if (widget.session.can('subscriptions:view')) {
      ref.invalidate(subscriptionPaymentsProvider);
    }
    await ref.read(paymentOperationsEvidenceProvider.future);
  }

  Future<void> _runReconciliation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Run reconciliation?'),
        content: const Text(
          'This checks pending payment requests directly with configured mobile-money providers.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Run now'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _reconciling = true);
    try {
      final result = await ref
          .read(platformRepositoryProvider)
          .runMobileMoneyReconciliation();
      ref.invalidate(paymentOperationsEvidenceProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Reconciliation ${result.status}: ${result.updated} updated, ${result.failed} failed.',
            ),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _reconciling = false);
    }
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard(this.message);
  final String message;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: const EdgeInsets.all(16), child: Text(message)),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// The SACCO's platform subscription: status, member capacity and billing,
/// with pay-balance and top-up-members actions.
class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key, required this.canPay});
  final bool canPay;

  @override
  ConsumerState<SubscriptionScreen> createState() =>
      _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  bool _busy = false;

  Future<void> _mobileMoneyPay(Subscription sub,
      {num? amount, int? memberSlots}) async {
    final payAmount = memberSlots != null && memberSlots > 0
        ? sub.unitPrice * memberSlots
        : (amount ?? sub.balanceDue);
    final payment = await showDialog<_MobileMoneyDetails>(
      context: context,
      builder: (_) => const _PhoneDialog(title: 'Platform subscription payment'),
    );
    if (payment == null || payment.phone.trim().isEmpty) return;
    if (!mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Send platform payment prompt?',
      message:
          'Send a ${Fmt.money(payAmount)} ${payment.provider.toUpperCase()} mobile money prompt to ${payment.phone.trim()} for the SACCO platform subscription.',
      confirmLabel: 'Send prompt',
      icon: Icons.account_balance_wallet_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      final request = await ref
          .read(adminRepositoryProvider)
          .requestSaccoSubscriptionMobileMoney(
            amount: payAmount,
            payerPhone: payment.phone,
            provider: payment.provider,
          );
      ref.invalidate(mobileMoneyPaymentRequestsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Mobile-money prompt sent: ${request.externalReference}')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pay(Subscription sub, {num? amount, int? memberSlots}) async {
    final payAmount = memberSlots != null && memberSlots > 0
        ? sub.unitPrice * memberSlots
        : (amount ?? sub.balanceDue);
    final confirmed = await confirmAction(
      context,
      title: 'Record received payment?',
      message:
          'Record ${Fmt.money(payAmount)} as already received for this SACCO platform subscription.',
      confirmLabel: 'Record payment',
      icon: Icons.edit_note_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .paySubscription(sub.id, amount: amount, memberSlots: memberSlots);
      ref.invalidate(subscriptionsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Payment received. Subscription updated.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _topUpDialog(Subscription sub) async {
    final controller = TextEditingController(
        text: sub.uncoveredMembers > 0 ? '${sub.uncoveredMembers}' : '1');
    final slots = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Top up members'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
                'Add cover for more members at ${Fmt.money(sub.unitPrice)} each.',
                style: Theme.of(ctx).textTheme.bodySmall),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                  labelText: 'Number of members', prefixIcon: Icon(Icons.groups_outlined)),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final n = int.tryParse(controller.text.trim()) ?? 0;
              Navigator.pop(ctx, n > 0 ? n : null);
            },
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (slots != null && slots > 0) {
      await _mobileMoneyPay(sub, memberSlots: slots);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(subscriptionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load your subscription.',
          detail: '$e',
          onRetry: () => ref.invalidate(subscriptionsProvider),
        ),
        data: (subs) {
          if (subs.isEmpty) {
            return const EmptyState(
                icon: Icons.workspace_premium_outlined,
                message: 'No subscription is on file for this SACCO yet.');
          }
          final sub = subs.first;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(subscriptionsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _StatusHeader(sub: sub),
                const SizedBox(height: 16),
                _CapacityCard(sub: sub),
                const SizedBox(height: 16),
                SectionCard(
                  title: 'Billing',
                  child: Column(
                    children: [
                      if (sub.tierLabel.isNotEmpty)
                        KeyValueRow('Tier', sub.tierLabel),
                      if (sub.billingDescription.isNotEmpty)
                        KeyValueRow('Plan', sub.billingDescription),
                      KeyValueRow('Price per member', Fmt.money(sub.unitPrice)),
                      KeyValueRow('Amount due this cycle', Fmt.money(sub.amount)),
                      KeyValueRow('Paid', Fmt.money(sub.paid)),
                      KeyValueRow('Outstanding balance',
                          Fmt.money(sub.balanceDue),
                          emphasize: true),
                      KeyValueRow('Renews / expires', Fmt.date(sub.expiry)),
                      if (sub.daysToExpiry != null)
                        KeyValueRow('Days to expiry', '${sub.daysToExpiry}'),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                if (widget.canPay)
                  _PayActions(
                    sub: sub,
                    busy: _busy,
                    onPayBalance: () => _mobileMoneyPay(sub),
                    onTopUp: () => _topUpDialog(sub),
                    onRecordManual: () => _pay(sub),
                  )
                else
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                          'You can view the subscription, but only a SACCO administrator can make payments.',
                          style: Theme.of(context).textTheme.bodyMedium),
                    ),
                  ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.sub});
  final Subscription sub;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final state = sub.lifecycleState.isEmpty ? sub.status : sub.lifecycleState;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primary,
            Color.alphaBlend(Colors.black.withValues(alpha: 0.28), scheme.primary),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.workspace_premium_outlined,
                  color: scheme.onPrimary, size: 20),
              const SizedBox(width: 8),
              Text('Platform subscription',
                  style: TextStyle(
                      color: scheme.onPrimary, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          Text(Fmt.money(sub.balanceDue),
              style: TextStyle(
                  color: scheme.onPrimary,
                  fontSize: 26,
                  fontWeight: FontWeight.w800)),
          Text('outstanding balance',
              style: TextStyle(
                  color: scheme.onPrimary.withValues(alpha: 0.85),
                  fontSize: 12)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: scheme.onPrimary.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(Fmt.label(state),
                style: TextStyle(
                    color: scheme.onPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _CapacityCard extends StatelessWidget {
  const _CapacityCard({required this.sub});
  final Subscription sub;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cap = sub.paidMemberCapacity;
    final used = sub.memberCount;
    final fraction = cap > 0 ? (used / cap).clamp(0.0, 1.0).toDouble() : 1.0;
    final over = sub.uncoveredMembers;
    return SectionCard(
      title: 'Member capacity',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: BalanceCard(
                    label: 'Members',
                    value: '$used',
                    icon: Icons.groups_outlined,
                    color: const Color(0xFF0F766E)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: BalanceCard(
                    label: 'Paid capacity',
                    value: '$cap',
                    icon: Icons.verified_user_outlined,
                    color: const Color(0xFF3730A3)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: fraction,
              minHeight: 10,
              backgroundColor: scheme.surfaceContainerHighest,
              color: over > 0 ? const Color(0xFFB91C1C) : scheme.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
              over > 0
                  ? '$over member(s) are over your paid capacity. Top up to cover them.'
                  : 'All members are covered by your paid capacity.',
              style: TextStyle(
                  fontSize: 12,
                  color: over > 0
                      ? const Color(0xFFB91C1C)
                      : scheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _PayActions extends StatelessWidget {
  const _PayActions({
    required this.sub,
    required this.busy,
    required this.onPayBalance,
    required this.onTopUp,
    required this.onRecordManual,
  });
  final Subscription sub;
  final bool busy;
  final VoidCallback onPayBalance;
  final VoidCallback onTopUp;
  final VoidCallback onRecordManual;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: (busy || sub.balanceDue <= 0) ? null : onPayBalance,
            icon: busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.payments_outlined),
            label: Text(sub.balanceDue > 0
                ? 'Mobile money ${Fmt.money(sub.balanceDue)}'
                : 'Balance settled'),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: busy ? null : onTopUp,
            icon: const Icon(Icons.group_add_outlined),
            label: const Text('Top up members'),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: TextButton.icon(
            onPressed: (busy || sub.balanceDue <= 0) ? null : onRecordManual,
            icon: const Icon(Icons.edit_note_outlined),
            label: const Text('Record already received payment'),
          ),
        ),
        const SizedBox(height: 8),
        Text('Payments are collected by mobile money.',
            style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _MobileMoneyDetails {
  const _MobileMoneyDetails({required this.phone, required this.provider});

  final String phone;
  final String provider;
}

class _PhoneDialog extends StatefulWidget {
  const _PhoneDialog({required this.title});
  final String title;

  @override
  State<_PhoneDialog> createState() => _PhoneDialogState();
}

class _PhoneDialogState extends State<_PhoneDialog> {
  final _controller = TextEditingController(text: '+256');
  String _provider = 'mtn';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'mtn', label: Text('MTN')),
              ButtonSegment(value: 'airtel', label: Text('Airtel')),
            ],
            selected: {_provider},
            onSelectionChanged: (value) =>
                setState(() => _provider = value.first),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _controller,
            keyboardType: TextInputType.phone,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'Payer phone number',
              prefixIcon: Icon(Icons.phone_android_outlined),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_MobileMoneyDetails(
            phone: _controller.text.trim(),
            provider: _provider,
          )),
          child: const Text('Send prompt'),
        ),
      ],
    );
  }
}

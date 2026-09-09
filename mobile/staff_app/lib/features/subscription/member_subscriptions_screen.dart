import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class MemberSubscriptionsScreen extends ConsumerStatefulWidget {
  const MemberSubscriptionsScreen({
    super.key,
    required this.canManage,
    required this.canPrompt,
  });

  final bool canManage;
  final bool canPrompt;

  @override
  ConsumerState<MemberSubscriptionsScreen> createState() =>
      _MemberSubscriptionsScreenState();
}

class _MemberSubscriptionsScreenState
    extends ConsumerState<MemberSubscriptionsScreen> {
  String _filter = 'unpaid';
  final Set<String> _selected = {};
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(memberSubscriptionsProvider);
    final namesAsync = ref.watch(memberNamesProvider);
    final platformSubs = ref.watch(subscriptionsProvider).asData?.value;
    final platformSub = platformSubs == null || platformSubs.isEmpty
        ? null
        : platformSubs.first;
    final names = namesAsync.asData?.value ?? const <String, String>{};
    return Scaffold(
      appBar: AppBar(title: const Text('Member subscriptions')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load member subscriptions.',
          detail: '$e',
          onRetry: () => ref.invalidate(memberSubscriptionsProvider),
        ),
        data: (rows) {
          final visible = rows.where(_matchesFilter).toList();
          final unpaid = rows.where((s) => !s.isPaid).length;
          final paid = rows.length - unpaid;
          final int? remainingSlots = platformSub == null
              ? null
              : (platformSub.paidMemberCapacity - paid)
                  .clamp(0, 1 << 30)
                  .toInt();
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(memberSubscriptionsProvider);
              ref.invalidate(memberNamesProvider);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                _Summary(
                  paid: paid,
                  unpaid: unpaid,
                  paidCapacity: platformSub?.paidMemberCapacity,
                  remainingSlots: remainingSlots,
                ),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'unpaid', label: Text('Unpaid')),
                    ButtonSegment(value: 'paid', label: Text('Paid')),
                    ButtonSegment(value: 'all', label: Text('All')),
                  ],
                  selected: {_filter},
                  onSelectionChanged: (v) => setState(() {
                    _filter = v.first;
                    _selected.clear();
                  }),
                ),
                if (widget.canManage && _filter != 'paid') ...[
                  const SizedBox(height: 12),
                  _SelectedMembersPanel(
                    selectedCount: _selected.length,
                    selectedTotal: _selectedTotal(rows),
                    availableSlots: remainingSlots,
                    busy: _busy,
                    onActivatePaidSlots: _selected.isEmpty ||
                            _busy ||
                            remainingSlots == null ||
                            _selected.length > remainingSlots
                        ? null
                        : () => _activateSelectedUsingPaidSlots(rows),
                    onPayPlatform: _selected.isEmpty || _busy
                        ? null
                        : () => _payPlatformForSelected(rows),
                  ),
                ],
                const SizedBox(height: 12),
                if (visible.isEmpty)
                  const EmptyState(
                    icon: Icons.workspace_premium_outlined,
                    message: 'No member subscriptions found.',
                  )
                else
                  ...visible.map((sub) => _SubscriptionTile(
                        subscription: sub,
                        memberName: names[sub.memberId] ?? sub.memberId,
                        canManage: widget.canManage,
                        canPrompt: widget.canPrompt,
                        selected: _selected.contains(sub.id),
                        selectionEnabled:
                            _canSelect(sub) || _selected.contains(sub.id),
                        onSelected: sub.isPaid
                            ? null
                            : (v) => setState(() {
                                  if (v == true) {
                                    _selected.add(sub.id);
                                  } else {
                                    _selected.remove(sub.id);
                                  }
                                }),
                        onPrompt: () => _promptMember(sub),
                      )),
              ],
            ),
          );
        },
      ),
    );
  }

  bool _matchesFilter(MemberSubscription sub) {
    if (_filter == 'paid') return sub.isPaid;
    if (_filter == 'unpaid') return !sub.isPaid;
    return true;
  }

  num _selectedTotal(List<MemberSubscription> rows) => rows
      .where((s) => _selected.contains(s.id))
      .fold<num>(0, (total, s) => total + s.balanceDue);

  bool _canSelect(MemberSubscription sub) {
    if (!widget.canManage || sub.isPaid) return false;
    return true;
  }

  Future<void> _payPlatformForSelected(List<MemberSubscription> rows) async {
    final total = _selectedTotal(rows);
    if (total <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Selected dues require ${Fmt.money(total)}.')));
      return;
    }
    final payment = await showDialog<_MobileMoneyDetails>(
      context: context,
      builder: (_) => const _PhoneDialog(title: 'SACCO account mobile money'),
    );
    if (payment == null || payment.phone.trim().isEmpty) return;
    if (!context.mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Pay platform for selected members?',
      message:
          'Send a ${Fmt.money(total)} ${payment.provider.toUpperCase()} mobile money prompt to ${payment.phone.trim()}. Selected members will activate after payment succeeds.',
      confirmLabel: 'Send prompt',
      icon: Icons.account_balance_wallet_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      final request = await ref
          .read(adminRepositoryProvider)
          .requestSaccoSubscriptionMobileMoney(
            amount: total,
            payerPhone: payment.phone,
            provider: payment.provider,
            memberSubscriptionIds: _selected.toList(),
          );
      ref.invalidate(subscriptionsProvider);
      ref.invalidate(mobileMoneyPaymentRequestsProvider);
      _selected.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                'Prompt sent: ${request.externalReference}. Members activate after payment succeeds.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _activateSelectedUsingPaidSlots(
      List<MemberSubscription> rows) async {
    final total = _selectedTotal(rows);
    if (total <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Selected dues require ${Fmt.money(total)}.')));
      return;
    }
    final confirmed = await confirmAction(
      context,
      title: 'Activate selected members?',
      message:
          'Use paid capacity to activate ${_selected.length} member subscription(s) worth ${Fmt.money(total)}.',
      confirmLabel: 'Activate',
      icon: Icons.verified_user_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).recordBulkMemberSubscriptionPayment(
            amount: total,
            subscriptionIds: _selected.toList(),
          );
      ref.invalidate(memberSubscriptionsProvider);
      ref.invalidate(subscriptionsProvider);
      _selected.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Selected members activated using paid slots.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _promptMember(MemberSubscription sub) async {
    final payment = await showDialog<_MobileMoneyDetails>(
      context: context,
      builder: (_) => const _PhoneDialog(title: 'Member mobile money'),
    );
    if (payment == null || payment.phone.trim().isEmpty) return;
    if (!context.mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Send member dues prompt?',
      message:
          'Send a ${payment.provider.toUpperCase()} mobile money prompt to ${payment.phone.trim()} for this member subscription.',
      confirmLabel: 'Send prompt',
      icon: Icons.send_to_mobile_outlined,
    );
    if (!confirmed) return;
    try {
      final request = await ref
          .read(adminRepositoryProvider)
          .requestMemberDuesMobileMoney(
            memberId: sub.memberId,
            subscriptionId: sub.id,
            payerPhone: payment.phone,
            provider: payment.provider,
          );
      ref.invalidate(mobileMoneyPaymentRequestsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Payment prompt created: ${request.externalReference}')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }
}

class _Summary extends StatelessWidget {
  const _Summary({
    required this.paid,
    required this.unpaid,
    required this.paidCapacity,
    required this.remainingSlots,
  });
  final int paid;
  final int unpaid;
  final int? paidCapacity;
  final int? remainingSlots;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: BalanceCard(
            label: 'Subscribed',
            value: paidCapacity == null ? '$paid' : '$paid / $paidCapacity',
            icon: Icons.verified_user_outlined,
            color: const Color(0xFF0F766E),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: BalanceCard(
            label: 'Available paid slots',
            value: remainingSlots == null ? '-' : '$remainingSlots',
            icon: Icons.pending_actions_outlined,
            color: const Color(0xFFB45309),
          ),
        ),
      ],
    );
  }
}

class _SelectedMembersPanel extends StatelessWidget {
  const _SelectedMembersPanel({
    required this.selectedCount,
    required this.selectedTotal,
    required this.availableSlots,
    required this.busy,
    required this.onActivatePaidSlots,
    required this.onPayPlatform,
  });

  final int selectedCount;
  final num selectedTotal;
  final int? availableSlots;
  final bool busy;
  final VoidCallback? onActivatePaidSlots;
  final VoidCallback? onPayPlatform;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: 'Selected member dues',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$selectedCount selected - dues ${Fmt.money(selectedTotal)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (availableSlots != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '$availableSlots paid slot(s) available before another platform top-up.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: busy ? null : onActivatePaidSlots,
              icon: busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.verified_user_outlined),
              label: const Text('Activate using paid slots'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: busy ? null : onPayPlatform,
              icon: busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.account_balance_wallet_outlined),
              label: const Text('Pay platform and auto-activate'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionTile extends StatelessWidget {
  const _SubscriptionTile({
    required this.subscription,
    required this.memberName,
    required this.canManage,
    required this.canPrompt,
    required this.selected,
    required this.selectionEnabled,
    required this.onSelected,
    required this.onPrompt,
  });

  final MemberSubscription subscription;
  final String memberName;
  final bool canManage;
  final bool canPrompt;
  final bool selected;
  final bool selectionEnabled;
  final ValueChanged<bool?>? onSelected;
  final VoidCallback onPrompt;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: canManage && !subscription.isPaid
            ? Checkbox(
                value: selected,
                onChanged: selectionEnabled ? onSelected : null,
              )
            : const Icon(Icons.workspace_premium_outlined),
        title: Text(memberName),
        subtitle: Text(
          '${Fmt.label(subscription.status)} - balance ${Fmt.money(subscription.balanceDue)}',
        ),
        trailing: (canManage || canPrompt) && !subscription.isPaid
            ? IconButton(
                tooltip: 'Mobile money',
                icon: const Icon(Icons.phone_android_outlined),
                onPressed: onPrompt,
              )
            : StatusChip(subscription.lifecycleState.isEmpty
                ? subscription.status
                : subscription.lifecycleState),
      ),
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

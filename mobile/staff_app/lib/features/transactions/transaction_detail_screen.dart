import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Full detail for a single financial transaction.
class TransactionDetailScreen extends ConsumerWidget {
  const TransactionDetailScreen({
    super.key,
    required this.txn,
    this.memberName,
  });
  final FinancialTxn txn;
  final String? memberName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staff = ref.watch(staffNamesProvider).asData?.value ?? const {};
    final canReverse =
        (ref.watch(sessionProvider).asData?.value.can('transactions:approve') ??
                false) &&
            txn.status == 'posted' &&
            txn.reversalReason.isEmpty;
    final canDecide =
        (ref.watch(sessionProvider).asData?.value.can('transactions:approve') ??
                false) &&
            txn.status == 'pending_approval';
    final out = txn.isOutflow;
    final color = out ? const Color(0xFFB91C1C) : const Color(0xFF15803D);
    String? nameFor(String id) =>
        id.isEmpty ? null : (staff[id] ?? id);
    return Scaffold(
      appBar: AppBar(title: const Text('Transaction')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                            txn.narration.isNotEmpty
                                ? txn.narration
                                : Fmt.label(txn.type),
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800)),
                      ),
                      StatusChip(txn.status),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text('${out ? '-' : '+'}${Fmt.money(txn.amount)}',
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(
                              fontWeight: FontWeight.w800, color: color)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Details',
            child: Column(
              children: [
                KeyValueRow('Type', Fmt.label(txn.type)),
                KeyValueRow('Member', memberName ?? (txn.memberId.isEmpty ? '—' : txn.memberId)),
                KeyValueRow('Channel', Fmt.label(txn.channel)),
                if (txn.reference.isNotEmpty)
                  KeyValueRow('Reference', txn.reference),
                KeyValueRow('Posted', Fmt.dateTime(txn.date)),
                KeyValueRow('Recorded', Fmt.dateTime(txn.createdAt)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SectionCard(
            title: 'Control',
            child: Column(
              children: [
                KeyValueRow('Recorded by', nameFor(txn.makerUserId) ?? '—'),
                KeyValueRow('Decided by', nameFor(txn.checkerUserId) ?? '—'),
                if (txn.rejectionReason.isNotEmpty)
                  KeyValueRow('Rejection reason', txn.rejectionReason),
                if (txn.reversalReason.isNotEmpty)
                  KeyValueRow('Reversal reason', txn.reversalReason),
              ],
            ),
          ),
          if (canDecide) ...[
            const SizedBox(height: 16),
            _DecideButtons(txn: txn),
          ],
          if (canReverse) ...[
            const SizedBox(height: 16),
            _ReverseButton(txn: txn),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _ReverseButton extends ConsumerStatefulWidget {
  const _ReverseButton({required this.txn});
  final FinancialTxn txn;

  @override
  ConsumerState<_ReverseButton> createState() => _ReverseButtonState();
}

class _ReverseButtonState extends ConsumerState<_ReverseButton> {
  bool _busy = false;

  Future<void> _reverse() async {
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reverse transaction'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
                'This posts a reversing entry. Give a reason for the audit trail.'),
            const SizedBox(height: 12),
            Form(
              key: formKey,
              child: TextFormField(
                controller: controller,
                autofocus: true,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Give the audit reason for this reversal',
                ),
                validator: (v) => v == null || v.trim().length < 8
                    ? 'Enter a clear reversal reason.'
                    : null,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB91C1C)),
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(ctx, controller.text.trim());
              }
            },
            child: const Text('Reverse'),
          ),
        ],
      ),
    );
    if (reason == null || reason.isEmpty) return;
    if (!mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Reverse this transaction?',
      message:
          'Post a reversal for ${Fmt.money(widget.txn.amount)}. This changes the member balance and creates an audit entry.',
      confirmLabel: 'Reverse',
      icon: Icons.undo,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .reverseTransaction(widget.txn.id, reason);
      ref.invalidate(transactionsProvider(''));
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Transaction reversed.')));
        Navigator.of(context).pop();
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

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFB91C1C)),
        onPressed: _busy ? null : _reverse,
        icon: _busy
            ? const SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.undo),
        label: const Text('Reverse transaction'),
      ),
    );
  }
}

/// Post or reject a transaction sitting in pending_approval. Shown only to a
/// checker (transactions:approve). Posting credits/debits the balance; rejecting
/// records a reason and leaves balances untouched.
class _DecideButtons extends ConsumerStatefulWidget {
  const _DecideButtons({required this.txn});
  final FinancialTxn txn;

  @override
  ConsumerState<_DecideButtons> createState() => _DecideButtonsState();
}

class _DecideButtonsState extends ConsumerState<_DecideButtons> {
  bool _busy = false;

  Future<String?> _askReason() async {
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject transaction'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            autofocus: true,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Reason',
              hintText: 'Why is this being rejected?',
            ),
            validator: (v) => (v == null || v.trim().length < 4)
                ? 'Give a short reason.'
                : null,
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            style:
                FilledButton.styleFrom(backgroundColor: const Color(0xFFB91C1C)),
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(ctx, controller.text.trim());
              }
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  Future<void> _decide(String status) async {
    String? reason;
    if (status == 'rejected') {
      reason = await _askReason();
      if (reason == null || reason.isEmpty) return;
    }
    if (!mounted) return;
    final posting = status == 'posted';
    final confirmed = await confirmAction(
      context,
      title: posting ? 'Post this transaction?' : 'Reject this transaction?',
      message: posting
          ? 'Post ${Fmt.money(widget.txn.amount)} to the member balance. This '
              'creates an audit entry.'
          : 'Reject ${Fmt.money(widget.txn.amount)}. No balance is affected.',
      confirmLabel: posting ? 'Post' : 'Reject',
      icon: posting ? Icons.check_circle_outline : Icons.cancel_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .decideTransaction(widget.txn.id, status, reason: reason);
      ref.invalidate(transactionsProvider(''));
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                posting ? 'Transaction posted.' : 'Transaction rejected.')));
        Navigator.of(context).pop();
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

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFB91C1C)),
            onPressed: _busy ? null : () => _decide('rejected'),
            icon: const Icon(Icons.cancel_outlined),
            label: const Text('Reject'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton.icon(
            style:
                FilledButton.styleFrom(backgroundColor: const Color(0xFF15803D)),
            onPressed: _busy ? null : () => _decide('posted'),
            icon: _busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.check_circle_outline),
            label: const Text('Post'),
          ),
        ),
      ],
    );
  }
}

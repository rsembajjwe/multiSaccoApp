import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// The maker-checker approval queue: financial transactions and loan
/// repayments that a colleague recorded and that need a second person to
/// post (approve) or reject before they take effect.
class ApprovalsScreen extends ConsumerStatefulWidget {
  const ApprovalsScreen({super.key, required this.canApprove});
  final bool canApprove;

  @override
  ConsumerState<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends ConsumerState<ApprovalsScreen> {
  final Set<String> _busy = {};

  void _refresh() {
    ref.invalidate(pendingTransactionsProvider);
    ref.invalidate(pendingRepaymentsProvider);
    ref.invalidate(saccoStatusProvider);
    ref.invalidate(transactionsProvider(''));
  }

  Future<String?> _rejectReason() {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject — reason'),
        content: TextField(
          controller: c,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Optional reason'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB91C1C)),
            onPressed: () => Navigator.pop(ctx, c.text.trim().isEmpty ? '' : c.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  Future<void> _decideTxn(FinancialTxn t, String decision) async {
    String? reason;
    if (decision == 'rejected') {
      reason = await _rejectReason();
      if (reason == null) return; // cancelled
    }
    setState(() => _busy.add(t.id));
    try {
      await ref
          .read(adminRepositoryProvider)
          .decideTransaction(t.id, decision, reason: reason);
      _refresh();
      _toast(decision == 'posted' ? 'Transaction posted.' : 'Transaction rejected.');
    } catch (e) {
      _toast('$e');
    } finally {
      if (mounted) setState(() => _busy.remove(t.id));
    }
  }

  Future<void> _decideRepay(LoanRepayment r, String decision) async {
    String? reason;
    if (decision == 'rejected') {
      reason = await _rejectReason();
      if (reason == null) return;
    }
    setState(() => _busy.add(r.id));
    try {
      await ref
          .read(adminRepositoryProvider)
          .decideRepayment(r.loanId, r.id, decision, reason: reason);
      _refresh();
      _toast(decision == 'posted' ? 'Repayment posted.' : 'Repayment rejected.');
    } catch (e) {
      _toast('$e');
    } finally {
      if (mounted) setState(() => _busy.remove(r.id));
    }
  }

  void _toast(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final txnsAsync = ref.watch(pendingTransactionsProvider);
    final repaysAsync = ref.watch(pendingRepaymentsProvider);
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};

    return Scaffold(
      appBar: AppBar(title: const Text('Approvals')),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (!widget.canApprove)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Text(
                      'You can review the queue, but posting or rejecting needs the transactions:approve permission.',
                      style: Theme.of(context).textTheme.bodyMedium),
                ),
              ),
            if (!widget.canApprove) const SizedBox(height: 12),
            Text('Transactions awaiting approval',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            txnsAsync.when(
              loading: () =>
                  const Shimmer(child: SkeletonBox(height: 96, radius: 14)),
              error: (e, _) => ErrorRetry(
                message: 'Could not load pending transactions.',
                detail: '$e',
                onRetry: () => ref.invalidate(pendingTransactionsProvider),
              ),
              data: (txns) => txns.isEmpty
                  ? const _EmptyLine('No transactions awaiting approval.')
                  : Column(
                      children: txns
                          .map((t) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: _TxnApprovalTile(
                                  txn: t,
                                  memberName: names[t.memberId],
                                  busy: _busy.contains(t.id),
                                  canApprove: widget.canApprove,
                                  onApprove: () => _decideTxn(t, 'posted'),
                                  onReject: () => _decideTxn(t, 'rejected'),
                                ),
                              ))
                          .toList(),
                    ),
            ),
            const SizedBox(height: 20),
            Text('Loan repayments awaiting approval',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            repaysAsync.when(
              loading: () =>
                  const Shimmer(child: SkeletonBox(height: 96, radius: 14)),
              error: (e, _) => ErrorRetry(
                message: 'Could not load pending repayments.',
                detail: '$e',
                onRetry: () => ref.invalidate(pendingRepaymentsProvider),
              ),
              data: (repays) => repays.isEmpty
                  ? const _EmptyLine('No repayments awaiting approval.')
                  : Column(
                      children: repays
                          .map((r) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: _RepayApprovalTile(
                                  repay: r,
                                  memberName: names[r.memberId],
                                  busy: _busy.contains(r.id),
                                  canApprove: widget.canApprove,
                                  onApprove: () => _decideRepay(r, 'posted'),
                                  onReject: () => _decideRepay(r, 'rejected'),
                                ),
                              ))
                          .toList(),
                    ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _EmptyLine extends StatelessWidget {
  const _EmptyLine(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Icon(Icons.check_circle_outline,
                  color: const Color(0xFF15803D), size: 20),
              const SizedBox(width: 10),
              Expanded(child: Text(text)),
            ],
          ),
        ),
      );
}

class _ApprovalActions extends StatelessWidget {
  const _ApprovalActions({
    required this.busy,
    required this.canApprove,
    required this.onApprove,
    required this.onReject,
  });
  final bool busy;
  final bool canApprove;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    if (!canApprove) return const SizedBox.shrink();
    if (busy) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 6),
        child: SizedBox(
            height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFB91C1C)),
            onPressed: onReject,
            child: const Text('Reject'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: FilledButton(onPressed: onApprove, child: const Text('Approve')),
        ),
      ],
    );
  }
}

class _TxnApprovalTile extends StatelessWidget {
  const _TxnApprovalTile({
    required this.txn,
    required this.busy,
    required this.canApprove,
    required this.onApprove,
    required this.onReject,
    this.memberName,
  });
  final FinancialTxn txn;
  final String? memberName;
  final bool busy;
  final bool canApprove;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
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
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                Text(Fmt.money(txn.amount),
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(height: 2),
            Text(
                '${memberName ?? txn.memberId} · ${Fmt.dateTime(txn.date)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
            if (canApprove) const SizedBox(height: 12),
            _ApprovalActions(
              busy: busy,
              canApprove: canApprove,
              onApprove: onApprove,
              onReject: onReject,
            ),
          ],
        ),
      ),
    );
  }
}

class _RepayApprovalTile extends StatelessWidget {
  const _RepayApprovalTile({
    required this.repay,
    required this.busy,
    required this.canApprove,
    required this.onApprove,
    required this.onReject,
    this.memberName,
  });
  final LoanRepayment repay;
  final String? memberName;
  final bool busy;
  final bool canApprove;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Loan repayment',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                Text(Fmt.money(repay.amount),
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(height: 2),
            Text(
                '${memberName ?? repay.memberId} · ${Fmt.label(repay.channel)}'
                '${repay.reference.isEmpty ? '' : ' · ${repay.reference}'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
            const SizedBox(height: 2),
            Text(Fmt.dateTime(repay.receivedAt),
                style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
            if (canApprove) const SizedBox(height: 12),
            _ApprovalActions(
              busy: busy,
              canApprove: canApprove,
              onApprove: onApprove,
              onReject: onReject,
            ),
          ],
        ),
      ),
    );
  }
}

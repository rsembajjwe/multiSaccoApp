import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class _Filter {
  const _Filter(this.label, this.match);
  final String label;
  final String? match;
}

const _filters = <_Filter>[
  _Filter('All', null),
  _Filter('Pending', 'pending'),
  _Filter('Posted', 'posted'),
  _Filter('Rejected', 'rejected'),
];

/// Chairperson-driven savings transfers, under maker-checker control.
/// A different officer posts or rejects a pending transfer.
class SavingsTransfersScreen extends ConsumerStatefulWidget {
  const SavingsTransfersScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<SavingsTransfersScreen> createState() =>
      _SavingsTransfersScreenState();
}

class _SavingsTransfersScreenState
    extends ConsumerState<SavingsTransfersScreen> {
  int _filter = 0;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(savingsTransfersProvider);
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    final canApprove =
        ref.watch(sessionProvider).asData?.value.can('savings-transfer:approve') ??
            false;
    return Scaffold(
      appBar:
          widget.embedded ? null : AppBar(title: const Text('Savings transfers')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ChoiceChip(
                  label: Text(_filters[i].label),
                  selected: _filter == i,
                  onSelected: (_) => setState(() => _filter = i),
                ),
              ),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorRetry(
                message: 'Could not load savings transfers.',
                detail: '$e',
                onRetry: () => ref.invalidate(savingsTransfersProvider),
              ),
              data: (transfers) {
                final match = _filters[_filter].match;
                final rows = match == null
                    ? transfers
                    : transfers
                        .where((t) => match == 'pending'
                            ? t.isPending
                            : t.status == match)
                        .toList();
                if (rows.isEmpty) {
                  return const EmptyState(
                    icon: Icons.swap_horiz_outlined,
                    message: 'No savings transfers here.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(savingsTransfersProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _TransferTile(
                      transfer: rows[i],
                      memberName: names[rows[i].sourceMemberId],
                      canApprove: canApprove,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TransferTile extends ConsumerStatefulWidget {
  const _TransferTile({
    required this.transfer,
    required this.memberName,
    required this.canApprove,
  });
  final SavingsTransfer transfer;
  final String? memberName;
  final bool canApprove;

  @override
  ConsumerState<_TransferTile> createState() => _TransferTileState();
}

class _TransferTileState extends ConsumerState<_TransferTile> {
  bool _busy = false;

  Future<void> _decide(String status) async {
    final t = widget.transfer;
    String? reason;
    if (status == 'rejected') {
      final controller = TextEditingController();
      reason = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Reject transfer'),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(hintText: 'Reason'),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFB91C1C)),
              onPressed: () {
                final r = controller.text.trim();
                if (r.isNotEmpty) Navigator.pop(ctx, r);
              },
              child: const Text('Reject'),
            ),
          ],
        ),
      );
      if (reason == null || reason.isEmpty) return;
    } else {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Post transfer'),
          content: Text(
              'Post ${Fmt.money(t.amount)} — ${t.destinationLabel}? This moves the money and cannot be undone except by reversal.'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Post')),
          ],
        ),
      );
      if (ok != true) return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .decideSavingsTransfer(t.id, status, reason: reason);
      ref.invalidate(savingsTransfersProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                status == 'posted' ? 'Transfer posted.' : 'Transfer rejected.')));
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
    final t = widget.transfer;
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.memberName ?? t.sourceMemberId,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text(t.destinationLabel,
                          style:
                              TextStyle(fontSize: 12.5, color: scheme.outline)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(Fmt.money(t.amount),
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 4),
                    StatusChip(t.status),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(t.reference,
                style: TextStyle(fontSize: 11.5, color: scheme.outline)),
            if (t.batchId != null)
              Text('Group deduction',
                  style: TextStyle(fontSize: 11.5, color: scheme.outline)),
            if ((t.reason ?? '').isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(t.reason!, style: const TextStyle(fontSize: 12.5)),
              ),
            if (t.status == 'rejected' && (t.decisionReason ?? '').isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('Rejected: ${t.decisionReason}',
                    style: const TextStyle(
                        fontSize: 12.5, color: Color(0xFFB91C1C))),
              ),
            if (widget.canApprove && t.isPending) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFB91C1C)),
                      onPressed: _busy ? null : () => _decide('rejected'),
                      child: const Text('Reject'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: _busy ? null : () => _decide('posted'),
                      child: _busy
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Post'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key, required this.session});
  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final approvals = ref.watch(approvalsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Approval inbox'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(approvalsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: AsyncPane(
        value: approvals,
        onRetry: () => ref.invalidate(approvalsProvider),
        builder: (items) => items.isEmpty
            ? const Center(child: Text('No approval requests are waiting.'))
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(approvalsProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (_, index) => _ApprovalCard(
                    item: items[index],
                    canDecide: session.can('tenants:manage'),
                    onDecision: (decision) =>
                        _decide(context, ref, items[index], decision),
                  ),
                ),
              ),
      ),
    );
  }

  Future<void> _decide(
    BuildContext context,
    WidgetRef ref,
    ApprovalRequest item,
    String decision,
  ) async {
    final reason = await reasonDialog(
      context,
      title: '${label(decision)} this request?',
      actionLabel: label(decision),
    );
    if (reason == null || !context.mounted) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .decideApproval(item.id, decision, reason);
      ref.invalidate(approvalsProvider);
      ref.invalidate(fleetSummaryProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Request ${label(decision)}d.')));
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

class _ApprovalCard extends StatelessWidget {
  const _ApprovalCard({
    required this.item,
    required this.canDecide,
    required this.onDecision,
  });
  final ApprovalRequest item;
  final bool canDecide;
  final ValueChanged<String> onDecision;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${item.requestedCount} SACCO update request',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              StatusPill(item.slaStatus.isEmpty ? item.status : item.slaStatus),
            ],
          ),
          const SizedBox(height: 8),
          Text(item.reason.isEmpty ? 'No reason supplied' : item.reason),
          const SizedBox(height: 8),
          Text(
            'Submitted by ${item.requestedBy.isEmpty ? 'platform staff' : item.requestedBy}',
          ),
          if (canDecide && item.status.toLowerCase().contains('pending')) ...[
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: () => onDecision('reject'),
                  icon: const Icon(Icons.close),
                  label: const Text('Reject'),
                ),
                const SizedBox(width: 10),
                FilledButton.icon(
                  onPressed: () => onDecision('approve'),
                  icon: const Icon(Icons.check),
                  label: const Text('Approve'),
                ),
              ],
            ),
          ],
        ],
      ),
    ),
  );
}

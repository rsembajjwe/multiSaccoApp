import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
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
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

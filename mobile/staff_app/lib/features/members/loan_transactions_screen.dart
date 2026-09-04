import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A member's loan ledger: the loan(s) they took (disbursements) and every
/// repayment deposit, newest first.
class LoanTransactionsScreen extends ConsumerWidget {
  const LoanTransactionsScreen({
    super.key,
    required this.memberId,
    required this.memberName,
  });

  final String memberId;
  final String memberName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberLoanLedgerProvider(memberId));
    return Scaffold(
      appBar: AppBar(title: const Text('Loan transactions')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load loan transactions.',
          detail: '$e',
          onRetry: () => ref.invalidate(memberLoanLedgerProvider(memberId)),
        ),
        data: (entries) {
          if (entries.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('This member has no loan activity.'),
              ),
            );
          }
          final disbursed = entries
              .where((e) => e.isDisbursement)
              .fold<num>(0, (s, e) => s + e.amount);
          final repaid = entries
              .where((e) => !e.isDisbursement)
              .fold<num>(0, (s, e) => s + e.amount);
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(memberLoanLedgerProvider(memberId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(memberName.isEmpty ? 'Member' : memberName,
                            style:
                                const TextStyle(fontWeight: FontWeight.w700)),
                        const Divider(height: 22),
                        Row(
                          children: [
                            Expanded(
                              child: _mini(context, 'Disbursed',
                                  Fmt.money(disbursed), const Color(0xFFB45309)),
                            ),
                            Expanded(
                              child: _mini(context, 'Repaid', Fmt.money(repaid),
                                  const Color(0xFF15803D)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ...entries.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _EntryTile(entry: e),
                    )),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _mini(BuildContext context, String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: 4),
        Text(value,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w800, color: color)),
      ],
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry});
  final LoanLedgerEntry entry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isOut = entry.isDisbursement;
    final color = isOut ? const Color(0xFFB45309) : const Color(0xFF15803D);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                  isOut
                      ? Icons.account_balance_outlined
                      : Icons.payments_outlined,
                  color: color,
                  size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                      isOut
                          ? 'Loan disbursed — ${Fmt.label(entry.product)}'
                          : 'Repayment — ${Fmt.label(entry.product)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                      '${Fmt.dateTime(entry.date)}${entry.reference.isEmpty ? '' : ' · ${entry.reference}'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text('${isOut ? '-' : '+'}${Fmt.money(entry.amount)}',
                style: TextStyle(fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      ),
    );
  }
}

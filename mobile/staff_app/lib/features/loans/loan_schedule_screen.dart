import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// The full repayment schedule (amortization) for a loan.
class LoanScheduleScreen extends ConsumerWidget {
  const LoanScheduleScreen({super.key, required this.loanId, required this.product});
  final String loanId;
  final String product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(loanScheduleProvider(loanId));
    return Scaffold(
      appBar: AppBar(title: Text('${Fmt.label(product)} schedule')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(
          message: 'Could not load the schedule.',
          detail: '$e',
          onRetry: () => ref.invalidate(loanScheduleProvider(loanId)),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return const EmptyState(
                icon: Icons.event_note_outlined,
                message: 'No repayment schedule has been generated for this loan.');
          }
          final paid = rows.where((r) => r.isPaid).length;
          final overdue = rows.where((r) => r.isOverdue).length;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(loanScheduleProvider(loanId)),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: rows.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                if (i == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                        '${rows.length} installments · $paid paid'
                        '${overdue > 0 ? ' · $overdue overdue' : ''}',
                        style: Theme.of(context).textTheme.bodySmall),
                  );
                }
                return _ScheduleTile(row: rows[i - 1]);
              },
            ),
          );
        },
      ),
    );
  }
}

class _ScheduleTile extends StatelessWidget {
  const _ScheduleTile({required this.row});
  final LoanScheduleRow row;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = row.isPaid
        ? const Color(0xFF15803D)
        : row.isOverdue
            ? const Color(0xFFB91C1C)
            : scheme.primary;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: color.withValues(alpha: 0.14),
                  child: Text('${row.installmentNo}',
                      style: TextStyle(
                          color: color,
                          fontSize: 12,
                          fontWeight: FontWeight.w800)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Due ${Fmt.date(row.dueDate)}',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      if (row.isOverdue)
                        Text('${row.daysPastDue} day(s) past due',
                            style: const TextStyle(
                                fontSize: 11, color: Color(0xFFB91C1C))),
                    ],
                  ),
                ),
                StatusChip(row.isPaid ? 'paid' : row.status),
              ],
            ),
            const Divider(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _mini(context, 'Principal', Fmt.money(row.principalDue)),
                _mini(context, 'Interest', Fmt.money(row.interestDue)),
                _mini(context, 'Total', Fmt.money(row.totalDue), strong: true),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _mini(context, 'Paid', Fmt.money(row.paidAmount),
                    color: const Color(0xFF15803D)),
                _mini(context, 'Balance', Fmt.money(row.balanceDue),
                    color: row.balanceDue > 0 ? const Color(0xFFB91C1C) : null,
                    strong: true),
                const SizedBox(width: 60),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _mini(BuildContext context, String label, String value,
      {bool strong = false, Color? color}) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
                color: color)),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A single loan with its full terms and complete payment (repayment) history.
class LoanDetailScreen extends ConsumerWidget {
  const LoanDetailScreen({super.key, required this.loan});
  final Loan loan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repaysAsync = ref.watch(loanRepaymentsProvider(loan.id));
    final progress = loan.totalPayable > 0
        ? (loan.repaymentTotal / loan.totalPayable).clamp(0.0, 1.0).toDouble()
        : 0.0;
    return Scaffold(
      appBar: AppBar(title: Text(Fmt.label(loan.product))),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(loanRepaymentsProvider(loan.id)),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Outstanding balance',
                                  style:
                                      Theme.of(context).textTheme.labelMedium),
                              const SizedBox(height: 4),
                              Text(Fmt.money(loan.balance),
                                  style: Theme.of(context)
                                      .textTheme
                                      .headlineSmall
                                      ?.copyWith(fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                        StatusChip(loan.status),
                      ],
                    ),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                          value: progress, minHeight: 8),
                    ),
                    const SizedBox(height: 6),
                    Text(
                        '${Fmt.money(loan.repaymentTotal)} repaid of ${Fmt.money(loan.totalPayable)}',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Loan terms',
              child: Column(
                children: [
                  KeyValueRow('Principal', Fmt.money(loan.amount)),
                  KeyValueRow('Interest rate',
                      '${(loan.interestRate * 100).toStringAsFixed(loan.interestRate < 1 ? 1 : 0)}%'),
                  KeyValueRow('Interest', Fmt.money(loan.interestAmount)),
                  KeyValueRow('Total payable', Fmt.money(loan.totalPayable),
                      emphasize: true),
                  KeyValueRow(
                      'Monthly installment', Fmt.money(loan.monthlyInstallment)),
                  if (loan.purpose.isNotEmpty)
                    KeyValueRow('Purpose', loan.purpose),
                  KeyValueRow('Disbursed', Fmt.date(loan.disbursedAt)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Schedule',
              child: Column(
                children: [
                  KeyValueRow('Installments',
                      '${loan.paidInstallments} paid of ${loan.scheduledInstallments}'),
                  KeyValueRow('Next due', Fmt.date(loan.nextDueDate)),
                  if (loan.inArrears)
                    KeyValueRow('In arrears',
                        '${Fmt.money(loan.arrearsAmount)} (${loan.arrearsInstallments})',
                        emphasize: true),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text('Payment history',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            repaysAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Could not load payments. $e',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error)),
                ),
              ),
              data: (repayments) {
                if (repayments.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Center(
                          child: Text('No payments recorded on this loan yet.')),
                    ),
                  );
                }
                return Column(
                  children: repayments
                      .map((r) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _RepaymentTile(repayment: r),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _RepaymentTile extends StatelessWidget {
  const _RepaymentTile({required this.repayment});
  final LoanRepayment repayment;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF15803D).withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.payments_outlined,
                  color: Color(0xFF15803D), size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(Fmt.dateTime(repayment.receivedAt),
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                      '${Fmt.label(repayment.channel)}${repayment.reference.isEmpty ? '' : ' · ${repayment.reference}'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(Fmt.money(repayment.amount),
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                StatusChip(repayment.status),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

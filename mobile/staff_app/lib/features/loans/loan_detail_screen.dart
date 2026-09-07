import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'loan_schedule_screen.dart';

/// A single loan with its full terms and complete payment (repayment) history.
class LoanDetailScreen extends ConsumerWidget {
  const LoanDetailScreen({super.key, required this.loan});
  final Loan loan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repaysAsync = ref.watch(loanRepaymentsProvider(loan.id));
    final extensionsAsync = ref.watch(loanExtensionsProvider(loan.id));
    final session = ref.watch(sessionProvider).asData?.value;
    final canExtend = loan.isOpen && (session?.can('loans:create') ?? false);
    final progress = loan.totalPayable > 0
        ? (loan.repaymentTotal / loan.totalPayable).clamp(0.0, 1.0).toDouble()
        : 0.0;
    return Scaffold(
      appBar: AppBar(
        title: Text(Fmt.label(loan.product)),
        actions: [
          if (canExtend)
            IconButton(
              tooltip: 'Extend loan',
              icon: const Icon(Icons.more_time),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => _LoanExtensionSheet(loan: loan),
              ),
            ),
        ],
      ),
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
                      '${loan.interestRate.toStringAsFixed(2)}%'),
                  KeyValueRow('Interest', Fmt.money(loan.interestAmount)),
                  KeyValueRow('Charge fee', Fmt.money(loan.chargeFee)),
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
              trailing: TextButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => LoanScheduleScreen(
                        loanId: loan.id, product: loan.product))),
                child: const Text('View all'),
              ),
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
            SectionCard(
              title: 'Extensions',
              trailing: canExtend
                  ? TextButton.icon(
                      icon: const Icon(Icons.more_time, size: 18),
                      label: const Text('Add'),
                      onPressed: () => showModalBottomSheet<void>(
                        context: context,
                        isScrollControlled: true,
                        showDragHandle: true,
                        builder: (_) => _LoanExtensionSheet(loan: loan),
                      ),
                    )
                  : null,
              child: extensionsAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Could not load extensions. $e',
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error)),
                data: (extensions) {
                  if (extensions.isEmpty) {
                    return Text(
                      'No extensions recorded.',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant),
                    );
                  }
                  return Column(
                    children: extensions
                        .map((extension) => KeyValueRow(
                              '${extension.additionalMonths} month(s)',
                              extension.chargeFee > 0
                                  ? Fmt.money(extension.chargeFee)
                                  : Fmt.date(extension.createdAt),
                            ))
                        .toList(),
                  );
                },
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

class _LoanExtensionSheet extends ConsumerStatefulWidget {
  const _LoanExtensionSheet({required this.loan});
  final Loan loan;

  @override
  ConsumerState<_LoanExtensionSheet> createState() =>
      _LoanExtensionSheetState();
}

class _LoanExtensionSheetState extends ConsumerState<_LoanExtensionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _months = TextEditingController(text: '1');
  final _chargeFee = TextEditingController(text: '0');
  final _reason = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _months.dispose();
    _chargeFee.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final updatedLoan = await ref.read(adminRepositoryProvider).extendLoan(
            loanId: widget.loan.id,
            additionalMonths: int.parse(_months.text.trim()),
            chargeFee: num.parse(_chargeFee.text.trim().replaceAll(',', '')),
            reason: _reason.text,
          );
      ref.invalidate(loansProvider(''));
      ref.invalidate(memberLoansProvider(widget.loan.memberId));
      ref.invalidate(loanExtensionsProvider(widget.loan.id));
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Loan extension recorded.')),
        );
        Navigator.of(context).pop();
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => LoanDetailScreen(loan: updatedLoan),
          ),
        );
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
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Extend loan',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _months,
                keyboardType: TextInputType.number,
                decoration:
                    const InputDecoration(labelText: 'Additional months'),
                validator: (v) {
                  final parsed = int.tryParse((v ?? '').trim());
                  return parsed == null || parsed < 1 || parsed > 60
                      ? '1 to 60.'
                      : null;
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _chargeFee,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Charge fee'),
                validator: (v) {
                  final parsed =
                      num.tryParse((v ?? '').trim().replaceAll(',', ''));
                  return parsed == null || parsed < 0
                      ? 'Enter zero or more.'
                      : null;
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _reason,
                minLines: 2,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Reason'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: _busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save_outlined),
                  label: const Text('Save extension'),
                  onPressed: _busy ? null : _save,
                ),
              ),
            ],
          ),
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

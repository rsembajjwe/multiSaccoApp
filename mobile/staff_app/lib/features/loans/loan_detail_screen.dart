import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'loan_schedule_screen.dart';

/// A single loan with its full terms and complete payment (repayment) history.
class LoanDetailScreen extends ConsumerStatefulWidget {
  const LoanDetailScreen({super.key, required this.loan});
  final Loan loan;

  @override
  ConsumerState<LoanDetailScreen> createState() => _LoanDetailScreenState();
}

class _LoanDetailScreenState extends ConsumerState<LoanDetailScreen> {
  late Loan loan;

  @override
  void initState() {
    super.initState();
    loan = widget.loan;
  }

  Future<void> _openDecisionSheet() async {
    final updated = await showModalBottomSheet<Loan>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _LoanDecisionSheet(loan: loan),
    );
    if (updated == null || !mounted) return;
    setState(() => loan = updated);
    ref.invalidate(loansProvider(''));
    ref.invalidate(memberLoansProvider(updated.memberId));
    ref.invalidate(saccoStatusProvider);
  }

  @override
  Widget build(BuildContext context) {
    final repaysAsync = ref.watch(loanRepaymentsProvider(loan.id));
    final extensionsAsync = ref.watch(loanExtensionsProvider(loan.id));
    final recoveriesAsync = ref.watch(loanRecoveriesProvider(loan.id));
    final session = ref.watch(sessionProvider).asData?.value;
    final canExtend = loan.isOpen && (session?.can('loans:create') ?? false);
    final canDecide =
        (loan.status == 'submitted' || loan.status == 'under_review') &&
            (session?.can('loans:approve') ?? false);
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
        onRefresh: () async {
          ref.invalidate(loanRepaymentsProvider(loan.id));
          ref.invalidate(loanRecoveriesProvider(loan.id));
          ref.invalidate(loanExtensionsProvider(loan.id));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (loan.status == 'submitted' ||
                loan.status == 'under_review') ...[
              _LoanWarningBanner(
                icon: Icons.pending_actions_outlined,
                message: canDecide
                    ? 'This loan is awaiting your approval decision.'
                    : 'This loan is awaiting Chairperson approval.',
                color: const Color(0xFFB45309),
              ),
              const SizedBox(height: 12),
            ] else if (loan.inArrears || loan.status == 'overdue') ...[
              _LoanWarningBanner(
                icon: Icons.warning_amber_rounded,
                message:
                    'Overdue balance: ${Fmt.money(loan.arrearsAmount > 0 ? loan.arrearsAmount : loan.balance)}.',
                color: const Color(0xFFB91C1C),
              ),
              const SizedBox(height: 12),
            ],
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
            if (canDecide) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Approve or reject loan'),
                  onPressed: _openDecisionSheet,
                ),
              ),
            ],
            const SizedBox(height: 16),
            _RecoverySection(
              loan: loan,
              recoveriesAsync: recoveriesAsync,
              canExtend: canExtend,
              canOpen: loan.isRecoveryEligible &&
                  (session?.can('loan-recovery:create') ?? false),
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
                  KeyValueRow('Monthly installment',
                      Fmt.money(loan.monthlyInstallment)),
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
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant),
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
                          child:
                              Text('No payments recorded on this loan yet.')),
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

class _RecoverySection extends ConsumerWidget {
  const _RecoverySection({
    required this.loan,
    required this.recoveriesAsync,
    required this.canExtend,
    required this.canOpen,
  });

  final Loan loan;
  final AsyncValue<List<LoanRecoveryCase>> recoveriesAsync;
  final bool canExtend;
  final bool canOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionCard(
      title: 'Restore loan',
      child: recoveriesAsync.when(
        loading: () => const LinearProgressIndicator(),
        error: (e, _) => Text('Could not load recovery cases. $e',
            style: TextStyle(color: Theme.of(context).colorScheme.error)),
        data: (cases) {
          final hasOpen = cases.any((item) =>
              item.status == 'notice_period' ||
              item.status == 'pending_approval');
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!hasOpen && (canExtend || canOpen)) ...[
                Text(
                  loan.isRecoveryEligible
                      ? 'Choose the appropriate resolution for this overdue balance.'
                      : 'Adjust the repayment term when the member needs more time.',
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 12),
                if (canExtend)
                  _RecoveryAction(
                    icon: Icons.more_time,
                    title: 'Extend repayment period',
                    subtitle: 'Change the loan term without deducting savings.',
                    onTap: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      showDragHandle: true,
                      builder: (_) => _LoanExtensionSheet(loan: loan),
                    ),
                  ),
                if (canExtend && canOpen) const SizedBox(height: 8),
                if (canOpen) ...[
                  _RecoveryAction(
                    key: const Key('recover-member-savings'),
                    icon: Icons.account_balance_wallet_outlined,
                    title: 'Pay from member savings',
                    subtitle:
                        'Immediately apply available borrower savings to the overdue loan.',
                    onTap: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      showDragHandle: true,
                      builder: (_) => _OpenRecoverySheet(
                        loan: loan,
                        source: _RecoverySource.borrowerSavings,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _RecoveryAction(
                    key: const Key('recover-guarantor-savings'),
                    icon: Icons.shield_outlined,
                    title: 'Use guarantor savings for shortfall',
                    subtitle:
                        'Immediately enforce signed guarantees and notify affected guarantors.',
                    emphasized: true,
                    onTap: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      showDragHandle: true,
                      builder: (_) => _OpenRecoverySheet(
                        loan: loan,
                        source: _RecoverySource.guarantorShortfall,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
              ],
              if (cases.isEmpty)
                Text(
                  loan.isRecoveryEligible
                      ? 'No savings recovery case has been opened.'
                      : 'Recovery becomes available when this loan is overdue or in arrears.',
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ...cases.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _RecoveryCasePanel(
                      recovery: item,
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }
}

class _RecoveryAction extends StatelessWidget {
  const _RecoveryAction({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.emphasized = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final background = emphasized
        ? scheme.errorContainer.withValues(alpha: 0.55)
        : scheme.surfaceContainerHighest.withValues(alpha: 0.55);
    final foreground = emphasized ? scheme.onErrorContainer : scheme.onSurface;
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Icon(icon, color: emphasized ? scheme.error : scheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: TextStyle(
                            color: foreground, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: TextStyle(
                            color: foreground.withValues(alpha: 0.78),
                            fontSize: 12)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: foreground),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecoveryCasePanel extends StatelessWidget {
  const _RecoveryCasePanel({
    required this.recovery,
  });

  final LoanRecoveryCase recovery;

  @override
  Widget build(BuildContext context) {
    final item = recovery;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text(item.reference,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
            StatusChip(item.status),
          ]),
          const SizedBox(height: 8),
          KeyValueRow('Method', Fmt.label(item.recoveryMethod)),
          if (item.noticeReference.isNotEmpty)
            KeyValueRow('Notice', item.noticeReference),
          KeyValueRow('Outstanding', Fmt.money(item.outstandingAtProposal)),
          KeyValueRow(
              'Borrower savings', Fmt.money(item.borrowerSavingsProposed)),
          KeyValueRow(
              'Guarantor savings', Fmt.money(item.guarantorSavingsProposed)),
          KeyValueRow('Recovery total', Fmt.money(item.totalProposed),
              emphasize: true),
          if (item.remainingAfterProposal > 0)
            KeyValueRow(
                'Still outstanding', Fmt.money(item.remainingAfterProposal),
                emphasize: true),
          const SizedBox(height: 8),
          ...item.allocations.map((allocation) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: allocation.sourceType == 'guarantor'
                      ? scheme.errorContainer.withValues(alpha: 0.55)
                      : scheme.surfaceContainerHighest.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(8),
                  border: allocation.sourceType == 'guarantor'
                      ? Border.all(color: scheme.error)
                      : null,
                ),
                child: Row(children: [
                  Icon(
                    allocation.sourceType == 'guarantor'
                        ? Icons.shield_outlined
                        : Icons.person_outline,
                    size: 18,
                    color: allocation.sourceType == 'guarantor'
                        ? scheme.error
                        : scheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${allocation.sourceMemberName} · ${Fmt.label(allocation.sourceType)}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: allocation.sourceType == 'guarantor'
                            ? scheme.onErrorContainer
                            : scheme.onSurface,
                        fontWeight: allocation.sourceType == 'guarantor'
                            ? FontWeight.w800
                            : FontWeight.w600,
                      ),
                    ),
                  ),
                  Text(Fmt.money(allocation.amount),
                      style: TextStyle(
                          color: allocation.sourceType == 'guarantor'
                              ? scheme.onErrorContainer
                              : scheme.onSurface,
                          fontWeight: FontWeight.w800)),
                ]),
              )),
        ],
      ),
    );
  }
}

enum _RecoverySource { borrowerSavings, guarantorShortfall }

class _OpenRecoverySheet extends ConsumerStatefulWidget {
  const _OpenRecoverySheet({required this.loan, required this.source});
  final Loan loan;
  final _RecoverySource source;

  @override
  ConsumerState<_OpenRecoverySheet> createState() => _OpenRecoverySheetState();
}

class _OpenRecoverySheetState extends ConsumerState<_OpenRecoverySheet> {
  final _formKey = GlobalKey<FormState>();
  final _reason = TextEditingController();
  final _noticeReference = TextEditingController();
  bool _sendNotice = false;
  bool _busy = false;

  bool get _usesGuarantors =>
      widget.source == _RecoverySource.guarantorShortfall;

  @override
  void dispose() {
    _reason.dispose();
    _noticeReference.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final confirmed = await confirmAction(
      context,
      title: _usesGuarantors ? 'Use guarantor savings?' : 'Use member savings?',
      message: _usesGuarantors
          ? 'This posts immediately. The member\'s savings will be used first, then any shortfall will be allocated only to accepted, signed guarantees. Every affected guarantor will be notified.'
          : 'This immediately deducts the recoverable amount from the member\'s savings and applies it to the overdue loan.',
      confirmLabel: 'Deduct and apply',
      icon: Icons.account_balance_wallet_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).openLoanRecovery(
            loanId: widget.loan.id,
            reason: _reason.text,
            recoveryMethod:
                _usesGuarantors ? 'guarantor_shortfall' : 'borrower_savings',
            sendNotice: _sendNotice,
            noticeReference: _sendNotice ? _noticeReference.text : null,
          );
      ref.invalidate(loanRecoveriesProvider(widget.loan.id));
      ref.invalidate(loanRepaymentsProvider(widget.loan.id));
      ref.invalidate(loansProvider(''));
      ref.invalidate(memberLoansProvider(widget.loan.memberId));
      ref.invalidate(memberFundBalancesProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Savings recovery posted.')),
        );
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
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  widget.source == _RecoverySource.guarantorShortfall
                      ? 'Recover using guarantor savings'
                      : 'Recover from member savings',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text('Outstanding ${Fmt.money(widget.loan.balance)}'),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: widget.source == _RecoverySource.guarantorShortfall
                      ? Theme.of(context).colorScheme.errorContainer
                      : Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.source == _RecoverySource.guarantorShortfall
                      ? 'Member savings are used first. The remaining shortfall posts immediately against accepted signed guarantees, and affected guarantors are notified.'
                      : 'Only this member\'s available savings will be deducted and immediately applied to the loan.',
                  style: TextStyle(
                    color: widget.source == _RecoverySource.guarantorShortfall
                        ? Theme.of(context).colorScheme.onErrorContainer
                        : Theme.of(context).colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _sendNotice,
                title: const Text('Send recovery notice to member'),
                subtitle: const Text(
                    'Optional. This does not delay or require approval for the deduction.'),
                onChanged: _busy
                    ? null
                    : (value) => setState(() => _sendNotice = value),
              ),
              if (_sendNotice) ...[
                TextFormField(
                  controller: _noticeReference,
                  decoration: const InputDecoration(
                    labelText: 'Notice reference (optional)',
                    helperText: 'A reference is generated when left blank.',
                  ),
                ),
                const SizedBox(height: 10),
              ],
              TextFormField(
                controller: _reason,
                minLines: 2,
                maxLines: 4,
                decoration: InputDecoration(
                    labelText: _usesGuarantors
                        ? 'Recovery reason and evidence'
                        : 'Deduction reason and evidence'),
                validator: (v) => v == null || v.trim().length < 5
                    ? 'Provide the recovery reason.'
                    : null,
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _busy ? null : _save,
                  icon: const Icon(Icons.save_outlined),
                  label: Text(_usesGuarantors
                      ? 'Deduct savings and clear shortfall'
                      : 'Deduct savings and pay loan'),
                ),
              ),
            ],
          ),
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

class _LoanWarningBanner extends StatelessWidget {
  const _LoanWarningBanner({
    required this.icon,
    required this.message,
    required this.color,
  });

  final IconData icon;
  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoanDecisionSheet extends ConsumerStatefulWidget {
  const _LoanDecisionSheet({required this.loan});

  final Loan loan;

  @override
  ConsumerState<_LoanDecisionSheet> createState() => _LoanDecisionSheetState();
}

class _LoanDecisionSheetState extends ConsumerState<_LoanDecisionSheet> {
  final _reference = TextEditingController();
  final _approvers = TextEditingController();
  final _reason = TextEditingController();
  bool _chairperson = true;
  bool _secretary = false;
  bool _treasurer = false;
  bool _committee = false;
  bool _busy = false;

  @override
  void dispose() {
    _reference.dispose();
    _approvers.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit(String status) async {
    final approving = status == 'approved';
    if (approving &&
        !(_chairperson || _secretary || _treasurer || _committee)) {
      _showError('Select at least one signer of the paper approval.');
      return;
    }
    if (approving && _reference.text.trim().isEmpty) {
      _showError('Enter the paper approval reference.');
      return;
    }
    if (approving && _approvers.text.trim().isEmpty) {
      _showError('Enter the names or titles of the paper approvers.');
      return;
    }
    if (!approving && _reason.text.trim().isEmpty) {
      _showError('Enter a reason for rejecting this loan.');
      return;
    }

    setState(() => _busy = true);
    try {
      final updated = await ref.read(adminRepositoryProvider).decideLoan(
            loanId: widget.loan.id,
            status: status,
            reason: _reason.text,
            paperApprovalReference: _reference.text,
            paperApprovalApprovers: _approvers.text,
            paperApprovedByChairperson: _chairperson,
            paperApprovedBySecretary: _secretary,
            paperApprovedByTreasurer: _treasurer,
            paperApprovedByCommittee: _committee,
          );
      if (mounted) Navigator.of(context).pop(updated);
    } catch (error) {
      if (mounted) _showError('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Loan approval decision',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              '${Fmt.label(widget.loan.product)} · ${Fmt.money(widget.loan.amount)}',
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _reference,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Paper approval reference',
                hintText: 'Form, minute or file reference',
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _approvers,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Paper approvers',
                hintText: 'Names or titles of signers',
              ),
            ),
            const SizedBox(height: 8),
            const Text('Signed on paper by'),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Chairperson'),
              value: _chairperson,
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _chairperson = value ?? false),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Secretary'),
              value: _secretary,
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _secretary = value ?? false),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Treasurer'),
              value: _treasurer,
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _treasurer = value ?? false),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Loans committee'),
              value: _committee,
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _committee = value ?? false),
            ),
            TextFormField(
              controller: _reason,
              enabled: !_busy,
              minLines: 2,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Decision notes or rejection reason',
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.close),
                    label: const Text('Reject'),
                    onPressed: _busy ? null : () => _submit('rejected'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    icon: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check),
                    label: const Text('Approve'),
                    onPressed: _busy ? null : () => _submit('approved'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

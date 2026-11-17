import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/member_picker.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import '../loans/loan_detail_screen.dart';
import 'cash_receipt_dialog.dart';

List<Loan> repaymentEligibleLoans(Iterable<Loan> loans) =>
    loans.where((loan) => loan.isOpen && loan.balance > 0).toList();

class LoanRepaymentSheet extends ConsumerStatefulWidget {
  const LoanRepaymentSheet({super.key});

  @override
  ConsumerState<LoanRepaymentSheet> createState() => _LoanRepaymentSheetState();
}

class _LoanRepaymentSheetState extends ConsumerState<LoanRepaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _reference = TextEditingController();
  final _narration = TextEditingController();
  Member? _member;
  Loan? _loan;
  List<Loan> _loans = const [];
  bool _loadingLoans = false;
  bool _busy = false;
  String? _loanError;
  String? _formError;

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    _narration.dispose();
    super.dispose();
  }

  Future<void> _pickMember() async {
    final member = await showMemberPicker(context,
        unavailableReason: postingUnavailableReason);
    if (member == null || !mounted) return;
    setState(() {
      _member = member;
      _loan = null;
      _loans = const [];
      _loanError = null;
      _formError = null;
      _loadingLoans = true;
    });
    try {
      final loans =
          await ref.read(adminRepositoryProvider).memberLoans(member.id);
      final active = repaymentEligibleLoans(loans);
      if (!mounted) return;
      setState(() {
        _loans = active;
        _loan = active.length == 1 ? active.first : null;
      });
    } catch (error) {
      if (mounted) setState(() => _loanError = '$error');
    } finally {
      if (mounted) setState(() => _loadingLoans = false);
    }
  }

  Future<void> _save() async {
    setState(() => _formError = null);
    if (!_formKey.currentState!.validate()) {
      setState(() => _formError =
          'Complete the highlighted repayment fields before posting.');
      return;
    }
    if (_member == null || _loan == null) {
      setState(() => _formError = 'Choose a member and open loan.');
      return;
    }
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final loan = _loan!;
    final member = _member!;
    final confirmed = await confirmAction(
      context,
      title: 'Post cash loan repayment?',
      message: 'Post ${Fmt.money(amount)} to ${member.fullName}\'s '
          '${loan.product} loan. Outstanding balance: ${Fmt.money(loan.balance)}.',
      confirmLabel: 'Post repayment',
      icon: Icons.payments_outlined,
    );
    if (!confirmed || !mounted) return;

    setState(() => _busy = true);
    try {
      final repayment =
          await ref.read(adminRepositoryProvider).createLoanRepayment(
                loanId: loan.id,
                amount: amount,
                reference: _reference.text,
                narration: _narration.text,
              );
      ref.invalidate(cashBookProvider);
      ref.invalidate(loansProvider);
      ref.invalidate(memberLoansProvider(member.id));
      ref.invalidate(memberLoanExposureProvider(member.id));
      ref.invalidate(loanRepaymentsProvider(loan.id));
      ref.invalidate(memberProvider(member.id));
      ref.invalidate(saccoStatusProvider);
      if (!mounted) return;
      await showCashReceipt(
        context,
        title: 'Loan repayment receipt',
        memberName: member.fullName,
        item: loan.product,
        amount: repayment.amount,
        reference: repayment.reference,
        status: repayment.status,
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        setState(() =>
            _formError = 'Could not post repayment. Review and retry. $error');
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
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Loan repayment',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _busy ? null : _pickMember,
                borderRadius: BorderRadius.circular(8),
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Member',
                    suffixIcon: Icon(Icons.search),
                  ),
                  child: Text(
                    _member == null
                        ? 'Tap to search & select a member'
                        : '${_member!.fullName} - ${_member!.membershipNo}',
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (_loadingLoans) const LinearProgressIndicator(),
              if (_loanError != null)
                Text(
                  'Could not load open loans. $_loanError',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              if (_member != null && !_loadingLoans && _loans.isEmpty)
                const Text('This member has no open loan balance.'),
              if (_loans.isNotEmpty) ...[
                _MemberLoanGuide(loans: _loans),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _loan?.id,
                  decoration: const InputDecoration(labelText: 'Loan to pay'),
                  items: _loans
                      .map((loan) => DropdownMenuItem(
                            value: loan.id,
                            child: Text(
                              '${loan.product} - ${Fmt.money(loan.balance)} - ${Fmt.label(loan.status)}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ))
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (value) => setState(() {
                            _loan = _loans.firstWhere(
                              (loan) => loan.id == value,
                            );
                          }),
                ),
              ],
              if (_loan != null) ...[
                const SizedBox(height: 8),
                _SelectedLoanGuide(
                  loan: _loan!,
                  onViewHistory: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => LoanDetailScreen(loan: _loan!),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
                onChanged: (_) {
                  if (_formError != null) setState(() => _formError = null);
                },
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Amount',
                  prefixText: 'UGX ',
                ),
                validator: (value) {
                  final amount =
                      num.tryParse((value ?? '').trim().replaceAll(',', ''));
                  if (amount == null || amount <= 0) return 'Enter amount.';
                  if (_loan != null && amount > _loan!.balance) {
                    return 'Amount exceeds the outstanding balance.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _reference,
                decoration: const InputDecoration(
                  labelText: 'Receipt reference (optional)',
                  helperText:
                      'A unique reference is generated when left blank.',
                ),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _narration,
                minLines: 2,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Narration'),
              ),
              const SizedBox(height: 16),
              if (_formError != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _formError!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _busy ? null : _save,
                  icon: _busy
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.receipt_long_outlined),
                  label: const Text('Post repayment'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MemberLoanGuide extends StatelessWidget {
  const _MemberLoanGuide({required this.loans});

  final List<Loan> loans;

  @override
  Widget build(BuildContext context) {
    final total = loans.fold<num>(0, (sum, loan) => sum + loan.balance);
    return Text(
      '${loans.length} open loan${loans.length == 1 ? '' : 's'} - Total outstanding ${Fmt.money(total)}',
      style: const TextStyle(fontWeight: FontWeight.w700),
    );
  }
}

class _SelectedLoanGuide extends StatelessWidget {
  const _SelectedLoanGuide({
    required this.loan,
    required this.onViewHistory,
  });

  final Loan loan;
  final VoidCallback onViewHistory;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: loan.inArrears ? scheme.errorContainer : scheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(loan.product,
              style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Original principal: ${Fmt.money(loan.amount)}'),
          Text('Total payable: ${Fmt.money(loan.totalPayable)}'),
          Text('Paid to date: ${Fmt.money(loan.repaymentTotal)}'),
          Text('Outstanding balance: ${Fmt.money(loan.balance)}'),
          if (loan.monthlyInstallment > 0)
            Text('Expected installment: ${Fmt.money(loan.monthlyInstallment)}'),
          if (loan.nextDueDate.isNotEmpty)
            Text('Next due date: ${Fmt.date(loan.nextDueDate)}'),
          if (loan.inArrears)
            Text(
              'Arrears: ${Fmt.money(loan.arrearsAmount)}',
              style: TextStyle(
                color: scheme.onErrorContainer,
                fontWeight: FontWeight.w800,
              ),
            ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: onViewHistory,
            icon: const Icon(Icons.history_outlined),
            label: const Text('View loan payment history'),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/member_picker.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'cash_receipt_dialog.dart';

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

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    _narration.dispose();
    super.dispose();
  }

  Future<void> _pickMember() async {
    final member = await showMemberPicker(context);
    if (member == null || !mounted) return;
    setState(() {
      _member = member;
      _loan = null;
      _loans = const [];
      _loanError = null;
      _loadingLoans = true;
    });
    try {
      final loans =
          await ref.read(adminRepositoryProvider).memberLoans(member.id);
      final active = loans.where((loan) => loan.status == 'active').toList();
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
    if (!_formKey.currentState!.validate()) return;
    if (_member == null || _loan == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose a member and active loan.')),
      );
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not post repayment. $error')),
        );
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
                  'Could not load active loans. $_loanError',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              if (_member != null && !_loadingLoans && _loans.isEmpty)
                const Text('This member has no active loan.'),
              if (_loans.isNotEmpty)
                DropdownButtonFormField<String>(
                  initialValue: _loan?.id,
                  decoration: const InputDecoration(labelText: 'Active loan'),
                  items: _loans
                      .map((loan) => DropdownMenuItem(
                            value: loan.id,
                            child: Text(
                              '${loan.product} - ${Fmt.money(loan.balance)} due',
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
              if (_loan != null) ...[
                const SizedBox(height: 8),
                Text(
                  _loan!.inArrears
                      ? 'Warning: ${Fmt.money(_loan!.arrearsAmount)} is in arrears.'
                      : 'Outstanding balance: ${Fmt.money(_loan!.balance)}',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: _loan!.inArrears
                        ? Theme.of(context).colorScheme.error
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
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

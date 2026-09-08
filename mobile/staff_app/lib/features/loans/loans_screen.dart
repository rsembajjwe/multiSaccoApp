import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'loan_detail_screen.dart';

/// All loans in the SACCO with search. Each row opens the loan and its
/// payment history.
class LoansScreen extends ConsumerStatefulWidget {
  const LoansScreen({super.key});

  @override
  ConsumerState<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends ConsumerState<LoansScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).asData?.value;
    final canCreate = session?.can('loans:create') ?? false;
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Loans')),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Add loan'),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _LoanFormSheet(),
              ),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => setState(() => _query = v.trim()),
              onChanged: (v) {
                if (v.trim().isEmpty && _query.isNotEmpty) {
                  setState(() => _query = '');
                }
              },
              decoration: InputDecoration(
                hintText: 'Search product, status or member',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          Expanded(
            child: PagedListView<Loan>(
              search: _query,
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .loansPage(search: _query, page: page),
              itemBuilder: (context, l) =>
                  _LoanTile(loan: l, memberName: names[l.memberId]),
              emptyIcon: Icons.account_balance_outlined,
              emptyMessage: 'No loans match your search.',
              errorMessage: 'Could not load loans.',
            ),
          ),
        ],
      ),
    );
  }
}

const _loanProducts = [
  'Development Loan',
  'Emergency Loan',
  'Agriculture Loan',
  'School Fees Loan',
];

class _LoanFormSheet extends ConsumerStatefulWidget {
  const _LoanFormSheet();

  @override
  ConsumerState<_LoanFormSheet> createState() => _LoanFormSheetState();
}

class _LoanFormSheetState extends ConsumerState<_LoanFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _interestRate = TextEditingController();
  final _chargeFee = TextEditingController(text: '0');
  final _months = TextEditingController(text: '12');
  final _purpose = TextEditingController();
  final _formRef = TextEditingController();
  String? _memberId;
  String _product = _loanProducts.first;
  final Set<String> _guarantorIds = {};
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _interestRate.dispose();
    _chargeFee.dispose();
    _months.dispose();
    _purpose.dispose();
    _formRef.dispose();
    super.dispose();
  }

  Member? _selectedBorrower(List<Member> members) {
    for (final member in members) {
      if (member.id == _memberId) return member;
    }
    return null;
  }

  Loan? _unclearedLoan(List<Loan> loans) {
    for (final loan in loans) {
      if (loan.memberId == _memberId && loan.isOpen) return loan;
    }
    return null;
  }

  void _setGuarantorSelected(String memberId, bool selected) {
    if (selected) {
      _guarantorIds.add(memberId);
    } else {
      _guarantorIds.remove(memberId);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _memberId == null) return;
    final members =
        ref.read(membersProvider('')).asData?.value ?? const <Member>[];
    final loans = ref.read(loansProvider('')).asData?.value ?? const <Loan>[];
    final unclearedLoan = _unclearedLoan(loans);
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final months = int.parse(_months.text.trim());
    final interestRate = _interestRate.text.trim().isEmpty
        ? null
        : num.parse(_interestRate.text.trim().replaceAll(',', ''));
    final chargeFee = num.parse(_chargeFee.text.trim().replaceAll(',', ''));
    final borrowerName = _selectedBorrower(members)?.fullName ?? 'the borrower';
    final confirmed = await confirmAction(
      context,
      title: unclearedLoan == null ? 'Save loan data?' : 'Top up loan?',
      message: unclearedLoan == null
          ? 'Create a ${Fmt.money(amount)} $_product for $borrowerName over '
              '$months month(s), charge fee ${Fmt.money(chargeFee)}, with '
              '${_guarantorIds.length} guarantor(s).'
          : 'Top up and restructure ${Fmt.label(unclearedLoan.product)} for '
              '$borrowerName. Existing balance is ${Fmt.money(unclearedLoan.balance)}, '
              'top-up is ${Fmt.money(amount)}, new term is $months month(s), '
              'charge fee is ${Fmt.money(chargeFee)}.',
      confirmLabel: unclearedLoan == null ? 'Save loan' : 'Top up loan',
      icon: Icons.account_balance_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      if (unclearedLoan != null) {
        await ref.read(adminRepositoryProvider).topUpLoan(
              loanId: unclearedLoan.id,
              amount: amount,
              repaymentMonths: months,
              interestRate: interestRate,
              chargeFee: chargeFee,
              reason: _purpose.text,
            );
        ref.invalidate(loansProvider(''));
        ref.invalidate(memberLoansProvider(_memberId!));
        ref.invalidate(saccoStatusProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Existing loan topped up.')),
          );
          Navigator.of(context).pop();
        }
        return;
      }

      final loan = await ref.read(adminRepositoryProvider).createLoan(
            memberId: _memberId!,
            product: _product,
            amount: amount,
            interestRate: interestRate,
            chargeFee: chargeFee,
            repaymentMonths: months,
            purpose: _purpose.text,
            signedFormReference: _formRef.text,
          );
      for (final guarantorId in _guarantorIds) {
        await ref.read(adminRepositoryProvider).createLoanGuarantor(
              loanId: loan.id,
              memberId: guarantorId,
            );
      }
      ref.invalidate(loansProvider(''));
      ref.invalidate(memberLoansProvider(_memberId!));
      ref.invalidate(guarantorRequestsProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_guarantorIds.isEmpty
                ? 'Loan data saved.'
                : 'Loan data and guarantors saved.'),
          ),
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
    final membersAsync = ref.watch(membersProvider(''));
    final loansAsync = ref.watch(loansProvider(''));
    final guarantorsAsync = ref.watch(guarantorRequestsProvider);
    final session = ref.watch(sessionProvider).asData?.value;
    final canSetTerms = session?.can('loans:terms') ?? false;
    final members = membersAsync.asData?.value
            .where((m) => m.status == 'active')
            .toList() ??
        const <Member>[];
    final loans = loansAsync.asData?.value ?? const <Loan>[];
    final guarantorRequests =
        guarantorsAsync.asData?.value ?? const <LoanGuarantor>[];
    final borrower = _selectedBorrower(members);
    final unclearedLoan = _unclearedLoan(loans);
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
                'Add loan data',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _memberId,
                decoration: const InputDecoration(labelText: 'Member'),
                items: members
                    .map((m) => DropdownMenuItem(
                          value: m.id,
                          child: Text(
                            '${m.fullName} - ${m.membershipNo}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ))
                    .toList(),
                onChanged: _busy
                    ? null
                    : (v) => setState(() {
                          _memberId = v;
                          for (final loan in loans) {
                            if (loan.memberId == v && loan.isOpen) {
                              _months.text = '${loan.repaymentMonths}';
                              if (canSetTerms) {
                                _interestRate.text =
                                    loan.interestRate.toStringAsFixed(2);
                              }
                              break;
                            }
                          }
                        }),
                validator: (v) => v == null ? 'Choose a member.' : null,
              ),
              if (borrower != null) ...[
                const SizedBox(height: 8),
                _BorrowerExposure(
                  member: borrower,
                  members: members,
                  loans: loans,
                  guarantorRequests: guarantorRequests,
                ),
                if (unclearedLoan != null) ...[
                  const SizedBox(height: 8),
                  _TopUpNotice(loan: unclearedLoan),
                ],
              ],
              if (unclearedLoan == null) ...[
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _product,
                  decoration: const InputDecoration(labelText: 'Loan product'),
                  items: _loanProducts
                      .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                      .toList(),
                  onChanged:
                      _busy ? null : (v) => setState(() => _product = v!),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _amount,
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        labelText:
                            unclearedLoan == null ? 'Amount' : 'Top-up amount',
                      ),
                      validator: (v) {
                        final parsed =
                            num.tryParse((v ?? '').trim().replaceAll(',', ''));
                        return parsed == null || parsed <= 0
                            ? 'Enter amount.'
                            : null;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _months,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText:
                            unclearedLoan == null ? 'Months' : 'New months',
                      ),
                      validator: (v) {
                        final parsed = int.tryParse((v ?? '').trim());
                        return parsed == null || parsed < 1 || parsed > 60
                            ? '1 to 60.'
                            : null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (canSetTerms) ...[
                TextFormField(
                  controller: _interestRate,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Interest rate (%)',
                    hintText: 'Leave blank for product default',
                  ),
                  validator: (v) {
                    final text = (v ?? '').trim();
                    if (text.isEmpty) return null;
                    final parsed = num.tryParse(text.replaceAll(',', ''));
                    return parsed == null || parsed < 0 || parsed > 100
                        ? '0 to 100.'
                        : null;
                  },
                ),
                const SizedBox(height: 10),
              ],
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
                controller: _purpose,
                minLines: 2,
                maxLines: 3,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Purpose'),
                validator: (v) => v == null || v.trim().length < 3
                    ? 'Enter a loan purpose.'
                    : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _formRef,
                textInputAction: TextInputAction.done,
                decoration: InputDecoration(
                  labelText: unclearedLoan == null
                      ? 'Signed form reference'
                      : 'Top-up form reference',
                ),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Enter signed form reference.'
                    : null,
              ),
              const SizedBox(height: 16),
              Text(
                'Guarantors',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              if (unclearedLoan != null)
                Text(
                  'Guarantors are not changed for a top-up.',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                )
              else if (_memberId == null)
                Text(
                  'Choose the borrower first.',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                )
              else
                ...members
                    .where((m) => m.id != _memberId)
                    .map((m) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _GuarantorChoice(
                            member: m,
                            members: members,
                            loans: loans,
                            guarantorRequests: guarantorRequests,
                            selected: _guarantorIds.contains(m.id),
                            onChanged: _busy
                                ? null
                                : (selected) => setState(() {
                                      _setGuarantorSelected(m.id, selected);
                                    }),
                          ),
                        )),
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
                  label: Text(unclearedLoan == null
                      ? 'Save loan'
                      : 'Top up / restructure'),
                  onPressed: _busy ? null : _save,
                ),
              ),
              if (membersAsync.isLoading ||
                  loansAsync.isLoading ||
                  guarantorsAsync.isLoading) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _BorrowerExposure extends StatelessWidget {
  const _BorrowerExposure({
    required this.member,
    required this.members,
    required this.loans,
    required this.guarantorRequests,
  });

  final Member member;
  final List<Member> members;
  final List<Loan> loans;
  final List<LoanGuarantor> guarantorRequests;

  @override
  Widget build(BuildContext context) {
    final openLoans = loans
        .where((loan) => loan.memberId == member.id && loan.isOpen)
        .toList();
    final loanBalance =
        openLoans.fold<num>(0, (sum, loan) => sum + loan.balance);
    final guarantees = guarantorRequests
        .where((request) =>
            request.memberId == member.id && request.activeCommitment)
        .toList();
    final guaranteedBalance = guarantees.fold<num>(
        0, (sum, request) => sum + request.guaranteedLoanBalance);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(member.fullName,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                Text('Savings ${Fmt.money(member.savings)}'),
                Text('Shares ${Fmt.money(member.shares)}'),
                Text('Welfare ${Fmt.money(member.welfare)}'),
                Text('${openLoans.length} open loan(s)'),
                Text('Loan bal ${Fmt.money(loanBalance)}'),
                Text('Guaranteed loan bal ${Fmt.money(guaranteedBalance)}'),
              ],
            ),
            if (guarantees.isNotEmpty) ...[
              const SizedBox(height: 6),
              ...guarantees.map((request) => Text(
                    _guaranteedMemberLabel(request),
                    style: const TextStyle(fontSize: 12),
                  )),
            ],
          ],
        ),
      ),
    );
  }

  String _guaranteedMemberLabel(LoanGuarantor request) {
    final loan = request.loan;
    final borrowerId = loan?.memberId ?? '';
    var borrowerName = borrowerId;
    for (final candidate in members) {
      if (candidate.id == borrowerId) {
        borrowerName = candidate.fullName;
        break;
      }
    }
    final product = loan == null ? 'loan' : Fmt.label(loan.product);
    return 'Guaranteed: $borrowerName - $product - ${Fmt.money(request.guaranteedLoanBalance)}';
  }
}

class _TopUpNotice extends StatelessWidget {
  const _TopUpNotice({required this.loan});

  final Loan loan;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'This member has an uncleared ${Fmt.label(loan.product)} balance of '
        '${Fmt.money(loan.balance)}. The amount, new months, interest rate, '
        'and charge fee will restructure this loan.',
        style: TextStyle(color: scheme.onErrorContainer),
      ),
    );
  }
}

class _GuarantorChoice extends StatelessWidget {
  const _GuarantorChoice({
    required this.member,
    required this.members,
    required this.loans,
    required this.guarantorRequests,
    required this.selected,
    required this.onChanged,
  });

  final Member member;
  final List<Member> members;
  final List<Loan> loans;
  final List<LoanGuarantor> guarantorRequests;
  final bool selected;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final openLoans = loans
        .where((loan) => loan.memberId == member.id && loan.isOpen)
        .toList();
    final loanBalance =
        openLoans.fold<num>(0, (sum, loan) => sum + loan.balance);
    final guarantees = guarantorRequests
        .where((request) =>
            request.memberId == member.id && request.activeCommitment)
        .toList();
    final guaranteedBalance = guarantees.fold<num>(
        0, (sum, request) => sum + request.guaranteedLoanBalance);
    var capacity = member.savings;
    for (final request in guarantees) {
      if (request.capacity > 0 && request.capacity < capacity) {
        capacity = request.capacity;
      }
    }
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: selected,
              onChanged: onChanged == null
                  ? null
                  : (value) => onChanged!(value ?? false),
              title: Text(member.fullName,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(member.membershipNo),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: Wrap(
                spacing: 10,
                runSpacing: 4,
                children: [
                  _mini('Savings', Fmt.money(member.savings)),
                  _mini('Shares', Fmt.money(member.shares)),
                  _mini('Welfare', Fmt.money(member.welfare)),
                  _mini('Open loans', '${openLoans.length}'),
                  _mini('Loan bal', Fmt.money(loanBalance)),
                  _mini('Guaranteed loan bal', Fmt.money(guaranteedBalance)),
                  _mini('Capacity', Fmt.money(capacity)),
                ],
              ),
            ),
            if (openLoans.isNotEmpty || guarantees.isNotEmpty) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  [
                    if (openLoans.isNotEmpty) 'Has active loan exposure',
                    if (guarantees.isNotEmpty)
                      'Already guaranteeing another loan',
                  ].join(' - '),
                  style: TextStyle(fontSize: 12, color: scheme.error),
                ),
              ),
            ],
            if (guarantees.isNotEmpty) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: guarantees
                      .map((request) => Text(
                            _guaranteedMemberLabel(request),
                            style: const TextStyle(fontSize: 12),
                          ))
                      .toList(),
                ),
              ),
            ],
            if (selected && guarantees.isNotEmpty) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Guaranteed loan balance: ${Fmt.money(guaranteedBalance)}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _mini(String label, String value) {
    return Text('$label $value', style: const TextStyle(fontSize: 12));
  }

  String _guaranteedMemberLabel(LoanGuarantor request) {
    final loan = request.loan;
    final borrowerId = loan?.memberId ?? '';
    var borrowerName = borrowerId;
    for (final candidate in members) {
      if (candidate.id == borrowerId) {
        borrowerName = candidate.fullName;
        break;
      }
    }
    final product = loan == null ? 'loan' : Fmt.label(loan.product);
    return 'Guaranteed: $borrowerName - $product - ${Fmt.money(request.guaranteedLoanBalance)}';
  }
}

class _LoanTile extends StatelessWidget {
  const _LoanTile({required this.loan, this.memberName});
  final Loan loan;
  final String? memberName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => LoanDetailScreen(loan: loan))),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(Fmt.label(loan.product),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  StatusChip(loan.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(memberName ?? loan.memberId,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
              const Divider(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _mini(context, 'Principal', Fmt.money(loan.amount)),
                  _mini(context, 'Balance', Fmt.money(loan.balance),
                      strong: true),
                  if (loan.inArrears)
                    _mini(context, 'Arrears', Fmt.money(loan.arrearsAmount),
                        color: const Color(0xFFB91C1C)),
                ],
              ),
            ],
          ),
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

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/member_picker.dart';
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
  final _scrollController = ScrollController();
  final _amount = TextEditingController();
  final _interestRate = TextEditingController();
  final _chargeFee = TextEditingController(text: '0');
  final _months = TextEditingController(text: '12');
  final _purpose = TextEditingController();
  final _formRef = TextEditingController();

  Member? _borrower;
  MemberLoanExposure? _borrowerExposure;
  bool _loadingBorrower = false;
  Future<void>? _borrowerLookup;
  int _borrowerSelection = 0;

  String _product = _loanProducts.first;
  final List<Member> _guarantors = [];
  final Map<String, MemberLoanExposure> _guarantorExposures = {};
  bool _busy = false;
  String? _formError;

  @override
  void dispose() {
    _scrollController.dispose();
    _amount.dispose();
    _interestRate.dispose();
    _chargeFee.dispose();
    _months.dispose();
    _purpose.dispose();
    _formRef.dispose();
    super.dispose();
  }

  bool get _canSetTerms =>
      ref.read(sessionProvider).asData?.value.can('loans:terms') ?? false;

  Future<void> _pickBorrower() async {
    final picked = await showMemberPicker(
      context,
      title: 'Select borrower',
      fetchPage: (search, page) => ref
          .read(adminRepositoryProvider)
          .loanMemberCandidatesPage(search: search, page: page),
      showLoanExposure: true,
      unavailableReason: (member) =>
          memberStatusAllowsLoanSelection(member.status)
              ? null
              : 'Unavailable: ${Fmt.label(member.status)} member',
    );
    if (picked == null || !mounted) return;
    if (!memberStatusAllowsLoanSelection(picked.status)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Only active members can apply for loans.')),
      );
      return;
    }
    final selection = ++_borrowerSelection;
    setState(() {
      _borrower = picked;
      _borrowerExposure = null;
      _loadingBorrower = true;
      _formError = null;
      _guarantors.clear();
      _guarantorExposures.clear();
    });
    final lookup = _loadBorrowerExposure(picked, selection);
    _borrowerLookup = lookup;
    await lookup;
  }

  Future<void> _loadBorrowerExposure(Member picked, int selection) async {
    try {
      final exposure =
          await ref.read(adminRepositoryProvider).memberLoanExposure(picked.id);
      if (!mounted || selection != _borrowerSelection) return;
      if (!memberStatusAllowsLoanSelection(exposure.status)) {
        setState(() {
          _borrower = null;
          _borrowerExposure = null;
          _loadingBorrower = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Only active members can apply for loans.')),
        );
        return;
      }
      setState(() {
        _borrowerExposure = exposure;
        _loadingBorrower = false;
        final open = exposure.openLoan;
        if (open != null) {
          _months.text = '${open.repaymentMonths}';
          if (_canSetTerms) {
            _interestRate.text = open.interestRate.toStringAsFixed(2);
          }
        }
      });
    } catch (e) {
      if (!mounted || selection != _borrowerSelection) return;
      setState(() {
        _borrowerExposure = null;
        _loadingBorrower = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text(
          'Loan history could not be checked. You can still save; the server will validate the loan.',
        ),
      ));
    }
  }

  Future<void> _addGuarantor() async {
    final picked = await showMemberPicker(
      context,
      title: 'Add guarantor',
      fetchPage: (search, page) =>
          ref.read(adminRepositoryProvider).loanMemberCandidatesPage(
                search: search,
                page: page,
                guarantorOnly: true,
                excludeMemberId: _borrower?.id,
              ),
      showLoanExposure: true,
      unavailableReason: (member) {
        if (member.id == _borrower?.id) return 'Borrower cannot guarantee';
        if (_guarantors.any((item) => item.id == member.id)) {
          return 'Already selected';
        }
        return memberStatusAllowsLoanSelection(member.status)
            ? null
            : 'Unavailable: ${Fmt.label(member.status)} member';
      },
    );
    if (picked == null || !mounted) return;
    if (picked.id == _borrower?.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The borrower cannot guarantee.')),
      );
      return;
    }
    if (!memberStatusAllowsLoanSelection(picked.status)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Only active members can guarantee.')),
      );
      return;
    }
    if (_guarantors.any((g) => g.id == picked.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That guarantor is already added.')),
      );
      return;
    }
    setState(() => _guarantors.add(picked));
    try {
      final exposure =
          await ref.read(adminRepositoryProvider).memberLoanExposure(picked.id);
      if (!mounted) return;
      setState(() => _guarantorExposures[picked.id] = exposure);
    } catch (_) {
      // Exposure is advisory; keep the guarantor even if it fails to load.
    }
  }

  void _removeGuarantor(String memberId) {
    setState(() {
      _guarantors.removeWhere((g) => g.id == memberId);
      _guarantorExposures.remove(memberId);
    });
  }

  Future<void> _save() async {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _formError = null);
    final borrower = _borrower;
    if (borrower == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose a borrower first.')),
      );
      return;
    }
    final borrowerLookup = _borrowerLookup;
    if (_loadingBorrower && borrowerLookup != null) {
      setState(() => _busy = true);
      await borrowerLookup;
      if (!mounted) return;
      setState(() => _busy = false);
      if (_borrower?.id != borrower.id) return;
    }
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complete the highlighted loan fields before saving.'),
        ),
      );
      if (_scrollController.hasClients) {
        await _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
      return;
    }
    final unclearedLoan = _borrowerExposure?.openLoan;
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final months = int.parse(_months.text.trim());
    final interestRate = _interestRate.text.trim().isEmpty
        ? null
        : num.parse(_interestRate.text.trim().replaceAll(',', ''));
    final chargeFee = num.parse(_chargeFee.text.trim().replaceAll(',', ''));
    final session = ref.read(sessionProvider).asData?.value;
    final defaultInterestRate = session == null
        ? null
        : ref
            .read(saccoProfileProvider(session.tenantId))
            .asData
            ?.value
            .loanInterestRate;
    final estimatedTotal = _estimatedTotalPayable(defaultInterestRate);
    final borrowerSavings = _borrowerExposure?.savings;
    if (unclearedLoan == null &&
        estimatedTotal != null &&
        borrowerSavings != null) {
      final shortfall =
          (estimatedTotal - borrowerSavings).clamp(0, double.infinity);
      final selectedCapacity = _guarantors.fold<num>(
        0,
        (total, guarantor) =>
            total + (_guarantorExposures[guarantor.id]?.guaranteeCapacity ?? 0),
      );
      final allGuarantorCapacitiesLoaded = _guarantors.every(
        (guarantor) => _guarantorExposures.containsKey(guarantor.id),
      );
      if (shortfall > 0 && _guarantors.isEmpty) {
        setState(() => _formError =
            'Select guarantors to cover ${Fmt.money(shortfall)}. Interest and charges are included.');
        return;
      }
      if (allGuarantorCapacitiesLoaded && shortfall > selectedCapacity) {
        setState(() => _formError =
            'Selected guarantors are short by ${Fmt.money(shortfall - selectedCapacity)}.');
        return;
      }
      if (shortfall == 0 && _guarantors.isNotEmpty) {
        setState(() => _formError =
            'Remove guarantors because the member savings cover the full repayment.');
        return;
      }
    }
    final borrowerName = borrower.fullName;
    final confirmed = await confirmAction(
      context,
      title: unclearedLoan == null ? 'Save loan data?' : 'Top up loan?',
      message: unclearedLoan == null
          ? 'Record a completed ${Fmt.money(amount)} $_product for $borrowerName over '
              '$months month(s), charge fee ${Fmt.money(chargeFee)}, with '
              '${_guarantors.length} signed guarantor(s). All details will save together.'
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
        ref.invalidate(memberLoansProvider(borrower.id));
        ref.invalidate(memberLoanExposureProvider(borrower.id));
        ref.invalidate(saccoStatusProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Existing loan topped up.')),
          );
          Navigator.of(context).pop();
        }
        return;
      }

      await ref.read(adminRepositoryProvider).createLoan(
            memberId: borrower.id,
            product: _product,
            amount: amount,
            interestRate: interestRate,
            chargeFee: chargeFee,
            repaymentMonths: months,
            purpose: _purpose.text,
            signedFormReference: _formRef.text,
            guarantorMemberIds: _guarantors.map((item) => item.id).toList(),
          );
      ref.invalidate(loansProvider(''));
      ref.invalidate(memberLoansProvider(borrower.id));
      ref.invalidate(memberLoanExposureProvider(borrower.id));
      ref.invalidate(saccoStatusProvider);
      ref.invalidate(guarantorRequestsProvider);
      if (mounted) {
        final messenger = ScaffoldMessenger.of(context);
        Navigator.of(context).pop();
        messenger.showSnackBar(const SnackBar(
          content: Text('Complete loan and guarantor details saved together.'),
        ));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _formError = 'Loan was not saved: $e');
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final canSetTerms =
        ref.watch(sessionProvider).asData?.value.can('loans:terms') ?? false;
    final borrower = _borrower;
    final exposure = _borrowerExposure;
    final unclearedLoan = exposure?.openLoan;
    final session = ref.watch(sessionProvider).asData?.value;
    final defaultInterestRate = session == null
        ? null
        : ref
            .watch(saccoProfileProvider(session.tenantId))
            .asData
            ?.value
            .loanInterestRate;
    final estimatedTotal = _estimatedTotalPayable(defaultInterestRate);
    final selectedGuaranteeCapacity = _guarantors.fold<num>(
      0,
      (total, guarantor) =>
          total + (_guarantorExposures[guarantor.id]?.guaranteeCapacity ?? 0),
    );
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: SingleChildScrollView(
          controller: _scrollController,
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
              InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: _busy ? null : _pickBorrower,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Borrower',
                    suffixIcon: Icon(Icons.search),
                  ),
                  child: Text(
                    borrower == null
                        ? 'Tap to choose a member'
                        : '${borrower.fullName} - ${borrower.membershipNo}',
                    style: TextStyle(
                      color: borrower == null ? scheme.onSurfaceVariant : null,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              if (_loadingBorrower) ...[
                const SizedBox(height: 8),
                const LinearProgressIndicator(),
              ],
              if (exposure != null) ...[
                const SizedBox(height: 8),
                _BorrowerExposureCard(exposure: exposure),
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
                      onChanged: (_) => setState(() {}),
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
                  onChanged: (_) => setState(() {}),
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
                onChanged: (_) => setState(() {}),
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
                      ? 'Signed loan and guarantor form reference'
                      : 'Top-up form reference',
                ),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Enter signed form reference.'
                    : null,
              ),
              const SizedBox(height: 16),
              if (exposure != null && estimatedTotal != null) ...[
                _LoanCoverageCard(
                  totalPayable: estimatedTotal,
                  borrowerSavings: exposure.savings,
                  selectedGuaranteeCapacity: selectedGuaranteeCapacity,
                ),
                const SizedBox(height: 16),
              ],
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
                  style: TextStyle(color: scheme.onSurfaceVariant),
                )
              else if (borrower == null)
                Text(
                  'Choose the borrower first.',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                )
              else ...[
                ..._guarantors.map((g) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _GuarantorCard(
                        member: g,
                        exposure: _guarantorExposures[g.id],
                        onRemove: _busy ? null : () => _removeGuarantor(g.id),
                      ),
                    )),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.person_add_alt_1_outlined),
                    label: const Text('Add guarantor'),
                    onPressed: _busy ? null : _addGuarantor,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (_formError != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _formError!,
                    style: TextStyle(color: scheme.onErrorContainer),
                  ),
                ),
                const SizedBox(height: 12),
              ],
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
                  label: Text(_busy
                      ? 'Saving...'
                      : unclearedLoan == null
                          ? 'Save loan'
                          : 'Top up / restructure'),
                  onPressed: _busy ? null : _save,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  num? _estimatedTotalPayable(num? defaultInterestRate) {
    final amount = num.tryParse(_amount.text.trim().replaceAll(',', ''));
    final months = int.tryParse(_months.text.trim());
    final charge = num.tryParse(_chargeFee.text.trim().replaceAll(',', ''));
    final enteredRate =
        num.tryParse(_interestRate.text.trim().replaceAll(',', ''));
    final rate = enteredRate ?? defaultInterestRate;
    if (amount == null || amount <= 0 || months == null || months < 1) {
      return null;
    }
    if (charge == null || charge < 0 || rate == null || rate < 0) return null;
    return amount + (amount * rate * months / 100) + charge;
  }
}

class _LoanCoverageCard extends StatelessWidget {
  const _LoanCoverageCard({
    required this.totalPayable,
    required this.borrowerSavings,
    required this.selectedGuaranteeCapacity,
  });

  final num totalPayable;
  final num borrowerSavings;
  final num selectedGuaranteeCapacity;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final shortfall =
        totalPayable > borrowerSavings ? totalPayable - borrowerSavings : 0;
    final requiresGuarantor = shortfall > 0;
    final remainingShortfall =
        (shortfall - selectedGuaranteeCapacity).clamp(0, double.infinity);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: requiresGuarantor
            ? scheme.tertiaryContainer
            : scheme.primaryContainer,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Estimated total repayment: ${Fmt.money(totalPayable)}'),
          Text('Member savings: ${Fmt.money(borrowerSavings)}'),
          const SizedBox(height: 4),
          Text(
            requiresGuarantor
                ? remainingShortfall > 0
                    ? 'Select guarantors for ${Fmt.money(remainingShortfall)} more. Interest and charges are included.'
                    : 'Selected guarantors fully cover the ${Fmt.money(shortfall)} shortfall.'
                : 'No guarantor required: member savings cover the loan, interest and charges.',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _BorrowerExposureCard extends StatelessWidget {
  const _BorrowerExposureCard({required this.exposure});

  final MemberLoanExposure exposure;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(exposure.fullName,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                Text('Savings ${Fmt.money(exposure.savings)}'),
                Text('Shares ${Fmt.money(exposure.shares)}'),
                Text('Welfare ${Fmt.money(exposure.welfare)}'),
                Text('${exposure.openLoanCount} open loan(s)'),
                Text('Loan bal ${Fmt.money(exposure.openLoanBalance)}'),
                Text(
                    'Guaranteed loan bal ${Fmt.money(exposure.guaranteedLoanBalance)}'),
              ],
            ),
            if (exposure.guaranteeLabels.isNotEmpty) ...[
              const SizedBox(height: 6),
              ...exposure.guaranteeLabels.map((label) => Text(
                    label,
                    style: const TextStyle(fontSize: 12),
                  )),
            ],
          ],
        ),
      ),
    );
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

class _GuarantorCard extends StatelessWidget {
  const _GuarantorCard({
    required this.member,
    required this.exposure,
    required this.onRemove,
  });

  final Member member;
  final MemberLoanExposure? exposure;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final data = exposure;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(member.fullName,
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(member.membershipNo,
                          style: TextStyle(
                              fontSize: 12, color: scheme.onSurfaceVariant)),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Remove guarantor',
                  onPressed: onRemove,
                ),
              ],
            ),
            if (data == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child:
                    Text('Loading capacity...', style: TextStyle(fontSize: 12)),
              )
            else ...[
              Wrap(
                spacing: 10,
                runSpacing: 4,
                children: [
                  _mini('Savings', Fmt.money(data.savings)),
                  _mini('Shares', Fmt.money(data.shares)),
                  _mini('Welfare', Fmt.money(data.welfare)),
                  _mini('Open loans', '${data.openLoanCount}'),
                  _mini('Loan bal', Fmt.money(data.openLoanBalance)),
                  _mini('Guaranteed loan bal',
                      Fmt.money(data.guaranteedLoanBalance)),
                  _mini('Capacity', Fmt.money(data.guaranteeCapacity)),
                ],
              ),
              if (data.openLoanCount > 0 ||
                  data.guaranteeLabels.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  [
                    if (data.openLoanCount > 0) 'Has active loan exposure',
                    if (data.guaranteeLabels.isNotEmpty)
                      'Already guaranteeing another loan',
                  ].join(' - '),
                  style: TextStyle(fontSize: 12, color: scheme.error),
                ),
              ],
              if (data.guaranteeLabels.isNotEmpty) ...[
                const SizedBox(height: 8),
                ...data.guaranteeLabels.map((label) => Text(
                      label,
                      style: const TextStyle(fontSize: 12),
                    )),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _mini(String label, String value) {
    return Text('$label $value', style: const TextStyle(fontSize: 12));
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
        onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => LoanDetailScreen(loan: loan))),
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
                  style:
                      TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
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

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import '../loans/loan_detail_screen.dart';
import 'fund_transactions_screen.dart';
import 'full_statement_screen.dart';
import 'member_kyc_screen.dart';
import 'loan_transactions_screen.dart';

/// A member's financial profile: savings, shares, welfare and loan balances,
/// plus the loans they hold (each opens its payment history).
class MemberDetailScreen extends ConsumerWidget {
  const MemberDetailScreen({super.key, required this.memberId});
  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final memberAsync = ref.watch(memberProvider(memberId));
    final canChangeStatus =
        ref.watch(sessionProvider).asData?.value.can('members:approve') ??
            false;
    final canEdit = ref
            .watch(sessionProvider)
            .asData
            ?.value
            .canAny(['members:create', 'members:approve']) ??
        false;
    return Scaffold(
      appBar: AppBar(title: const Text('Member')),
      body: memberAsync.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load this member.',
          detail: '$e',
          onRetry: () => ref.invalidate(memberProvider(memberId)),
        ),
        data: (m) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(memberProvider(memberId));
            if (m.memberType == 'group') {
              ref.invalidate(groupOfficialsProvider(memberId));
            }
            ref.invalidate(memberLoansProvider(memberId));
            ref.invalidate(memberLoanExposureProvider(memberId));
            ref.invalidate(memberFundBalancesProvider);
            ref.invalidate(fundTypesProvider);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Identity(member: m),
              if (m.memberType == 'group') ...[
                const SizedBox(height: 16),
                _GroupOfficials(memberId: memberId),
              ],
              if (canChangeStatus) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.manage_accounts_outlined),
                    label: Text(
                        m.memberType == 'group' && m.status == 'applicant'
                            ? 'Review application'
                            : 'Change status'),
                    onPressed: () => showModalBottomSheet<void>(
                      context: context,
                      showDragHandle: true,
                      isScrollControlled: true,
                      builder: (_) => _MemberStatusSheet(
                          memberId: memberId, current: m.status),
                    ),
                  ),
                ),
              ],
              if (canEdit) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Edit contact'),
                    onPressed: () => showModalBottomSheet<void>(
                      context: context,
                      showDragHandle: true,
                      isScrollControlled: true,
                      builder: (_) => _MemberContactSheet(member: m),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Text('Financial standing',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _FinancialStanding(member: m),
              const SizedBox(height: 24),
              Text('Balances', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _MemberBalanceBoard(member: m),
              const SizedBox(height: 24),
              Text('Loans', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _MemberLoans(memberId: memberId),
              const SizedBox(height: 20),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: const Text('View full statement'),
                  subtitle:
                      const Text('All transactions with running balances'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => FullStatementScreen(
                        memberId: memberId, memberName: m.fullName),
                  )),
                ),
              ),
              const SizedBox(height: 10),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.badge_outlined),
                  title: const Text('Next of kin, beneficiaries & documents'),
                  subtitle: const Text('KYC and contact details'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => MemberKycScreen(
                        memberId: memberId, memberName: m.fullName),
                  )),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _FinancialStanding extends ConsumerWidget {
  const _FinancialStanding({required this.member});

  final Member member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberLoanExposureProvider(member.id));
    return async.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: LinearProgressIndicator(),
        ),
      ),
      error: (error, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Could not load financial standing.'),
              const SizedBox(height: 8),
              Text('$error',
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () =>
                    ref.invalidate(memberLoanExposureProvider(member.id)),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (exposure) => _FinancialStandingCard(exposure: exposure),
    );
  }
}

class _FinancialStandingCard extends StatelessWidget {
  const _FinancialStandingCard({required this.exposure});

  final MemberLoanExposure exposure;

  @override
  Widget build(BuildContext context) {
    final canSelect = memberStatusAllowsLoanSelection(exposure.status);
    final scheme = Theme.of(context).colorScheme;
    final statusColor = canSelect ? const Color(0xFF15803D) : scheme.error;
    return SectionCard(
      title: 'Loan and guarantee exposure',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  canSelect
                      ? Icons.verified_user_outlined
                      : Icons.block_outlined,
                  color: statusColor,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    canSelect
                        ? 'Active for loan and guarantee workflows'
                        : '${Fmt.label(exposure.status)} members cannot be selected for new loans or guarantees.',
                    style: TextStyle(
                        color: statusColor, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          KeyValueRow('Open loans', '${exposure.openLoanCount}'),
          KeyValueRow(
              'Own outstanding balance', Fmt.money(exposure.openLoanBalance)),
          KeyValueRow('Guaranteed loan liabilities',
              Fmt.money(exposure.guaranteedLoanBalance)),
          KeyValueRow(
              'Total loan exposure', Fmt.money(exposure.totalLoanExposure),
              emphasize: true),
          const Divider(height: 22),
          KeyValueRow(
              'Guarantee ceiling', Fmt.money(exposure.guaranteeCeiling)),
          KeyValueRow(
              'Already committed', Fmt.money(exposure.committedGuarantees)),
          KeyValueRow('Available guarantee capacity',
              Fmt.money(exposure.guaranteeCapacity),
              emphasize: true),
          if (exposure.guaranteeLabels.isNotEmpty) ...[
            const Divider(height: 22),
            Text('Guarantee commitments',
                style: Theme.of(context)
                    .textTheme
                    .labelLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            ...exposure.guaranteeLabels.map(
              (label) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('• $label'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _GroupOfficials extends ConsumerWidget {
  const _GroupOfficials({required this.memberId});

  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(groupOfficialsProvider(memberId));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Group officials', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        async.when(
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Could not load group officials. $error'),
            ),
          ),
          data: (officials) => officials.isEmpty
              ? const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No group officials were submitted.'),
                  ),
                )
              : Column(
                  children: officials
                      .map((official) => Card(
                            child: ListTile(
                              leading: const Icon(Icons.badge_outlined),
                              title: Text(official.fullName),
                              subtitle: Text(
                                '${Fmt.label(official.role)}\n${official.phone}\n${official.email}',
                              ),
                              isThreeLine: true,
                            ),
                          ))
                      .toList(),
                ),
        ),
      ],
    );
  }
}

class _MemberBalanceBoard extends ConsumerWidget {
  const _MemberBalanceBoard({required this.member});

  final Member member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final funds =
        ref.watch(fundTypesProvider).asData?.value ?? const <FundType>[];
    final balances = ref.watch(memberFundBalancesProvider).asData?.value ??
        const <MemberFundBalance>[];
    final byCode = {
      for (final b in balances.where((b) => b.memberId == member.id))
        b.fundCode: b.balance
    };
    final activeFunds = funds.where((f) => f.active).toList();
    final visibleFunds = activeFunds.isEmpty
        ? const [
            FundType(
              id: 'savings',
              code: 'savings',
              name: 'Savings',
              basis: 'savings',
              description: '',
              system: true,
              active: true,
              displayOrder: 10,
            ),
            FundType(
              id: 'shares',
              code: 'shares',
              name: 'Shares',
              basis: 'shares',
              description: '',
              system: true,
              active: true,
              displayOrder: 20,
            ),
            FundType(
              id: 'welfare',
              code: 'welfare',
              name: 'Welfare',
              basis: 'welfare',
              description: '',
              system: true,
              active: true,
              displayOrder: 30,
            ),
          ]
        : activeFunds;
    final cards = [
      ...visibleFunds.map((f) {
        final value = byCode[f.code] ??
            (f.code == 'savings'
                ? member.savings
                : f.code == 'shares'
                    ? member.shares
                    : f.code == 'welfare'
                        ? member.welfare
                        : 0);
        return BalanceCard(
          label: f.code == 'savings' ? 'Total savings' : f.name,
          value: Fmt.money(value),
          icon: _fundIcon(f.code, f.basis),
          color: _fundColor(f.code, f.basis),
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => FundTransactionsScreen(
              memberId: member.id,
              memberName: member.fullName,
              fund: f.code,
              fundLabel: f.name,
              color: _fundColor(f.code, f.basis),
            ),
          )),
        );
      }),
      _LoanBalanceCard(
        memberId: member.id,
        memberName: member.fullName,
        initialBalance: member.loanBalance,
      ),
      _LoanStatusCard(
        memberId: member.id,
        initialStatus: member.loanStatus,
      ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.25,
      children: cards,
    );
  }
}

IconData _fundIcon(String code, String basis) {
  switch (code) {
    case 'savings':
      return Icons.savings_outlined;
    case 'shares':
      return Icons.pie_chart_outline;
    case 'welfare':
      return Icons.volunteer_activism_outlined;
  }
  return basis == 'welfare'
      ? Icons.health_and_safety_outlined
      : Icons.account_balance_wallet_outlined;
}

Color _fundColor(String code, String basis) {
  switch (code) {
    case 'savings':
      return const Color(0xFF0F766E);
    case 'shares':
      return const Color(0xFF7C3AED);
    case 'welfare':
      return const Color(0xFF9333EA);
  }
  return basis == 'welfare' ? const Color(0xFFDB2777) : const Color(0xFF64748B);
}

class _Identity extends StatelessWidget {
  const _Identity({required this.member});
  final Member member;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(member.fullName.isEmpty ? '—' : member.fullName,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800)),
                ),
                StatusChip(member.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(
                '${member.membershipNo.isEmpty ? 'No number' : member.membershipNo} · ${Fmt.label(member.memberType)}',
                style: TextStyle(color: scheme.onSurfaceVariant)),
            const Divider(height: 24),
            KeyValueRow('Phone', member.phone.isEmpty ? '—' : member.phone),
            KeyValueRow(
                'WhatsApp', member.whatsapp.isEmpty ? '—' : member.whatsapp),
            KeyValueRow('Email', member.email.isEmpty ? '—' : member.email),
            if (member.address.isNotEmpty)
              KeyValueRow('Address', member.address),
            KeyValueRow('KYC status', Fmt.label(member.kycStatus)),
            KeyValueRow('Joined', Fmt.date(member.joiningDate)),
            KeyValueRow('Total worth', Fmt.money(member.totalWorth),
                emphasize: true),
          ],
        ),
      ),
    );
  }
}

/// Sums the member's outstanding loan balances into a single card.
class _LoanBalanceCard extends ConsumerWidget {
  const _LoanBalanceCard({
    required this.memberId,
    required this.memberName,
    required this.initialBalance,
  });
  final String memberId;
  final String memberName;
  final num initialBalance;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberLoansProvider(memberId));
    final value = async.maybeWhen(
      data: (loans) => Fmt.money(
          loans.where((l) => l.isOpen).fold<num>(0, (s, l) => s + l.balance)),
      orElse: () => Fmt.money(initialBalance),
    );
    return BalanceCard(
        label: 'Loan balance',
        value: value,
        icon: Icons.account_balance_outlined,
        color: const Color(0xFFB91C1C),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => LoanTransactionsScreen(
                  memberId: memberId, memberName: memberName),
            )));
  }
}

class _LoanStatusCard extends ConsumerWidget {
  const _LoanStatusCard({
    required this.memberId,
    required this.initialStatus,
  });

  final String memberId;
  final String initialStatus;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(memberLoansProvider(memberId)).maybeWhen(
          data: _aggregateLoanStatus,
          orElse: () => initialStatus.isEmpty ? 'none' : initialStatus,
        );
    return BalanceCard(
      label: 'Loan status',
      value: status == 'none' ? 'No active loan' : Fmt.label(status),
      icon: status == 'overdue'
          ? Icons.warning_amber_outlined
          : Icons.fact_check_outlined,
      color: status == 'overdue'
          ? const Color(0xFFB91C1C)
          : status == 'active'
              ? const Color(0xFF0F766E)
              : const Color(0xFF64748B),
    );
  }
}

String _aggregateLoanStatus(List<Loan> loans) {
  if (loans.any((loan) => loan.status == 'overdue')) return 'overdue';
  if (loans.any((loan) => loan.isOpen)) return 'active';
  return 'none';
}

class _MemberLoans extends ConsumerWidget {
  const _MemberLoans({required this.memberId});
  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberLoansProvider(memberId));
    return async.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Could not load loans. $e',
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ),
      ),
      data: (loans) {
        if (loans.isEmpty) {
          return const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: Text('This member has no loans.')),
            ),
          );
        }
        return Column(
          children: loans
              .map((l) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _MemberLoanTile(loan: l),
                  ))
              .toList(),
        );
      },
    );
  }
}

class _MemberLoanTile extends StatelessWidget {
  const _MemberLoanTile({required this.loan});
  final Loan loan;

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
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(Fmt.label(loan.product),
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('Balance ${Fmt.money(loan.balance)}',
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              StatusChip(loan.status),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

const _memberStatuses = [
  'applicant',
  'active',
  'inactive',
  'dormant',
  'suspended',
  'exited',
];

class _MemberStatusSheet extends ConsumerStatefulWidget {
  const _MemberStatusSheet({required this.memberId, required this.current});
  final String memberId;
  final String current;

  @override
  ConsumerState<_MemberStatusSheet> createState() => _MemberStatusSheetState();
}

class _MemberStatusSheetState extends ConsumerState<_MemberStatusSheet> {
  late String _status = widget.current.isEmpty ? 'active' : widget.current;
  bool _busy = false;

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .updateMemberStatus(widget.memberId, _status);
      ref.invalidate(memberProvider(widget.memberId));
      ref.invalidate(membersProvider(''));
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Member status updated.')));
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Member status',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _memberStatuses
                .map((st) => ChoiceChip(
                      label: Text(Fmt.label(st)),
                      selected: _status == st,
                      onSelected:
                          _busy ? null : (_) => setState(() => _status = st),
                    ))
                .toList(),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberContactSheet extends ConsumerStatefulWidget {
  const _MemberContactSheet({required this.member});
  final Member member;

  @override
  ConsumerState<_MemberContactSheet> createState() =>
      _MemberContactSheetState();
}

class _MemberContactSheetState extends ConsumerState<_MemberContactSheet> {
  late final _name = TextEditingController(text: widget.member.fullName);
  late final _phone = TextEditingController(text: widget.member.phone);
  late final _email = TextEditingController(text: widget.member.email);
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _phone.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Name and phone are required.')));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).updateMember(
            widget.member,
            fullName: _name.text.trim(),
            phone: _phone.text.trim(),
            email: _email.text.trim(),
          );
      ref.invalidate(memberProvider(widget.member.id));
      ref.invalidate(membersProvider(''));
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Member updated.')));
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Edit contact',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Full name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email (optional)'),
          ),
          const SizedBox(height: 8),
          Text('WhatsApp is edited by the member in their app.',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}

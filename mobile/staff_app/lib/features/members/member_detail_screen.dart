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
import 'loan_transactions_screen.dart';

/// A member's financial profile: savings, shares, welfare and loan balances,
/// plus the loans they hold (each opens its payment history).
class MemberDetailScreen extends ConsumerWidget {
  const MemberDetailScreen({super.key, required this.memberId});
  final String memberId;

  void _openFund(BuildContext context, Member m, String fund, String label,
      Color color) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => FundTransactionsScreen(
        memberId: m.id,
        memberName: m.fullName,
        fund: fund,
        fundLabel: label,
        color: color,
      ),
    ));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final memberAsync = ref.watch(memberProvider(memberId));
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
            ref.invalidate(memberLoansProvider(memberId));
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Identity(member: m),
              const SizedBox(height: 16),
              Text('Balances',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: BalanceCard(
                        label: 'Savings',
                        value: Fmt.money(m.savings),
                        icon: Icons.savings_outlined,
                        color: const Color(0xFF0F766E),
                        onTap: () => _openFund(context, m, 'savings', 'Savings',
                            const Color(0xFF0F766E))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: BalanceCard(
                        label: 'Shares',
                        value: Fmt.money(m.shares),
                        icon: Icons.pie_chart_outline,
                        color: const Color(0xFF7C3AED),
                        onTap: () => _openFund(context, m, 'shares', 'Shares',
                            const Color(0xFF7C3AED))),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: BalanceCard(
                        label: 'Welfare',
                        value: Fmt.money(m.welfare),
                        icon: Icons.volunteer_activism_outlined,
                        color: const Color(0xFF9333EA),
                        onTap: () => _openFund(context, m, 'welfare', 'Welfare',
                            const Color(0xFF9333EA))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                      child: _LoanBalanceCard(
                          memberId: memberId, memberName: m.fullName)),
                ],
              ),
              const SizedBox(height: 24),
              Text('Loans', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _MemberLoans(memberId: memberId),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
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
                  child: Text(
                      member.fullName.isEmpty ? '—' : member.fullName,
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
  const _LoanBalanceCard({required this.memberId, required this.memberName});
  final String memberId;
  final String memberName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberLoansProvider(memberId));
    final value = async.maybeWhen(
      data: (loans) => Fmt.money(
          loans.where((l) => l.isOpen).fold<num>(0, (s, l) => s + l.balance)),
      orElse: () => '—',
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
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => LoanDetailScreen(loan: loan))),
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

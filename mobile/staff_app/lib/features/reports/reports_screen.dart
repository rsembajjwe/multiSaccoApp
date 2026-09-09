import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import '../interest/interest_screen.dart';

/// A reporting overview of the SACCO: membership, member funds, the loan
/// portfolio (with arrears), income from interest, and operations.
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(saccoStatusProvider);
    final summaryAsync = ref.watch(loanPortfolioSummaryProvider);
    final interestAsync = ref.watch(interestByYearProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: statusAsync.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load reports.',
          detail: '$e',
          onRetry: () => ref.invalidate(saccoStatusProvider),
        ),
        data: (st) {
          final summary = summaryAsync.asData?.value;
          final openCount = summary?.openLoanCount ?? 0;
          final disbursed = summary?.disbursedOpen ?? 0;
          final arrearsCount = summary?.arrearsCount ?? 0;
          final arrearsAmount = summary?.arrearsAmount ?? 0;
          final interestTotal = interestAsync.asData?.value
                  .fold<num>(0, (s, y) => s + y.interest) ??
              (summary?.interestTotal ?? 0);
          final fundSegments = st.memberFunds.isEmpty
              ? [
                  _Seg('Savings', st.totalSavings, const Color(0xFF0F766E)),
                  _Seg('Shares', st.totalShares, const Color(0xFF7C3AED)),
                  _Seg('Welfare', st.totalWelfare, const Color(0xFF9333EA)),
                ]
              : [
                  for (var i = 0; i < st.memberFunds.length; i++)
                    _Seg(st.memberFunds[i].name, st.memberFunds[i].balance,
                        _fundReportColor(i, st.memberFunds[i].code)),
                ];
          final memberFunds =
              fundSegments.fold<num>(0, (s, fund) => s + fund.value);
          final inactive = (st.members - st.activeMembers).clamp(0, st.members);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(saccoStatusProvider);
              ref.invalidate(loanPortfolioSummaryProvider);
              ref.invalidate(interestByYearProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Headline
                Row(
                  children: [
                    Expanded(
                      child: BalanceCard(
                          label: 'Member funds',
                          value: Fmt.money(memberFunds),
                          icon: Icons.account_balance_wallet_outlined,
                          color: const Color(0xFF0F766E)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: BalanceCard(
                          label: 'Loan portfolio',
                          value: Fmt.money(st.loanPortfolio),
                          icon: Icons.account_balance_outlined,
                          color: const Color(0xFFB91C1C)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SectionCard(
                  title: 'Membership',
                  child: Column(
                    children: [
                      KeyValueRow('Total members', Fmt.number(st.members),
                          emphasize: true),
                      KeyValueRow('Active', Fmt.number(st.activeMembers)),
                      KeyValueRow('Inactive', Fmt.number(inactive)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SectionCard(
                  title: 'Member funds',
                  child: Column(
                    children: [
                      _CompositionBar(
                        segments: fundSegments,
                      ),
                      const SizedBox(height: 12),
                      for (final fund in fundSegments)
                        KeyValueRow(fund.label, Fmt.money(fund.value)),
                      const Divider(height: 20),
                      KeyValueRow('Total', Fmt.money(memberFunds),
                          emphasize: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SectionCard(
                  title: 'Loan portfolio',
                  child: Column(
                    children: [
                      KeyValueRow('Outstanding balance',
                          Fmt.money(st.loanPortfolio),
                          emphasize: true),
                      KeyValueRow('Open loans', Fmt.number(openCount)),
                      KeyValueRow('Principal disbursed (open)',
                          Fmt.money(disbursed)),
                      KeyValueRow('Loans in arrears',
                          '$arrearsCount · ${Fmt.money(arrearsAmount)}'),
                      if (summaryAsync.isLoading)
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text('Loading loan details…',
                              style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => const InterestScreen())),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF16A34A)
                                  .withValues(alpha: 0.13),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.trending_up,
                                color: Color(0xFF16A34A)),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Interest income',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
                                        ?.copyWith(
                                            fontWeight: FontWeight.w700)),
                                const SizedBox(height: 2),
                                Text('${Fmt.money(interestTotal)} booked · by year',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SectionCard(
                  title: 'Operations',
                  child: Column(
                    children: [
                      KeyValueRow('Pending postings',
                          Fmt.number(st.pendingPostings)),
                      KeyValueRow('Open loans', Fmt.number(st.openLoans)),
                      KeyValueRow('Open complaints',
                          Fmt.number(st.openComplaints)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

Color _fundReportColor(int index, String code) {
  switch (code) {
    case 'savings':
      return const Color(0xFF0F766E);
    case 'shares':
      return const Color(0xFF7C3AED);
    case 'welfare':
      return const Color(0xFF9333EA);
  }
  const colors = [
    Color(0xFF64748B),
    Color(0xFF2563EB),
    Color(0xFFDB2777),
    Color(0xFF16A34A),
    Color(0xFFB45309),
  ];
  return colors[index % colors.length];
}

class _Seg {
  const _Seg(this.label, this.value, this.color);
  final String label;
  final num value;
  final Color color;
}

/// A horizontal proportion bar with a small legend.
class _CompositionBar extends StatelessWidget {
  const _CompositionBar({required this.segments});
  final List<_Seg> segments;

  @override
  Widget build(BuildContext context) {
    final total = segments.fold<num>(0, (s, e) => s + e.value);
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            height: 14,
            child: total <= 0
                ? Container(color: scheme.surfaceContainerHighest)
                : Row(
                    children: segments
                        .where((s) => s.value > 0)
                        .map((s) => Expanded(
                              flex: (s.value / total * 1000).round().clamp(1, 1000),
                              child: Container(color: s.color),
                            ))
                        .toList(),
                  ),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 14,
          runSpacing: 6,
          children: segments
              .map((s) => Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                            color: s.color, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 5),
                      Text(
                          '${s.label} ${total <= 0 ? '0%' : '${(s.value / total * 100).round()}%'}',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ))
              .toList(),
        ),
      ],
    );
  }
}

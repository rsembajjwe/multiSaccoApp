import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// End-to-end view of the SACCO cash journey, from the Treasurer's cash book:
/// members pay in → cash is banked → cash is withdrawn → it is paid out.
/// Read-only; record the movements themselves in the Cash book.
class CashFlowScreen extends ConsumerWidget {
  const CashFlowScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(cashBookProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Cash flow')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load the cash flow.',
          detail: '$e',
          onRetry: () => ref.invalidate(cashBookProvider),
        ),
        data: (book) {
          num sumOf(bool Function(TreasuryCashEntry) test) => book.entries
              .where(test)
              .fold<num>(0, (s, e) => s + e.amount);
          final collected = sumOf((e) => e.purpose == 'collection');
          final withdrawn = sumOf((e) => e.purpose == 'bank_withdrawal');
          final banked = sumOf((e) => e.purpose == 'bank_deposit');
          const outUses = {
            'loan_disbursement',
            'expense',
            'member_payout',
            'other'
          };
          final paidOut = sumOf((e) => outUses.contains(e.purpose));
          final atBank = banked - withdrawn;

          final stages = <_Stage>[
            _Stage(
              step: 1,
              title: 'Collected from members',
              subtitle: 'Savings & dues received in cash',
              amount: collected,
              icon: Icons.groups_outlined,
              color: const Color(0xFF15803D),
              inflow: true,
            ),
            _Stage(
              step: 2,
              title: 'Banked',
              subtitle: 'Cash deposited to the bank',
              amount: banked,
              icon: Icons.account_balance_outlined,
              color: const Color(0xFF0E7490),
              inflow: false,
            ),
            _Stage(
              step: 3,
              title: 'Withdrawn from bank',
              subtitle: 'Cash drawn to make payments',
              amount: withdrawn,
              icon: Icons.south_west,
              color: const Color(0xFF0F766E),
              inflow: true,
            ),
            _Stage(
              step: 4,
              title: 'Paid out',
              subtitle: 'Loans, expenses & member payouts',
              amount: paidOut,
              icon: Icons.north_east,
              color: const Color(0xFFB91C1C),
              inflow: false,
            ),
          ];

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cashBookProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: BalanceCard(
                        label: 'Cash on hand',
                        value: Fmt.money(book.cashOnHand),
                        icon: Icons.local_atm_outlined,
                        color: const Color(0xFF0F766E),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: BalanceCard(
                        label: 'Net moved to bank',
                        value: Fmt.money(atBank),
                        icon: Icons.account_balance_outlined,
                        color: const Color(0xFF0E7490),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text('The journey',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  'Totals so far across every cash-book entry. Record movements in the Cash book.',
                  style: TextStyle(
                      fontSize: 12.5,
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 12),
                for (var i = 0; i < stages.length; i++) ...[
                  _StageTile(stage: stages[i]),
                  if (i < stages.length - 1)
                    const _Connector(),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Stage {
  const _Stage({
    required this.step,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.icon,
    required this.color,
    required this.inflow,
  });
  final int step;
  final String title;
  final String subtitle;
  final num amount;
  final IconData icon;
  final Color color;
  final bool inflow;
}

class _StageTile extends StatelessWidget {
  const _StageTile({required this.stage});
  final _Stage stage;
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
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: stage.color.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(stage.icon, color: stage.color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Step ${stage.step} · ${stage.title}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14.5)),
                  const SizedBox(height: 2),
                  Text(stage.subtitle,
                      style: TextStyle(
                          fontSize: 12.5, color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text('${stage.inflow ? '+' : '-'}${Fmt.money(stage.amount)}',
                style: TextStyle(
                    color: stage.color,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _Connector extends StatelessWidget {
  const _Connector();
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 32),
      child: SizedBox(
        height: 16,
        child: Align(
          alignment: Alignment.centerLeft,
          child: Icon(Icons.more_vert,
              size: 16, color: Theme.of(context).colorScheme.outline),
        ),
      ),
    );
  }
}

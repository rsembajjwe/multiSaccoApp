import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Transactions that moved one fund (savings / shares / welfare) for a member,
/// from the start of the current year to today.
class FundTransactionsScreen extends ConsumerWidget {
  const FundTransactionsScreen({
    super.key,
    required this.memberId,
    required this.memberName,
    required this.fund,
    required this.fundLabel,
    required this.color,
  });

  final String memberId;
  final String memberName;
  final String fund; // 'savings' | 'shares' | 'welfare'
  final String fundLabel;
  final Color color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberStatementProvider(memberId));
    final year = DateTime.now().year;
    return Scaffold(
      appBar: AppBar(
        title: Text('$fundLabel transactions'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(
          message: 'Could not load transactions.',
          detail: '$e',
          onRetry: () => ref.invalidate(memberStatementProvider(memberId)),
        ),
        data: (statement) {
          final rows = statement.forFund(fund);
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(memberStatementProvider(memberId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Summary(
                  memberName: memberName,
                  fundLabel: fundLabel,
                  year: year,
                  opening: statement.openingFor(fund),
                  closing: statement.closingFor(fund),
                  count: rows.length,
                  color: color,
                ),
                const SizedBox(height: 16),
                if (rows.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                          child: Text('No transactions so far this year.')),
                    ),
                  )
                else
                  ...rows.map((l) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _LineTile(line: l, fund: fund),
                      )),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({
    required this.memberName,
    required this.fundLabel,
    required this.year,
    required this.opening,
    required this.closing,
    required this.count,
    required this.color,
  });
  final String memberName;
  final String fundLabel;
  final int year;
  final num opening;
  final num closing;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(memberName.isEmpty ? 'Member' : memberName,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            Text('$fundLabel · since 1 Jan $year',
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
            const Divider(height: 22),
            Row(
              children: [
                Expanded(
                  child: BalanceCard(
                      label: 'Opening',
                      value: Fmt.money(opening),
                      icon: Icons.flag_outlined,
                      color: scheme.outline),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: BalanceCard(
                      label: 'Current',
                      value: Fmt.money(closing),
                      icon: Icons.account_balance_wallet_outlined,
                      color: color),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('$count transaction(s) this year',
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _LineTile extends StatelessWidget {
  const _LineTile({required this.line, required this.fund});
  final StatementLine line;
  final String fund;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final movement = line.movementFor(fund);
    final credit = movement >= 0;
    final moveColor =
        credit ? const Color(0xFF15803D) : const Color(0xFFB91C1C);
    final title = line.narration.isNotEmpty
        ? line.narration
        : Fmt.label(line.type);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: moveColor.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                  credit ? Icons.south_west : Icons.north_east,
                  color: moveColor,
                  size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                      '${Fmt.dateTime(line.postedAt)}${line.channel.isEmpty ? '' : ' · ${Fmt.label(line.channel)}'}',
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
                Text('${credit ? '+' : '-'}${Fmt.money(movement.abs())}',
                    style: TextStyle(
                        fontWeight: FontWeight.w800, color: moveColor)),
                const SizedBox(height: 2),
                Text('Bal ${Fmt.money(line.balanceFor(fund))}',
                    style: TextStyle(
                        fontSize: 11, color: scheme.onSurfaceVariant)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

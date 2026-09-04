import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A member's full statement: every transaction across all funds with running
/// balances, plus a copy-as-CSV action.
class FullStatementScreen extends ConsumerWidget {
  const FullStatementScreen({
    super.key,
    required this.memberId,
    required this.memberName,
  });

  final String memberId;
  final String memberName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(memberFullStatementProvider(memberId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Full statement'),
        actions: [
          async.maybeWhen(
            data: (st) => IconButton(
              tooltip: 'Copy as CSV',
              icon: const Icon(Icons.copy_all_outlined),
              onPressed: st.csv.isEmpty
                  ? null
                  : () async {
                      await Clipboard.setData(ClipboardData(text: st.csv));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Statement copied as CSV.')),
                        );
                      }
                    },
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load the statement.',
          detail: '$e',
          onRetry: () => ref.invalidate(memberFullStatementProvider(memberId)),
        ),
        data: (st) {
          final lines = [...st.lines]
            ..sort((a, b) => b.postedAt.compareTo(a.postedAt));
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(memberFullStatementProvider(memberId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(memberName.isEmpty ? 'Member' : memberName,
                            style:
                                const TextStyle(fontWeight: FontWeight.w700)),
                        const Divider(height: 20),
                        Row(
                          children: [
                            Expanded(
                                child: _bal(context, 'Savings', st.closeSavings)),
                            Expanded(
                                child: _bal(context, 'Shares', st.closeShares)),
                            Expanded(
                                child: _bal(context, 'Welfare', st.closeWelfare)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text('${lines.length} transaction(s)',
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 8),
                if (lines.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('No transactions on record.')),
                    ),
                  )
                else
                  ...lines.map((l) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _LineTile(line: l),
                      )),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _bal(BuildContext context, String label, num value) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
        const SizedBox(height: 2),
        Text(Fmt.money(value),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
      ],
    );
  }
}

class _LineTile extends StatelessWidget {
  const _LineTile({required this.line});
  final StatementLine line;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Pick the fund this line moved (for the +/- and label).
    String fund;
    if (line.savingsMovement != 0) {
      fund = 'savings';
    } else if (line.sharesMovement != 0) {
      fund = 'shares';
    } else {
      fund = 'welfare';
    }
    final move = line.movementFor(fund);
    final credit = move >= 0;
    final color = credit ? const Color(0xFF15803D) : const Color(0xFFB91C1C);
    final title =
        line.narration.isNotEmpty ? line.narration : Fmt.label(line.type);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(credit ? Icons.south_west : Icons.north_east,
                  color: color, size: 18),
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
                      '${fund[0].toUpperCase()}${fund.substring(1)} · ${Fmt.dateTime(line.postedAt)}',
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
                Text('${credit ? '+' : '-'}${Fmt.money(move.abs())}',
                    style: TextStyle(fontWeight: FontWeight.w800, color: color)),
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

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A member's full statement: every transaction across all funds with running
/// balances over a selectable date range, plus a copy-as-CSV action.
class FullStatementScreen extends ConsumerStatefulWidget {
  const FullStatementScreen({
    super.key,
    required this.memberId,
    required this.memberName,
  });

  final String memberId;
  final String memberName;

  @override
  ConsumerState<FullStatementScreen> createState() =>
      _FullStatementScreenState();
}

class _FullStatementScreenState extends ConsumerState<FullStatementScreen> {
  DateTime? _from;
  DateTime? _to;

  StatementRange get _key =>
      (memberId: widget.memberId, from: _from, to: _to);

  // The effective window shown to the user; mirrors the backend default of
  // start-of-year through today when no custom range is chosen.
  DateTime get _effectiveFrom => _from ?? DateTime(DateTime.now().year, 1, 1);
  DateTime get _effectiveTo => _to ?? DateTime.now();

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 5),
      lastDate: now,
      initialDateRange:
          DateTimeRange(start: _effectiveFrom, end: _effectiveTo),
    );
    if (picked != null) {
      setState(() {
        _from = DateTime(picked.start.year, picked.start.month, picked.start.day);
        _to = DateTime(picked.end.year, picked.end.month, picked.end.day);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(memberFullStatementProvider(_key));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Full statement'),
        actions: [
          IconButton(
            tooltip: 'Choose date range',
            icon: const Icon(Icons.date_range_outlined),
            onPressed: _pickRange,
          ),
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
          onRetry: () => ref.invalidate(memberFullStatementProvider(_key)),
        ),
        data: (st) {
          final lines = [...st.lines]
            ..sort((a, b) => b.postedAt.compareTo(a.postedAt));
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(memberFullStatementProvider(_key)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                            widget.memberName.isEmpty
                                ? 'Member'
                                : widget.memberName,
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
                InkWell(
                  onTap: _pickRange,
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 4, vertical: 6),
                    child: Row(
                      children: [
                        const Icon(Icons.date_range_outlined, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${Fmt.date(_effectiveFrom)} – ${Fmt.date(_effectiveTo)}',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                        if (_from != null || _to != null)
                          TextButton(
                            onPressed: () =>
                                setState(() { _from = null; _to = null; }),
                            child: const Text('Reset'),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 4),
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

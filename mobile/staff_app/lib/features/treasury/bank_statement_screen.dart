import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Bank statement: every cash-book movement in or out of the bank, as a
/// two-column ledger (Banked / Withdrawn) with a running bank balance.
/// Read-only; the movements themselves are recorded in the Cash book
/// ("Bank the cash" = banked, "Cash from bank" = withdrawn).
class BankStatementScreen extends ConsumerWidget {
  const BankStatementScreen({super.key, this.embedded = false});

  final bool embedded;

  static const _bankedColor = Color(0xFF0E7490);
  static const _withdrawnColor = Color(0xFFB91C1C);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(cashBookProvider);
    return Scaffold(
      appBar: embedded ? null : AppBar(title: const Text('Bank statement')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load the bank statement.',
          detail: '$e',
          onRetry: () => ref.invalidate(cashBookProvider),
        ),
        data: (book) {
          final movements = book.entries
              .where((e) =>
                  e.purpose == 'bank_deposit' || e.purpose == 'bank_withdrawal')
              .toList()
            ..sort((a, b) {
              final da = a.entryDate ?? DateTime(1970);
              final db = b.entryDate ?? DateTime(1970);
              return da.compareTo(db);
            });

          num running = 0;
          num totalBanked = 0;
          num totalWithdrawn = 0;
          final rows = <_BankRow>[];
          for (final e in movements) {
            final banked = e.purpose == 'bank_deposit';
            if (banked) {
              running += e.amount;
              totalBanked += e.amount;
            } else {
              running -= e.amount;
              totalWithdrawn += e.amount;
            }
            rows.add(_BankRow(
              entry: e,
              banked: banked ? e.amount : null,
              withdrawn: banked ? null : e.amount,
              balance: running,
            ));
          }
          final atBank = totalBanked - totalWithdrawn;

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cashBookProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                BalanceCard(
                  label: 'Balance at bank',
                  value: Fmt.money(atBank),
                  icon: Icons.account_balance_outlined,
                  color: _bankedColor,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: BalanceCard(
                        label: 'Total banked',
                        value: Fmt.money(totalBanked),
                        icon: Icons.south_west,
                        color: _bankedColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: BalanceCard(
                        label: 'Total withdrawn',
                        value: Fmt.money(totalWithdrawn),
                        icon: Icons.north_east,
                        color: _withdrawnColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                if (rows.isEmpty)
                  const _EmptyBank()
                else
                  Card(
                    margin: EdgeInsets.zero,
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        const _HeaderRow(),
                        for (var i = 0; i < rows.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          _StatementRow(row: rows.reversed.elementAt(i)),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _BankRow {
  const _BankRow({
    required this.entry,
    required this.banked,
    required this.withdrawn,
    required this.balance,
  });
  final TreasuryCashEntry entry;
  final num? banked;
  final num? withdrawn;
  final num balance;
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow();
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    Widget cell(String t, int flex, TextAlign align) => Expanded(
          flex: flex,
          child: Text(
            t,
            textAlign: align,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: scheme.onSurfaceVariant,
              letterSpacing: 0.2,
            ),
          ),
        );
    return Container(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          cell('DATE', 4, TextAlign.left),
          cell('BANKED', 3, TextAlign.right),
          cell('WITHDRAWN', 3, TextAlign.right),
          cell('BALANCE', 3, TextAlign.right),
        ],
      ),
    );
  }
}

class _StatementRow extends StatelessWidget {
  const _StatementRow({required this.row});
  final _BankRow row;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final desc = row.entry.description;
    final ref = row.entry.reference;
    final hasDesc = desc != null && desc.isNotEmpty;
    final hasRef = ref != null && ref.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(Fmt.date(row.entry.entryDate),
                    style: const TextStyle(
                        fontSize: 12.5, fontWeight: FontWeight.w600)),
                if (hasDesc)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(desc,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 11.5, color: scheme.onSurface)),
                  ),
                if (hasRef)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('Ref: $ref',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 10.5, color: scheme.onSurfaceVariant)),
                  ),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              row.banked == null ? '—' : Fmt.money(row.banked),
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: row.banked == null
                    ? scheme.outline
                    : BankStatementScreen._bankedColor,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              row.withdrawn == null ? '—' : Fmt.money(row.withdrawn),
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: row.withdrawn == null
                    ? scheme.outline
                    : BankStatementScreen._withdrawnColor,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              Fmt.money(row.balance),
              textAlign: TextAlign.right,
              style: const TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyBank extends StatelessWidget {
  const _EmptyBank();
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 40),
      child: Column(
        children: [
          Icon(Icons.account_balance_outlined,
              size: 44, color: scheme.outline),
          const SizedBox(height: 12),
          Text('No bank movements yet',
              style: TextStyle(
                  fontWeight: FontWeight.w700, color: scheme.onSurfaceVariant)),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Record "Bank the cash" or "Cash from bank" in the Cash book '
              'and it will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }
}

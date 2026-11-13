import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Read-only SACCO cash reconciliation: matched and unmatched statement/ledger lines.
class ReconciliationScreen extends ConsumerWidget {
  const ReconciliationScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(reconciliationProvider);
    const tabs = TabBar(
      tabs: [
        Tab(text: 'Summary'),
        Tab(text: 'Matches'),
        Tab(text: 'Exceptions'),
      ],
    );
    final body = async.when(
          loading: () => const ListSkeleton(),
          error: (e, _) => ErrorRetry(
            message: 'Could not load reconciliation.',
            detail: '$e',
            onRetry: () => ref.invalidate(reconciliationProvider),
          ),
          data: (report) => RefreshIndicator(
            onRefresh: () async => ref.invalidate(reconciliationProvider),
            child: TabBarView(
              children: [
                _SummaryTab(summary: report.summary),
                _MatchesTab(matches: report.matches),
                _ExceptionsTab(report: report),
              ],
            ),
          ),
    );
    if (embedded) {
      return DefaultTabController(
        length: 3,
        child: Column(
          children: [
            tabs,
            Expanded(child: body),
          ],
        ),
      );
    }
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Reconciliation'),
          bottom: tabs,
        ),
        body: body,
      ),
    );
  }
}

class _SummaryTab extends StatelessWidget {
  const _SummaryTab({required this.summary});
  final ReconciliationSummary summary;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: BalanceCard(
                label: 'Matched',
                value: Fmt.money(summary.matchedAmount),
                icon: Icons.check_circle_outline,
                color: const Color(0xFF15803D),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BalanceCard(
                label: 'Exceptions',
                value: Fmt.number(summary.exceptionCount),
                icon: Icons.warning_amber_outlined,
                color: const Color(0xFFB45309),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SectionCard(
          title: 'Coverage',
          child: Column(
            children: [
              KeyValueRow('Statement lines', Fmt.number(summary.statementLines)),
              KeyValueRow('Ledger lines', Fmt.number(summary.ledgerLines)),
              KeyValueRow('Matched pairs', Fmt.number(summary.matched),
                  emphasize: true),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SectionCard(
          title: 'Unmatched exposure',
          child: Column(
            children: [
              KeyValueRow(
                'Statement exceptions',
                '${Fmt.number(summary.unmatchedStatementLines)} - ${Fmt.money(summary.unmatchedStatementAmount)}',
              ),
              KeyValueRow(
                'Ledger exceptions',
                '${Fmt.number(summary.unmatchedLedgerLines)} - ${Fmt.money(summary.unmatchedLedgerAmount)}',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MatchesTab extends StatelessWidget {
  const _MatchesTab({required this.matches});
  final List<ReconciliationMatch> matches;

  @override
  Widget build(BuildContext context) {
    if (matches.isEmpty) {
      return const EmptyState(
        icon: Icons.checklist_rtl_outlined,
        message: 'No reconciliation matches yet.',
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: matches.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _MatchTile(match: matches[i]),
    );
  }
}

class _ExceptionsTab extends StatelessWidget {
  const _ExceptionsTab({required this.report});
  final ReconciliationReport report;

  @override
  Widget build(BuildContext context) {
    final count =
        report.unmatchedStatementLines.length + report.unmatchedLedgerLines.length;
    if (count == 0) {
      return const EmptyState(
        icon: Icons.verified_outlined,
        message: 'No reconciliation exceptions.',
      );
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        if (report.unmatchedStatementLines.isNotEmpty) ...[
          Text('Unmatched statement lines',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final line in report.unmatchedStatementLines)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _StatementLineTile(line: line),
            ),
          const SizedBox(height: 8),
        ],
        if (report.unmatchedLedgerLines.isNotEmpty) ...[
          Text('Unmatched ledger lines',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final line in report.unmatchedLedgerLines)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _LedgerLineTile(line: line),
            ),
        ],
      ],
    );
  }
}

class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match});
  final ReconciliationMatch match;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle_outline,
                    color: Color(0xFF15803D), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    match.statementLine.externalReference,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  Fmt.money(match.statementLine.amount),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 8),
            KeyValueRow('Statement', match.statementLine.description),
            KeyValueRow('Ledger', match.ledgerLine.description),
            KeyValueRow('Account', match.ledgerLine.accountName),
          ],
        ),
      ),
    );
  }
}

class _StatementLineTile extends StatelessWidget {
  const _StatementLineTile({required this.line});
  final ReconciliationStatementLine line;

  @override
  Widget build(BuildContext context) {
    return _ReconciliationTile(
      icon: Icons.account_balance_wallet_outlined,
      color: const Color(0xFFB45309),
      title: line.externalReference.isEmpty
          ? Fmt.label(line.channel)
          : line.externalReference,
      subtitle: line.description,
      amount: line.amount,
      date: line.statementDate,
      trailing: line.accountLabel,
    );
  }
}

class _LedgerLineTile extends StatelessWidget {
  const _LedgerLineTile({required this.line});
  final ReconciliationLedgerLine line;

  @override
  Widget build(BuildContext context) {
    return _ReconciliationTile(
      icon: Icons.receipt_long_outlined,
      color: const Color(0xFFB91C1C),
      title: line.reference.isEmpty ? Fmt.label(line.sourceType) : line.reference,
      subtitle: line.description,
      amount: line.amount,
      date: line.postedAt,
      trailing: line.accountName,
    );
  }
}

class _ReconciliationTile extends StatelessWidget {
  const _ReconciliationTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.date,
    required this.trailing,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final num amount;
  final String date;
  final String trailing;

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
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title.isEmpty ? 'No reference' : title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 2),
                  Text(
                    trailing.isEmpty ? Fmt.date(date) : '$trailing - ${Fmt.date(date)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              Fmt.money(amount),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

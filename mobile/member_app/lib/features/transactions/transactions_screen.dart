import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/skeleton.dart';

/// Full member transaction history (savings, shares, welfare and loan
/// postings) drawn from the mobile-dashboard statement lines.
class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key, this.category, this.title});

  /// Optional filter: 'savings' | 'shares' | 'welfare' | 'loans'.
  final String? category;
  final String? title;

  bool _matches(StatementLine l) {
    if (category == null) return true;
    final t = l.type.toLowerCase();
    switch (category) {
      case 'savings':
        return t.contains('saving') || t == 'withdrawal' || t.contains('deposit');
      case 'shares':
        return t.contains('share');
      case 'welfare':
        return t.contains('welfare');
      case 'loans':
        return t.contains('loan');
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(statementProvider);
    return Scaffold(
      appBar: AppBar(title: Text(title ?? 'Transactions')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => _ErrorView(onRetry: () => ref.invalidate(statementProvider)),
        data: (all) {
          final lines = all.where(_matches).toList();
          if (lines.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(category == null
                    ? 'No transactions yet.'
                    : 'No ${title ?? category} transactions yet.'),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(statementProvider),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: lines.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) => TransactionTile(line: lines[i]),
            ),
          );
        },
      ),
    );
  }
}

class TransactionTile extends StatelessWidget {
  const TransactionTile({super.key, required this.line});

  final StatementLine line;

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    final signed = line.isDebit ? line.debit : line.credit;
    final color = line.isDebit ? Colors.red.shade600 : Colors.green.shade700;
    final sign = line.isDebit ? '-' : '+';
    final when =
        line.postedAt == null ? '' : DateFormat('d MMM y, HH:mm').format(line.postedAt!);
    final title = line.description.isNotEmpty
        ? line.description
        : _prettyType(line.type);
    final subtitleParts = <String>[
      _prettyType(line.type),
      if (line.channel.isNotEmpty) line.channel,
      if (when.isNotEmpty) when,
    ];
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: color.withValues(alpha: 0.12),
        child: Icon(
          line.isDebit ? Icons.arrow_upward : Icons.arrow_downward,
          color: color,
          size: 20,
        ),
      ),
      title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: Text(subtitleParts.join(' · ')),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text('$sign${money.format(signed)}',
              style: TextStyle(color: color, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text('Bal ${money.format(line.runningBalance)}',
              style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
      isThreeLine: true,
    );
  }

  String _prettyType(String raw) {
    if (raw.isEmpty) return 'Transaction';
    return raw
        .split('_')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load your transactions.'),
              const SizedBox(height: 12),
              FilledButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      );
}

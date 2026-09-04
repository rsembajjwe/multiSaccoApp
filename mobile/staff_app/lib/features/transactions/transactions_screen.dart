import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class _Filter {
  const _Filter(this.label, this.match);
  final String label;
  final String? match; // substring of type, or null for all
}

const _filters = <_Filter>[
  _Filter('All', null),
  _Filter('Savings', 'savings_deposit'),
  _Filter('Withdrawals', 'withdrawal'),
  _Filter('Shares', 'share'),
  _Filter('Welfare', 'welfare'),
];

/// SACCO-wide financial transaction ledger with search and a type filter.
class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  final _controller = TextEditingController();
  String _query = '';
  int _filter = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(transactionsProvider(_query));
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Transactions')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => setState(() => _query = v.trim()),
              onChanged: (v) {
                if (v.trim().isEmpty && _query.isNotEmpty) {
                  setState(() => _query = '');
                }
              },
              decoration: InputDecoration(
                hintText: 'Search reference, type or member',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => ChoiceChip(
                label: Text(_filters[i].label),
                selected: _filter == i,
                onSelected: (_) => setState(() => _filter = i),
              ),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorRetry(
                message: 'Could not load transactions.',
                detail: '$e',
                onRetry: () => ref.invalidate(transactionsProvider(_query)),
              ),
              data: (all) {
                final match = _filters[_filter].match;
                final rows = match == null
                    ? all
                    : all.where((t) => t.type.contains(match)).toList();
                if (rows.isEmpty) {
                  return const EmptyState(
                      icon: Icons.receipt_long_outlined,
                      message: 'No transactions match this view.');
                }
                final total =
                    rows.fold<num>(0, (s, t) => s + (t.isOutflow ? -t.amount : t.amount));
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(transactionsProvider(_query));
                    ref.invalidate(memberNamesProvider);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: rows.length + 1,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      if (i == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                              '${rows.length} transaction(s) · net ${Fmt.money(total)}',
                              style: Theme.of(context).textTheme.bodySmall),
                        );
                      }
                      final t = rows[i - 1];
                      return _TxnTile(txn: t, memberName: names[t.memberId]);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TxnTile extends StatelessWidget {
  const _TxnTile({required this.txn, this.memberName});
  final FinancialTxn txn;
  final String? memberName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final out = txn.isOutflow;
    final color = out ? const Color(0xFFB91C1C) : const Color(0xFF15803D);
    final title = txn.narration.isNotEmpty ? txn.narration : Fmt.label(txn.type);
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
              child: Icon(out ? Icons.north_east : Icons.south_west,
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
                      '${memberName ?? txn.memberId}${memberName == null && txn.memberId.isEmpty ? '' : ' · '}${Fmt.dateTime(txn.date)}',
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
                Text('${out ? '-' : '+'}${Fmt.money(txn.amount)}',
                    style: TextStyle(fontWeight: FontWeight.w800, color: color)),
                const SizedBox(height: 4),
                StatusChip(txn.status),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

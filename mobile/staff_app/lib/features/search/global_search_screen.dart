import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/ui.dart';
import '../../providers.dart';
import '../loans/loan_detail_screen.dart';
import '../members/member_detail_screen.dart';
import '../transactions/transaction_detail_screen.dart';

/// One search box across members, loans and transactions (only the sources the
/// signed-in user is allowed to see).
class GlobalSearchScreen extends ConsumerStatefulWidget {
  const GlobalSearchScreen({super.key});

  @override
  ConsumerState<GlobalSearchScreen> createState() =>
      _GlobalSearchScreenState();
}

class _GlobalSearchScreenState extends ConsumerState<GlobalSearchScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(sessionProvider);
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _controller,
          autofocus: true,
          textInputAction: TextInputAction.search,
          onSubmitted: (v) => setState(() => _query = v.trim()),
          onChanged: (v) {
            if (v.trim().isEmpty && _query.isNotEmpty) {
              setState(() => _query = '');
            }
          },
          decoration: const InputDecoration(
            hintText: 'Search members, loans, transactions',
            border: InputBorder.none,
          ),
        ),
        actions: [
          if (_controller.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _controller.clear();
                setState(() => _query = '');
              },
            ),
        ],
      ),
      body: sessionAsync.maybeWhen(
        data: (s) {
          if (_query.isEmpty) {
            return const EmptyState(
                icon: Icons.search,
                message: 'Type a name, number, product or reference to search.');
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (s.can('members:view'))
                _MemberResults(query: _query),
              if (s.can('loans:view')) _LoanResults(query: _query),
              if (s.can('transactions:view'))
                _TxnResults(query: _query),
              const SizedBox(height: 24),
            ],
          );
        },
        orElse: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 8),
          child: Text(title, style: Theme.of(context).textTheme.titleSmall),
        ),
        ...children,
        const SizedBox(height: 8),
      ],
    );
  }
}

class _MemberResults extends ConsumerWidget {
  const _MemberResults({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(searchMembersProvider(query));
    return async.maybeWhen(
      data: (result) => _Group(
        title: 'Members (${result.total})',
        children: result.items
            .take(8)
            .map((m) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: Text(m.fullName.isEmpty ? m.membershipNo : m.fullName,
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text('${m.membershipNo} · ${Fmt.money(m.totalWorth)}',
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: StatusChip(m.status),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => MemberDetailScreen(memberId: m.id))),
                  ),
                ))
            .toList(),
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _LoanResults extends ConsumerWidget {
  const _LoanResults({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(searchLoansProvider(query));
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return async.maybeWhen(
      data: (result) => _Group(
        title: 'Loans (${result.total})',
        children: result.items
            .take(8)
            .map((l) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const Icon(Icons.account_balance_outlined),
                    title: Text(Fmt.label(l.product),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                        '${names[l.memberId] ?? l.memberId} · Bal ${Fmt.money(l.balance)}',
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: StatusChip(l.status),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => LoanDetailScreen(loan: l))),
                  ),
                ))
            .toList(),
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _TxnResults extends ConsumerWidget {
  const _TxnResults({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(searchTransactionsProvider(query));
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return async.maybeWhen(
      data: (result) => _Group(
        title: 'Transactions (${result.total})',
        children: result.items
            .take(8)
            .map((t) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(t.isOutflow
                        ? Icons.north_east
                        : Icons.south_west),
                    title: Text(
                        t.narration.isEmpty ? Fmt.label(t.type) : t.narration,
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                        '${names[t.memberId] ?? t.memberId} · ${Fmt.dateTime(t.date)}',
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: Text(
                        '${t.isOutflow ? '-' : '+'}${Fmt.money(t.amount)}',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => TransactionDetailScreen(
                            txn: t, memberName: names[t.memberId]))),
                  ),
                ))
            .toList(),
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

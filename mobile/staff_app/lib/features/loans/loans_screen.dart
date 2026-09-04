import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'loan_detail_screen.dart';

/// All loans in the SACCO with search. Each row opens the loan and its
/// payment history.
class LoansScreen extends ConsumerStatefulWidget {
  const LoansScreen({super.key});

  @override
  ConsumerState<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends ConsumerState<LoansScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(loansProvider(_query));
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Loans')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
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
                hintText: 'Search product, status or member',
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
          Expanded(
            child: async.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorRetry(
                message: 'Could not load loans.',
                detail: '$e',
                onRetry: () => ref.invalidate(loansProvider(_query)),
              ),
              data: (loans) {
                if (loans.isEmpty) {
                  return const EmptyState(
                      icon: Icons.account_balance_outlined,
                      message: 'No loans match your search.');
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(loansProvider(_query));
                    ref.invalidate(memberNamesProvider);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    itemCount: loans.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _LoanTile(
                      loan: loans[i],
                      memberName: names[loans[i].memberId],
                    ),
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

class _LoanTile extends StatelessWidget {
  const _LoanTile({required this.loan, this.memberName});
  final Loan loan;
  final String? memberName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => LoanDetailScreen(loan: loan))),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(Fmt.label(loan.product),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  StatusChip(loan.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(memberName ?? loan.memberId,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
              const Divider(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _mini(context, 'Principal', Fmt.money(loan.amount)),
                  _mini(context, 'Balance', Fmt.money(loan.balance),
                      strong: true),
                  if (loan.inArrears)
                    _mini(context, 'Arrears', Fmt.money(loan.arrearsAmount),
                        color: const Color(0xFFB91C1C)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _mini(BuildContext context, String label, String value,
      {bool strong = false, Color? color}) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
                color: color)),
      ],
    );
  }
}

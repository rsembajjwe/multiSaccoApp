import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/skeleton.dart';
import 'loan_detail_screen.dart';

final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class LoansScreen extends ConsumerWidget {
  const LoansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loans = ref.watch(loansProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My loans')),
      body: loans.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => _ErrorRetry(onRetry: () => ref.invalidate(loansProvider)),
        data: (items) {
          if (items.isEmpty) {
            return ListView(
              children: const [
                SizedBox(height: 100),
                Icon(Icons.account_balance_outlined, size: 48, color: Colors.grey),
                SizedBox(height: 12),
                Center(child: Text('You have no loans yet.')),
                SizedBox(height: 4),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    'Contact your SACCO office to apply for a loan. Once approved, it will appear here and you can make repayments.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              ],
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(loansProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _LoanCard(loan: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _LoanCard extends StatelessWidget {
  const _LoanCard({required this.loan});
  final Loan loan;

  @override
  Widget build(BuildContext context) {
    final subtitle = <String>[
      if (loan.stage != null && loan.stage!.isNotEmpty) loan.stage! else loan.status,
      'Balance ${_money.format(loan.balance)}',
    ].join('  •  ');
    return Card(
      child: ListTile(
        title: Text(loan.product),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => LoanDetailScreen(loan: loan)),
        ),
      ),
    );
  }
}

class _ErrorRetry extends StatelessWidget {
  const _ErrorRetry({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load your loans.'),
              const SizedBox(height: 12),
              FilledButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      );
}

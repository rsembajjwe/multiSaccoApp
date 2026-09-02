import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../providers.dart';
import '../../core/widgets/skeleton.dart';
import '../../domain/models.dart';
import '../payments/payments_screen.dart';
import '../transactions/transactions_screen.dart';

final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);
    final funds = ref.watch(fundBalancesProvider);
    return Scaffold(
      body: async.when(
        loading: () => const DashboardSkeleton(),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Could not load your dashboard.'),
                const SizedBox(height: 8),
                Text('$e',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontSize: 12)),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(dashboardProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (s) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardProvider);
            ref.invalidate(fundBalancesProvider);
          },
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              _Header(name: s.memberName, total: s.savings + s.shares + s.welfare),
              const _QuickActions(),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.35,
                  children: [
                    _BalanceCard(
                      label: 'Savings',
                      value: _money.format(s.savings),
                      icon: Icons.savings_outlined,
                      color: const Color(0xFF0F766E),
                      onTap: () => _openHistory(context, 'savings', 'Savings'),
                    ),
                    _BalanceCard(
                      label: 'Shares',
                      value: _money.format(s.shares),
                      icon: Icons.pie_chart_outline,
                      color: const Color(0xFF4338CA),
                      onTap: () => _openHistory(context, 'shares', 'Shares'),
                    ),
                    _BalanceCard(
                      label: 'Welfare',
                      value: _money.format(s.welfare),
                      icon: Icons.volunteer_activism_outlined,
                      color: const Color(0xFFB45309),
                      onTap: () => _openHistory(context, 'welfare', 'Welfare'),
                    ),
                    _BalanceCard(
                      label: 'Loans',
                      value: _money.format(s.loanBalance),
                      icon: Icons.account_balance_outlined,
                      color: const Color(0xFFB91C1C),
                      onTap: () => _openHistory(context, 'loans', 'Loans'),
                    ),
                  ],
                ),
              ),
              ...funds.maybeWhen(
                data: (list) {
                  const core = {'savings', 'shares', 'welfare'};
                  final others = list
                      .where((f) =>
                          !core.contains(f.fundCode.toLowerCase()) &&
                          f.balance != 0)
                      .toList();
                  if (others.isEmpty) return <Widget>[];
                  return <Widget>[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                      child: Text('Other funds',
                          style: Theme.of(context).textTheme.titleMedium),
                    ),
                    ...others.map((f) => Padding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 0, 16, 8),
                          child: Card(
                            child: ListTile(
                              leading: const Icon(
                                  Icons.account_balance_wallet_outlined),
                              title: Text(_prettyFund(f.fundCode)),
                              trailing: Text(_money.format(f.balance),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                            ),
                          ),
                        )),
                  ];
                },
                orElse: () => <Widget>[],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Recent activity',
                        style: Theme.of(context).textTheme.titleMedium),
                    if (s.transactions.isNotEmpty)
                      TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) => const TransactionsScreen()),
                        ),
                        child: const Text('See all'),
                      ),
                  ],
                ),
              ),
              if (s.transactions.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: Text('No transactions yet.')),
                )
              else
                ...s.transactions.reversed.take(6).map((line) => Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Card(child: TransactionTile(line: line)),
                    )),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _openHistory(BuildContext context, String category, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            TransactionsScreen(category: category, title: '$title history'),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.name, required this.total});
  final String name;
  final num total;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primary,
            Color.alphaBlend(Colors.black.withValues(alpha: 0.28), scheme.primary),
          ],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.paddingOf(context).top + 18, 12, 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name.isEmpty ? 'Welcome' : 'Hello, ${name.split(' ').first}',
                  style: TextStyle(
                      color: scheme.onPrimary.withValues(alpha: 0.9),
                      fontSize: 15,
                      fontWeight: FontWeight.w500),
                ),
              ),
              IconButton(
                tooltip: 'Sign out',
                icon: Icon(Icons.logout, color: scheme.onPrimary),
                onPressed: () async {
                  await ref.read(memberRepositoryProvider).logout();
                  if (context.mounted) context.go('/login');
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Total balance',
              style: TextStyle(
                  color: scheme.onPrimary.withValues(alpha: 0.75),
                  fontSize: 13,
                  letterSpacing: 0.2)),
          const SizedBox(height: 4),
          Text(
            _money.format(total),
            style: TextStyle(
              color: scheme.onPrimary,
              fontSize: 30,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text('Savings + Shares + Welfare',
              style: TextStyle(
                  color: scheme.onPrimary.withValues(alpha: 0.7),
                  fontSize: 12)),
        ],
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.13),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Icon(icon, color: color, size: 18),
                  ),
                  const SizedBox(width: 8),
                  Text(label,
                      style: Theme.of(context).textTheme.labelLarge),
                ],
              ),
              const Spacer(),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Text('View history',
                      style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurfaceVariant)),
                  Icon(Icons.chevron_right,
                      size: 14,
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          _action(context, Icons.add_circle_outline, 'Deposit',
              () => openPaymentSheet(context,
                  initialPurpose: PaymentPurpose.savings)),
          _action(context, Icons.account_balance_outlined, 'Pay loan',
              () => openPaymentSheet(context,
                  initialPurpose: PaymentPurpose.loanRepayment)),
          _action(
              context,
              Icons.receipt_long_outlined,
              'Statement',
              () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => const TransactionsScreen()))),
        ],
      ),
    );
  }

  Widget _action(BuildContext context, IconData icon, String label,
      VoidCallback onTap) {
    final scheme = Theme.of(context).colorScheme;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: scheme.onPrimaryContainer, size: 22),
              ),
              const SizedBox(height: 6),
              Text(label,
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }
}

String _prettyFund(String raw) {
  if (raw.isEmpty) return 'Fund';
  return raw
      .split(RegExp(r'[_\s]+'))
      .where((w) => w.isNotEmpty)
      .map((w) => '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}

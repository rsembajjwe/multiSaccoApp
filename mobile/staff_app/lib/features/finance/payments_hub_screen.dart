import 'package:flutter/material.dart';

import '../mobile_money/mobile_money_screen.dart';
import '../reconciliation/reconciliation_screen.dart';
import '../treasury/bank_statement_screen.dart';

/// Tabbed home for money movement in/out of provider & bank accounts:
/// Mobile money, Reconciliation and the Bank statement.
class PaymentsHubScreen extends StatelessWidget {
  const PaymentsHubScreen({super.key, required this.canManage});

  final bool canManage;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Payments'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Mobile money'),
              Tab(text: 'Reconciliation'),
              Tab(text: 'Bank statement'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            MobileMoneyScreen(canManage: canManage, embedded: true),
            const ReconciliationScreen(embedded: true),
            const BankStatementScreen(embedded: true),
          ],
        ),
      ),
    );
  }
}

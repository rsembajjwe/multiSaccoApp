import 'package:flutter/material.dart';

import '../accounting/expenses_screen.dart';
import '../accounting/suppliers_screen.dart';
import '../savings/savings_transfers_screen.dart';
import 'cash_book_screen.dart';

/// Tabbed home for the treasurer's cash operations: the Cash book, Expenses,
/// Suppliers and member savings Transfers. Only the tabs the user can view
/// are shown.
class CashHubScreen extends StatelessWidget {
  const CashHubScreen({
    super.key,
    required this.canViewCash,
    required this.canManage,
    required this.canViewTransfers,
  });

  final bool canViewCash;
  final bool canManage;
  final bool canViewTransfers;

  @override
  Widget build(BuildContext context) {
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (canViewCash) {
      tabs.add(const Tab(text: 'Cash book'));
      views.add(CashBookScreen(canManage: canManage, embedded: true));
      tabs.add(const Tab(text: 'Expenses'));
      views.add(ExpensesScreen(canManage: canManage, embedded: true));
      tabs.add(const Tab(text: 'Suppliers'));
      views.add(SuppliersScreen(canManage: canManage, embedded: true));
    }
    if (canViewTransfers) {
      tabs.add(const Tab(text: 'Transfers'));
      views.add(const SavingsTransfersScreen(embedded: true));
    }

    if (tabs.length <= 1) {
      return Scaffold(
        appBar: AppBar(
            title: Text(tabs.isEmpty ? 'Cash & expenses' : tabs.first.text!)),
        body: views.isEmpty ? const SizedBox.shrink() : views.first,
      );
    }

    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Cash & expenses'),
          bottom: TabBar(isScrollable: true, tabs: tabs),
        ),
        body: TabBarView(children: views),
      ),
    );
  }
}

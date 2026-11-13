import 'package:flutter/material.dart';

import '../finance/financial_products_screen.dart';
import 'fund_sources_screen.dart';

/// One tabbed home for the SACCO's fund configuration: member Fund types and
/// savings/loan Products. Only the tabs the signed-in user can view are shown.
class FundsHubScreen extends StatelessWidget {
  const FundsHubScreen({
    super.key,
    required this.canViewFundTypes,
    required this.canManageFundTypes,
    required this.canViewProducts,
    required this.canManageProducts,
  });

  final bool canViewFundTypes;
  final bool canManageFundTypes;
  final bool canViewProducts;
  final bool canManageProducts;

  @override
  Widget build(BuildContext context) {
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (canViewFundTypes) {
      tabs.add(const Tab(text: 'Fund types'));
      views.add(FundSourcesScreen(canManage: canManageFundTypes, embedded: true));
    }
    if (canViewProducts) {
      tabs.add(const Tab(text: 'Products'));
      views.add(FinancialProductsScreen(
          canManage: canManageProducts, embedded: true));
    }

    if (tabs.length <= 1) {
      return Scaffold(
        appBar: AppBar(
            title: Text(tabs.isEmpty ? 'Funds & products' : tabs.first.text!)),
        body: views.isEmpty ? const SizedBox.shrink() : views.first,
      );
    }

    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Funds & products'),
          bottom: TabBar(isScrollable: true, tabs: tabs),
        ),
        body: TabBarView(children: views),
      ),
    );
  }
}

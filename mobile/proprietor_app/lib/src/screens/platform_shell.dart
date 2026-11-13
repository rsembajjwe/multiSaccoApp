import 'package:flutter/material.dart';

import '../models.dart';
import 'approvals_screen.dart';
import 'billing_screen.dart';
import 'dashboard_screen.dart';
import 'more_screen.dart';
import 'saccos_screen.dart';

class PlatformShell extends StatefulWidget {
  const PlatformShell({super.key, required this.session});
  final PlatformSession session;

  @override
  State<PlatformShell> createState() => _PlatformShellState();
}

class _PlatformShellState extends State<PlatformShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardScreen(session: widget.session, onNavigate: _navigate),
      SaccosScreen(session: widget.session),
      BillingScreen(session: widget.session),
      ApprovalsScreen(session: widget.session),
      MoreScreen(session: widget.session),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_outlined),
            selectedIcon: Icon(Icons.account_balance),
            label: 'SACCOs',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Billing',
          ),
          NavigationDestination(
            icon: Icon(Icons.approval_outlined),
            selectedIcon: Icon(Icons.approval),
            label: 'Approvals',
          ),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
        ],
      ),
    );
  }

  void _navigate(int index) => setState(() => _index = index);
}

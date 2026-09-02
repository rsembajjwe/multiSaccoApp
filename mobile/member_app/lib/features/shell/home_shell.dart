import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers.dart';

import '../complaints/complaints_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../loans/loans_screen.dart';
import '../messages/messages_screen.dart';
import '../payments/payments_screen.dart';
import '../profile/profile_screen.dart';

/// Tabbed shell that ties the member features together. Each tab keeps its own
/// AppBar; an IndexedStack preserves each tab's scroll/state as you switch.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _pages = <Widget>[
    DashboardScreen(),
    LoansScreen(),
    PaymentsScreen(),
    MessagesScreen(),
    ComplaintsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadCountProvider);
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home'),
          const NavigationDestination(
              icon: Icon(Icons.account_balance_outlined),
              selectedIcon: Icon(Icons.account_balance),
              label: 'Loans'),
          const NavigationDestination(
              icon: Icon(Icons.smartphone_outlined),
              selectedIcon: Icon(Icons.smartphone),
              label: 'Pay'),
          NavigationDestination(
              icon: Badge(
                isLabelVisible: unread > 0,
                label: Text('$unread'),
                child: const Icon(Icons.notifications_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: unread > 0,
                label: Text('$unread'),
                child: const Icon(Icons.notifications),
              ),
              label: 'Inbox'),
          const NavigationDestination(
              icon: Icon(Icons.report_gmailerrorred_outlined),
              selectedIcon: Icon(Icons.report),
              label: 'Complaints'),
          const NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }
}

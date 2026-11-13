import 'package:flutter/material.dart';

import '../chat/chat_threads_screen.dart';
import 'complaints_screen.dart';

/// Tabbed home for member support: Complaints and the Support chat.
class MemberSupportHubScreen extends StatelessWidget {
  const MemberSupportHubScreen({
    super.key,
    required this.canManage,
  });

  final bool canManage;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Member support'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Complaints'),
              Tab(text: 'Support chat'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            ComplaintsScreen(canManage: canManage, embedded: true),
            ChatThreadsScreen(canReply: canManage, embedded: true),
          ],
        ),
      ),
    );
  }
}

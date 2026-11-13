import 'package:flutter/material.dart';

import '../audit/audit_screen.dart';
import '../notifications/notifications_screen.dart';
import '../reports/reports_screen.dart';
import '../reports/regulatory_report_screen.dart';

/// Tabbed home for oversight: Reports, the Audit log and Notifications.
/// Only the tabs the signed-in user can view are shown.
class OversightHubScreen extends StatelessWidget {
  const OversightHubScreen({
    super.key,
    required this.canViewReports,
    required this.canViewAudit,
    required this.canViewNotifications,
    required this.canManageNotifications,
  });

  final bool canViewReports;
  final bool canViewAudit;
  final bool canViewNotifications;
  final bool canManageNotifications;

  @override
  Widget build(BuildContext context) {
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (canViewReports) {
      tabs.add(const Tab(text: 'Reports'));
      views.add(const ReportsScreen(embedded: true));
      tabs.add(const Tab(text: 'Regulatory'));
      views.add(const RegulatoryReportScreen(embedded: true));
    }
    if (canViewAudit) {
      tabs.add(const Tab(text: 'Audit log'));
      views.add(const AuditScreen(embedded: true));
    }
    if (canViewNotifications) {
      tabs.add(const Tab(text: 'Notifications'));
      views.add(NotificationsScreen(
          canManage: canManageNotifications, embedded: true));
    }

    if (tabs.length <= 1) {
      return Scaffold(
        appBar:
            AppBar(title: Text(tabs.isEmpty ? 'Oversight' : tabs.first.text!)),
        body: views.isEmpty ? const SizedBox.shrink() : views.first,
      );
    }

    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Oversight'),
          bottom: TabBar(isScrollable: true, tabs: tabs),
        ),
        body: TabBarView(children: views),
      ),
    );
  }
}

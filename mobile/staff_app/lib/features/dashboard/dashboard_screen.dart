import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../audit/audit_screen.dart';
import '../complaints/complaints_screen.dart';
import '../interest/interest_screen.dart';
import '../loans/loans_screen.dart';
import '../members/members_screen.dart';
import '../notifications/notifications_screen.dart';
import '../search/global_search_screen.dart';
import '../reports/reports_screen.dart';
import '../settings/settings_screen.dart';
import '../subscription/subscription_screen.dart';
import '../transactions/transactions_screen.dart';
import '../users/users_screen.dart';
import '../welfare/welfare_screen.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A staff feature area, shown on the dashboard when the user holds any of
/// [perms]. [route] will point to the real screen as each section is built.
class _Section {
  const _Section(this.label, this.icon, this.perms, this.color, this.description);
  final String label;
  final IconData icon;
  final List<String> perms;
  final Color color;
  final String description;
}

const _sections = <_Section>[
  _Section('Members', Icons.groups_outlined,
      ['members:view', 'members:create', 'members:approve'], Color(0xFF0F766E),
      'Balances, statements & KYC'),
  _Section('Transactions', Icons.swap_horiz,
      ['transactions:view', 'transactions:create', 'transactions:approve'],
      Color(0xFFB45309), 'Deposits, withdrawals & shares'),
  _Section('Loans', Icons.account_balance_outlined,
      ['loans:view', 'loans:approve', 'loans:disburse', 'loans:create'],
      Color(0xFFB91C1C), 'Loan book, schedules & payments'),
  _Section('Welfare', Icons.volunteer_activism_outlined,
      ['welfare:view', 'welfare:manage'], Color(0xFF9333EA),
      'Member welfare claims'),
  _Section('Complaints', Icons.forum_outlined,
      ['complaints:view', 'complaints:manage'], Color(0xFFDB2777),
      'Member complaints & responses'),
  _Section('Reports', Icons.insights_outlined, ['reports:view'],
      Color(0xFF0369A1), 'SACCO metrics & portfolio'),
  _Section('Audit log', Icons.receipt_long_outlined, ['audit:view'],
      Color(0xFF525252), 'Who did what, when'),
  _Section('Notifications', Icons.notifications_outlined,
      ['notifications:view'], Color(0xFF0891B2),
      'SACCO alerts & messages sent'),
  _Section('Users & Roles', Icons.manage_accounts_outlined,
      ['users:view', 'roles:view'], Color(0xFF7C3AED),
      'Staff directory & permissions'),
  _Section('Subscription', Icons.workspace_premium_outlined,
      ['subscriptions:view'], Color(0xFF0D9488), 'Plan, capacity & payment'),
  _Section('Interest income', Icons.trending_up,
      ['loans:view', 'reports:view'], Color(0xFF16A34A),
      'Interest booked by year'),
];

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(sessionProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Search',
            icon: const Icon(Icons.search),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const GlobalSearchScreen())),
          ),
          IconButton(
            tooltip: 'Settings',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const SettingsScreen())),
          ),
        ],
      ),
      body: async.when(
        loading: () => const DashboardSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load your account.',
          detail: '$e',
          onRetry: () => ref.invalidate(sessionProvider),
        ),
        data: (s) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(sessionProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Header(session: s),
              if (s.can('operations:view')) ...[
                const SizedBox(height: 20),
                Text('SACCO status',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                const _StatusSummary(),
              ],
              const SizedBox(height: 24),
              Text('Operations',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _SectionGrid(session: s),
              if (s.can('audit:view')) ...[
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: Text('Recent activity',
                          style: Theme.of(context).textTheme.titleMedium),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) => const AuditScreen())),
                      child: const Text('View all'),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const _RecentActivity(),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.session});
  final StaffSession session;

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final name = session.userName.isEmpty ? 'Welcome' : session.userName;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primary,
            Color.alphaBlend(Colors.black.withValues(alpha: 0.28), scheme.primary),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: scheme.onPrimary.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Image.asset('assets/icon/splash_logo.png',
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Icon(
                        Icons.account_balance,
                        color: scheme.onPrimary, size: 22)),
              ),
              const SizedBox(width: 10),
              Text('Administration',
                  style: TextStyle(
                      color: scheme.onPrimary.withValues(alpha: 0.9),
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 14),
          Text(_greeting(),
              style: TextStyle(
                  color: scheme.onPrimary.withValues(alpha: 0.85),
                  fontSize: 12)),
          Text(name,
              style: TextStyle(
                  color: scheme.onPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800)),
          if (session.saccoName.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(session.saccoName,
                style: TextStyle(
                    color: scheme.onPrimary.withValues(alpha: 0.85),
                    fontSize: 13)),
          ],
          if (session.roleNames.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: session.roleNames
                  .map((r) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: scheme.onPrimary.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(r,
                            style: TextStyle(
                                color: scheme.onPrimary, fontSize: 11)),
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionGrid extends StatelessWidget {
  const _SectionGrid({required this.session});
  final StaffSession session;

  @override
  Widget build(BuildContext context) {
    final visible =
        _sections.where((s) => session.canAny(s.perms)).toList();
    if (visible.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
            child: Text('No operations are available for your role yet.')),
      );
    }
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: visible
          .map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  margin: EdgeInsets.zero,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => _screenFor(s, session))),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: s.color.withValues(alpha: 0.13),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(s.icon, color: s.color, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(s.label,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w700)),
                                const SizedBox(height: 2),
                                Text(s.description,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: scheme.onSurfaceVariant)),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right,
                              color: scheme.onSurfaceVariant),
                        ],
                      ),
                    ),
                  ),
                ),
              ))
          .toList(),
    );
  }
}

Widget _screenFor(_Section s, StaffSession session) {
  switch (s.label) {
    case 'Members':
      return const MembersScreen();
    case 'Loans':
      return const LoansScreen();
    case 'Transactions':
      return const TransactionsScreen();
    case 'Subscription':
      return SubscriptionScreen(canPay: session.can('tenants:manage'));
    case 'Complaints':
      return ComplaintsScreen(canManage: session.can('complaints:manage'));
    case 'Interest income':
      return const InterestScreen();
    case 'Reports':
      return const ReportsScreen();
    case 'Welfare':
      return const WelfareScreen();
    case 'Audit log':
      return const AuditScreen();
    case 'Notifications':
      return const NotificationsScreen();
    case 'Users & Roles':
      return const UsersScreen();
    default:
      return _ComingSoon(title: s.label);
  }
}

class _RecentActivity extends ConsumerWidget {
  const _RecentActivity();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(auditEventsProvider(''));
    return async.when(
      loading: () =>
          const Shimmer(child: SkeletonBox(height: 120, radius: 14)),
      error: (e, _) => const SizedBox.shrink(),
      data: (events) {
        if (events.isEmpty) {
          return const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No recent activity.'),
            ),
          );
        }
        final recent = events.take(6).toList();
        final scheme = Theme.of(context).colorScheme;
        return Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              children: [
                for (var i = 0; i < recent.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  ListTile(
                    dense: true,
                    leading: Icon(Icons.history,
                        size: 18, color: scheme.primary),
                    title: Text(Fmt.label(recent[i].action),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                        '${recent[i].actorName.isEmpty ? "System" : recent[i].actorName} · ${Fmt.dateTime(recent[i].createdAt)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatusSummary extends ConsumerWidget {
  const _StatusSummary();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(saccoStatusProvider);
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    return async.when(
      loading: () => const SizedBox(
          height: 140, child: Center(child: CircularProgressIndicator())),
      error: (e, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Status unavailable. $e',
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ),
      ),
      data: (st) => Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _MoneyCard(
                    'Total savings',
                    money.format(st.totalSavings),
                    Icons.savings_outlined,
                    const Color(0xFF0F766E)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MoneyCard(
                    'Loan portfolio',
                    money.format(st.loanPortfolio),
                    Icons.account_balance_outlined,
                    const Color(0xFFB91C1C)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.05,
            children: [
              _StatTile('Members', '${st.members}', Icons.groups_outlined),
              _StatTile('Active', '${st.activeMembers}', Icons.person_outline),
              _StatTile('Pending', '${st.pendingApprovals}',
                  Icons.pending_actions_outlined),
              _StatTile('Open loans', '${st.openLoans}',
                  Icons.request_quote_outlined),
              _StatTile('Complaints', '${st.openComplaints}',
                  Icons.report_gmailerrorred_outlined),
            ],
          ),
        ],
      ),
    );
  }
}

class _MoneyCard extends StatelessWidget {
  const _MoneyCard(this.label, this.value, this.icon, this.color);
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(label,
                        style: Theme.of(context).textTheme.labelMedium),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      );
}

class _StatTile extends StatelessWidget {
  const _StatTile(this.label, this.value, this.icon);
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: scheme.primary),
            const SizedBox(height: 6),
            Text(value,
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _ComingSoon extends StatelessWidget {
  const _ComingSoon({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.construction_outlined,
                  size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 12),
              Text('$title is coming next',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              const Text(
                'This section is part of the phased admin rollout.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

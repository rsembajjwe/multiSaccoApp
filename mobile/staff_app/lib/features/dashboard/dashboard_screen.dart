import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../audit/audit_screen.dart';
import '../branches/branches_screen.dart';
import '../finance/financial_products_screen.dart';
import '../savings/savings_transfers_screen.dart';
import '../governance/governance_screen.dart';
import '../chat/chat_threads_screen.dart';
import '../complaints/complaints_screen.dart';
import '../funds/fund_sources_screen.dart';
import '../funds/finance_sources_screen.dart';
import '../treasury/cash_book_screen.dart';
import '../accounting/expenses_screen.dart';
import '../accounting/suppliers_screen.dart';
import '../loans/loans_screen.dart';
import '../members/members_screen.dart';
import '../mobile_money/mobile_money_screen.dart';
import '../notifications/notifications_screen.dart';
import '../notifications/inbox_screen.dart';
import '../reconciliation/reconciliation_screen.dart';
import '../search/global_search_screen.dart';
import '../reports/reports_screen.dart';
import '../settings/settings_screen.dart';
import '../subscription/subscriptions_hub_screen.dart';
import '../transactions/transactions_screen.dart';
import '../users/users_screen.dart';
import '../welfare/welfare_screen.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A staff feature area, shown on the dashboard when the user holds any of
/// [perms]. [route] will point to the real screen as each section is built.
class _Section {
  const _Section(this.label, this.icon, this.perms, this.color, this.description,
      {required this.category});
  final String label;
  final IconData icon;
  final List<String> perms;
  final Color color;
  final String description;

  /// Dashboard group this feature is filed under (see [_categoryOrder]).
  final String category;
}

const _sections = <_Section>[
  _Section('Members', Icons.groups_outlined,
      ['members:view', 'members:create', 'members:approve'], Color(0xFF0F766E),
      'Balances, statements & KYC', category: 'Members'),
  _Section('Transactions', Icons.swap_horiz,
      ['transactions:view', 'transactions:create', 'transactions:approve'],
      Color(0xFFB45309), 'Deposits, withdrawals & shares', category: 'Finance'),
  _Section('Mobile Money', Icons.phone_android_outlined, ['accounting:view'],
      Color(0xFF0E7490), 'Requests, callbacks & status', category: 'Finance'),
  _Section('Reconciliation', Icons.fact_check_outlined, ['accounting:view'],
      Color(0xFF4338CA), 'Cash matches & exceptions', category: 'Finance'),
  _Section('Loans', Icons.account_balance_outlined,
      ['loans:view', 'loans:approve', 'loans:disburse', 'loans:create'],
      Color(0xFFB91C1C), 'Loan book, schedules & payments', category: 'Loans'),
  _Section('Fund types', Icons.account_balance_wallet_outlined,
      ['fund-types:view', 'fund-types:manage'], Color(0xFF64748B),
      'Savings, shares & custom fund buckets', category: 'Finance'),
  _Section('Finance sources', Icons.savings_outlined,
      ['funding-source:view'], Color(0xFF0D9488),
      'SACCO capital & sources of funds', category: 'Finance'),
  _Section('Cash book', Icons.local_atm_outlined,
      ['accounting:view'], Color(0xFFB45309),
      'Bank withdrawals & cash on hand', category: 'Finance'),
  _Section('Expenses', Icons.receipt_long_outlined,
      ['accounting:view'], Color(0xFFB91C1C),
      'Rent, utilities, staff & other costs', category: 'Finance'),
  _Section('Suppliers', Icons.storefront_outlined,
      ['accounting:view'], Color(0xFF64748B),
      'Payees for expenses', category: 'Finance'),
  _Section('Products', Icons.category_outlined, ['transactions:view'],
      Color(0xFF15803D), 'Savings & loan product setup', category: 'Finance'),
  _Section('Savings transfers', Icons.swap_horiz_outlined,
      ['savings-transfer:view'], Color(0xFF9333EA),
      'Chairperson transfers & group deductions', category: 'Finance'),
  _Section('Welfare', Icons.volunteer_activism_outlined,
      ['welfare:view', 'welfare:manage'], Color(0xFF9333EA),
      'Member welfare claims', category: 'Welfare & dues'),
  _Section('Subscriptions', Icons.workspace_premium_outlined,
      ['subscriptions:view', 'notifications:manage', 'member-subscription:view',
       'member-subscription:manage'], Color(0xFF0D9488),
      'Platform, member dues & SMS', category: 'Welfare & dues'),
  _Section('Complaints', Icons.forum_outlined,
      ['complaints:view', 'complaints:manage'], Color(0xFFDB2777),
      'Member complaints & responses', category: 'Member support'),
  _Section('Support chat', Icons.support_agent,
      ['complaints:view', 'complaints:manage'], Color(0xFF2563EB),
      'Member support conversations', category: 'Member support'),
  _Section('Governance', Icons.gavel_outlined, ['governance:view'],
      Color(0xFF0891B2), 'Board & AGM meetings and resolutions',
      category: 'Members'),
  _Section('Reports', Icons.insights_outlined, ['reports:view'],
      Color(0xFF0369A1), 'SACCO metrics & portfolio', category: 'Oversight'),
  _Section('Audit log', Icons.receipt_long_outlined, ['audit:view'],
      Color(0xFF525252), 'Who did what, when', category: 'Oversight'),
  _Section('Notifications', Icons.notifications_outlined, ['notifications:view'],
      Color(0xFF0891B2), 'SACCO alerts & messages sent', category: 'Oversight'),
  _Section('Users & Roles', Icons.manage_accounts_outlined,
      ['users:view', 'roles:view'], Color(0xFF7C3AED),
      'Staff directory & permissions', category: 'Administration'),
  _Section('Branches', Icons.account_tree_outlined, ['branches:view'],
      Color(0xFF0E7490), 'SACCO branch directory', category: 'Administration'),
];

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(sessionProvider);
    final unread = ref
            .watch(myNotificationsProvider)
            .asData
            ?.value
            .where((n) => !n.isRead)
            .length ??
        0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            icon: unread > 0
                ? Badge.count(
                    count: unread,
                    child: const Icon(Icons.notifications_none_outlined),
                  )
                : const Icon(Icons.notifications_none_outlined),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const InboxScreen())),
          ),
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
                const SizedBox(height: 12),
                const _OperationsAlerts(),
              ],
              if (s.can('finance-source:view')) const _MobileMoneyBalances(),
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

/// Order in which dashboard groups render; finance-first for the roles that use
/// this app most. A group appears only when the user can open at least one tile
/// inside it, and each group is collapsible (all expanded by default).
const _categoryOrder = <String>[
  'Finance',
  'Loans',
  'Welfare & dues',
  'Member support',
  'Members',
  'Oversight',
  'Administration',
];

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
    final ordered = <String>[
      ..._categoryOrder,
      ...visible
          .map((s) => s.category)
          .where((c) => !_categoryOrder.contains(c)),
    ];
    final groups = <Widget>[];
    for (final category in ordered) {
      final items = visible.where((s) => s.category == category).toList();
      if (items.isEmpty) continue;
      groups.add(
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            initiallyExpanded: true,
            tilePadding: const EdgeInsets.symmetric(horizontal: 4),
            childrenPadding: EdgeInsets.zero,
            title: Text(
              category.toUpperCase(),
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
                color: scheme.onSurfaceVariant,
              ),
            ),
            children: [
              for (final s in items) _DashTile(section: s, session: session),
            ],
          ),
        ),
      );
    }
    return Column(children: groups);
  }
}

class _DashTile extends StatelessWidget {
  const _DashTile({required this.section, required this.session});
  final _Section section;
  final StaffSession session;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final s = section;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        margin: EdgeInsets.zero,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => _screenFor(s, session))),
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
                              fontSize: 12, color: scheme.onSurfaceVariant)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
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
    case 'Mobile Money':
      return MobileMoneyScreen(canManage: session.can('accounting:post'));
    case 'Reconciliation':
      return const ReconciliationScreen();
    case 'Subscriptions':
      return SubscriptionsHubScreen(
        canViewSubscription: session.can('subscriptions:view'),
        canPaySubscription: session.can('subscriptions:manage'),
        canViewMemberSubscriptions: session.can('member-subscription:view'),
        canManageMemberSubscriptions: session.can('member-subscription:manage'),
        canPromptMemberSubscriptions: session.can('member-subscription:manage') ||
            session.can('member-subscription:prompt'),
        canManageNotifications: session.can('notifications:manage'),
      );
    case 'Complaints':
      return ComplaintsScreen(canManage: session.can('complaints:manage'));
    case 'Support chat':
      return ChatThreadsScreen(canReply: session.can('complaints:manage'));
    case 'Reports':
      return const ReportsScreen();
    case 'Welfare':
      return const WelfareScreen();
    case 'Fund types':
      return FundSourcesScreen(canManage: session.can('fund-types:manage'));
    case 'Finance sources':
      return FinanceSourcesScreen(
          canManage: session.can('finance-source:manage'));
    case 'Cash book':
      return CashBookScreen(canManage: session.can('accounting:post'));
    case 'Expenses':
      return ExpensesScreen(canManage: session.can('accounting:post'));
    case 'Suppliers':
      return SuppliersScreen(canManage: session.can('accounting:post'));
    case 'Audit log':
      return const AuditScreen();
    case 'Notifications':
      return NotificationsScreen(canManage: session.can('notifications:manage'));
    case 'Users & Roles':
      return const UsersScreen();
    case 'Branches':
      return const BranchesScreen();
    case 'Products':
      return const FinancialProductsScreen();
    case 'Savings transfers':
      return const SavingsTransfersScreen();
    case 'Governance':
      return const GovernanceScreen();
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
          _FundSummaryGrid(status: st),
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
              _StatTile('Pending postings', '${st.pendingPostings}',
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

class _OperationsAlerts extends ConsumerWidget {
  const _OperationsAlerts();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(saccoStatusProvider).asData?.value;
    final subscriptions = ref.watch(subscriptionsProvider).asData?.value;
    final reconciliation = ref.watch(reconciliationProvider).asData?.value;
    final mobileMoney =
        ref.watch(mobileMoneyPaymentRequestsProvider).asData?.value;

    final alerts = <_AlertItem>[];
    if (status != null) {
      if (status.smsBalance <= 20) {
        alerts.add(_AlertItem(
          icon: Icons.sms_failed_outlined,
          title: 'SMS balance is low',
          detail:
              '${status.smsBalance} SMS left. Buy SMS credits before sending member broadcasts.',
          color: const Color(0xFFB45309),
        ));
      }
      if (status.pendingPostings > 0) {
        alerts.add(_AlertItem(
          icon: Icons.pending_actions_outlined,
          title: 'Pending postings',
          detail: '${status.pendingPostings} transaction(s) need attention.',
          color: const Color(0xFFB45309),
        ));
      }
    }

    if (subscriptions != null && subscriptions.isNotEmpty) {
      final sub = subscriptions.first;
      if (sub.uncoveredMembers > 0) {
        alerts.add(_AlertItem(
          icon: Icons.group_off_outlined,
          title: 'Subscription capacity exceeded',
          detail:
              '${sub.uncoveredMembers} member(s) are outside paid platform capacity.',
          color: const Color(0xFFB91C1C),
        ));
      } else if (sub.paidMemberCapacity - sub.memberCount <= 2) {
        alerts.add(_AlertItem(
          icon: Icons.group_add_outlined,
          title: 'Few paid slots left',
          detail:
              '${sub.paidMemberCapacity - sub.memberCount} paid member slot(s) remain.',
          color: const Color(0xFFB45309),
        ));
      }
      if (sub.daysToExpiry != null && sub.daysToExpiry! <= 7) {
        alerts.add(_AlertItem(
          icon: Icons.workspace_premium_outlined,
          title: 'Subscription renewal due',
          detail: 'Platform subscription expires in ${sub.daysToExpiry} day(s).',
          color: const Color(0xFFB45309),
        ));
      }
    }

    final exceptions = reconciliation?.summary.exceptionCount ?? 0;
    if (exceptions > 0) {
      alerts.add(_AlertItem(
        icon: Icons.fact_check_outlined,
        title: 'Reconciliation exceptions',
        detail: '$exceptions unmatched statement or ledger line(s).',
        color: const Color(0xFFB91C1C),
      ));
    }

    final pendingPrompts = mobileMoney
            ?.where((r) => r.status.toLowerCase().contains('pending'))
            .length ??
        0;
    if (pendingPrompts > 0) {
      alerts.add(_AlertItem(
        icon: Icons.phone_android_outlined,
        title: 'Pending mobile-money prompts',
        detail: '$pendingPrompts request(s) are awaiting member payment.',
        color: const Color(0xFF0E7490),
      ));
    }

    if (alerts.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Needs attention', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        for (final alert in alerts.take(4))
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _AlertTile(alert: alert),
          ),
      ],
    );
  }
}

class _AlertItem {
  const _AlertItem({
    required this.icon,
    required this.title,
    required this.detail,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String detail;
  final Color color;
}

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.alert});
  final _AlertItem alert;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: alert.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(alert.icon, color: alert.color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(alert.title,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(alert.detail,
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FundSummaryGrid extends StatelessWidget {
  const _FundSummaryGrid({required this.status});

  final SaccoStatus status;

  @override
  Widget build(BuildContext context) {
    final funds = status.memberFunds.isEmpty
        ? [
            FundBalanceSummary(
              code: 'savings',
              name: 'Savings',
              basis: 'savings',
              system: true,
              balance: status.totalSavings,
            ),
            FundBalanceSummary(
              code: 'shares',
              name: 'Shares',
              basis: 'shares',
              system: true,
              balance: status.totalShares,
            ),
            FundBalanceSummary(
              code: 'welfare',
              name: 'Welfare',
              basis: 'welfare',
              system: true,
              balance: status.totalWelfare,
            ),
          ]
        : status.memberFunds;
    final cards = [
      ...funds.map((f) => _MoneyCard(
            f.name,
            Fmt.money(f.balance),
            _fundIcon(f.code, f.basis),
            _fundColor(f.code, f.basis),
          )),
      _MoneyCard(
        'Loan portfolio',
        Fmt.money(status.loanPortfolio),
        Icons.account_balance_outlined,
        const Color(0xFFB91C1C),
      ),
      _MoneyCard(
        'SMS balance',
        '${status.smsBalance} SMS',
        Icons.sms_outlined,
        const Color(0xFF0E7490),
      ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.35,
      children: cards,
    );
  }
}

IconData _fundIcon(String code, String basis) {
  switch (code) {
    case 'savings':
      return Icons.savings_outlined;
    case 'shares':
      return Icons.pie_chart_outline;
    case 'welfare':
      return Icons.volunteer_activism_outlined;
  }
  switch (basis) {
    case 'shares':
      return Icons.pie_chart_outline;
    case 'welfare':
      return Icons.health_and_safety_outlined;
    default:
      return Icons.account_balance_wallet_outlined;
  }
}

Color _fundColor(String code, String basis) {
  switch (code) {
    case 'savings':
      return const Color(0xFF0F766E);
    case 'shares':
      return const Color(0xFF7C3AED);
    case 'welfare':
      return const Color(0xFF9333EA);
  }
  switch (basis) {
    case 'shares':
      return const Color(0xFF2563EB);
    case 'welfare':
      return const Color(0xFFDB2777);
    default:
      return const Color(0xFF64748B);
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

/// Compact MTN/Airtel float balances for leadership (treasurer, chairperson,
/// admins) on the dashboard. Renders nothing when no provider is configured.
class _MobileMoneyBalances extends ConsumerWidget {
  const _MobileMoneyBalances();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balances = ref.watch(mobileMoneyBalancesProvider).asData?.value ??
        const <MobileMoneyBalance>[];
    if (balances.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Text('Mobile money balances',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        for (final b in balances)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _MmBalanceRow(balance: b),
          ),
      ],
    );
  }
}

class _MmBalanceRow extends StatelessWidget {
  const _MmBalanceRow({required this.balance});
  final MobileMoneyBalance balance;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ok = balance.available && balance.balance != null;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.phone_android_outlined,
                  color: scheme.primary, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(balance.label,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 8),
            ok
                ? Text(
                    '${balance.currency ?? ''} ${Fmt.number(balance.balance)}'
                        .trim(),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 14))
                : Text('Unavailable',
                    style: TextStyle(fontSize: 12, color: scheme.error)),
          ],
        ),
      ),
    );
  }
}

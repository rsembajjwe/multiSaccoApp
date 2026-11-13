import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({
    super.key,
    required this.session,
    required this.onNavigate,
  });
  final PlatformSession session;
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(fleetSummaryProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Platform overview'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(fleetSummaryProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(fleetSummaryProvider),
        child: AsyncPane(
          value: summary,
          onRetry: () => ref.invalidate(fleetSummaryProvider),
          builder: (data) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Welcome(name: session.name),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: MediaQuery.sizeOf(context).width > 650 ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.12,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                children: [
                  MetricCard(
                    label: 'Registered SACCOs',
                    value: '${data.total}',
                    icon: Icons.account_balance,
                  ),
                  MetricCard(
                    label: 'Active SACCOs',
                    value: '${data.active}',
                    icon: Icons.verified_outlined,
                    tone: const Color(0xFF087F5B),
                  ),
                  MetricCard(
                    label: 'Collected value',
                    value: money(data.revenue),
                    icon: Icons.payments_outlined,
                    tone: ProprietorTheme.gold,
                  ),
                  MetricCard(
                    label: 'Outstanding',
                    value: money(data.outstanding),
                    icon: Icons.warning_amber_rounded,
                    tone: const Color(0xFFC92A2A),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Operational pulse',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 16),
                      _PulseRow(
                        'Pending applications',
                        data.pending,
                        Icons.schedule,
                      ),
                      _PulseRow(
                        'Renewals due in 30 days',
                        data.renewalsDue,
                        Icons.event_repeat,
                      ),
                      _PulseRow(
                        'Expired subscriptions',
                        data.expired,
                        Icons.event_busy,
                      ),
                      _PulseRow(
                        'Critical SACCOs',
                        data.critical,
                        Icons.crisis_alert,
                      ),
                      _PulseRow(
                        'Approval SLA breaches',
                        data.slaBreached,
                        Icons.timer_off_outlined,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Quick actions',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  if (session.can('tenants:manage'))
                    ActionChip(
                      avatar: const Icon(Icons.add_business, size: 18),
                      label: const Text('Register SACCO'),
                      onPressed: () => onNavigate(1),
                    ),
                  if (session.can('subscriptions:view'))
                    ActionChip(
                      avatar: const Icon(Icons.receipt_long, size: 18),
                      label: const Text('Open billing'),
                      onPressed: () => onNavigate(2),
                    ),
                  if (session.can('tenants:manage'))
                    ActionChip(
                      avatar: const Icon(Icons.approval, size: 18),
                      label: const Text('Review approvals'),
                      onPressed: () => onNavigate(3),
                    ),
                ],
              ),
              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(22),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [ProprietorTheme.navy, Color(0xFF193A7A)],
      ),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      children: [
        const CircleAvatar(
          radius: 26,
          backgroundColor: ProprietorTheme.gold,
          child: Icon(Icons.admin_panel_settings, color: ProprietorTheme.navy),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome back, ${name.isEmpty ? 'Proprietor' : name}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Live platform performance and attention items',
                style: TextStyle(color: Colors.white70),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _PulseRow extends StatelessWidget {
  const _PulseRow(this.label, this.value, this.icon);
  final String label;
  final int value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        Icon(icon, size: 20, color: ProprietorTheme.blue),
        const SizedBox(width: 10),
        Expanded(child: Text(label)),
        Text('$value', style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
    ),
  );
}

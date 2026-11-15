import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class AdvancedReportsScreen extends ConsumerStatefulWidget {
  const AdvancedReportsScreen({super.key, required this.session});

  final PlatformSession session;

  @override
  ConsumerState<AdvancedReportsScreen> createState() =>
      _AdvancedReportsScreenState();
}

class _AdvancedReportsScreenState extends ConsumerState<AdvancedReportsScreen> {
  final _search = TextEditingController();
  final _district = TextEditingController();
  String _health = '';
  String _status = '';
  String _accountManager = '';
  Future<PageResult<TenantFleetItem>>? _filtered;

  @override
  void initState() {
    super.initState();
    _filtered = ref.read(platformRepositoryProvider).tenants();
  }

  @override
  void dispose() {
    _search.dispose();
    _district.dispose();
    super.dispose();
  }

  void _runFilters() {
    setState(() {
      _filtered = ref
          .read(platformRepositoryProvider)
          .tenants(
            search: _search.text.trim(),
            district: _district.text.trim(),
            health: _health,
            status: _status,
            accountManager: _accountManager,
          );
    });
  }

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 3,
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Business reports'),
        bottom: const TabBar(
          tabs: [
            Tab(text: 'Portfolio'),
            Tab(text: 'Forecast'),
            Tab(text: 'Saved views'),
          ],
        ),
      ),
      body: TabBarView(
        children: [
          _portfolioTab(),
          _ForecastTab(session: widget.session),
          _savedViewsTab(),
        ],
      ),
    ),
  );

  Widget _portfolioTab() => Column(
    children: [
      ExpansionTile(
        initiallyExpanded: true,
        title: const Text('Report filters'),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          TextField(
            controller: _search,
            decoration: const InputDecoration(
              labelText: 'SACCO name, code or registration number',
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _district,
            decoration: const InputDecoration(labelText: 'District'),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _health,
                  decoration: const InputDecoration(labelText: 'Health'),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All')),
                    DropdownMenuItem(value: 'healthy', child: Text('Healthy')),
                    DropdownMenuItem(
                      value: 'attention',
                      child: Text('Attention'),
                    ),
                    DropdownMenuItem(
                      value: 'critical',
                      child: Text('Critical'),
                    ),
                  ],
                  onChanged: (value) => setState(() => _health = value ?? ''),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Lifecycle'),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All')),
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(
                      value: 'pending_review',
                      child: Text('Pending review'),
                    ),
                    DropdownMenuItem(
                      value: 'suspended',
                      child: Text('Suspended'),
                    ),
                    DropdownMenuItem(
                      value: 'inactive',
                      child: Text('Inactive'),
                    ),
                  ],
                  onChanged: (value) => setState(() => _status = value ?? ''),
                ),
              ),
            ],
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _accountManager == 'unassigned',
            title: const Text('Only unassigned SACCOs'),
            onChanged: (value) => setState(
              () => _accountManager = value == true ? 'unassigned' : '',
            ),
          ),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _runFilters,
                  icon: const Icon(Icons.filter_alt),
                  label: const Text('Run report'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                tooltip: 'Save this view',
                onPressed: _saveCurrentView,
                icon: const Icon(Icons.bookmark_add_outlined),
              ),
            ],
          ),
        ],
      ),
      Expanded(
        child: FutureBuilder<PageResult<TenantFleetItem>>(
          future: _filtered,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            final rows = snapshot.data?.items ?? const [];
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${snapshot.data?.total ?? rows.length} SACCO(s)',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: rows.isEmpty ? null : _export,
                        icon: const Icon(Icons.download_outlined),
                        label: const Text('Export CSV'),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: rows.isEmpty
                      ? const Center(
                          child: Text('No SACCOs match these filters.'),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                          itemCount: rows.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 6),
                          itemBuilder: (_, index) {
                            final row = rows[index];
                            return Card(
                              child: ListTile(
                                title: Text(row.name),
                                subtitle: Text(
                                  '${row.district} • ${label(row.subscriptionStatus)}\n'
                                  '${row.healthReason}',
                                ),
                                isThreeLine: true,
                                trailing: StatusPill(row.health),
                              ),
                            );
                          },
                        ),
                ),
              ],
            );
          },
        ),
      ),
    ],
  );

  Widget _savedViewsTab() {
    final views = ref.watch(fleetSavedViewsProvider);
    return AsyncPane(
      value: views,
      onRetry: () => ref.invalidate(fleetSavedViewsProvider),
      builder: (items) => items.isEmpty
          ? const Center(child: Text('No report views have been saved.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (_, index) {
                final view = items[index];
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.bookmark_outline),
                    title: Text(view.name),
                    subtitle: Text(_viewSummary(view)),
                    onTap: () => _applyView(view),
                    trailing: IconButton(
                      tooltip: 'Delete view',
                      onPressed: () => _deleteView(view),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ),
                );
              },
            ),
    );
  }

  String _viewSummary(FleetSavedView view) {
    final filters = [
      if (view.search.isNotEmpty) 'Search: ${view.search}',
      if (view.district.isNotEmpty) 'District: ${view.district}',
      if (view.health.isNotEmpty) 'Health: ${label(view.health)}',
      if (view.status.isNotEmpty) 'Status: ${label(view.status)}',
      if (view.accountManager.isNotEmpty)
        'Portfolio: ${label(view.accountManager)}',
    ];
    return filters.isEmpty ? 'All SACCOs' : filters.join(' • ');
  }

  void _applyView(FleetSavedView view) {
    _search.text = view.search;
    _district.text = view.district;
    setState(() {
      _health = view.health;
      _status = view.status;
      _accountManager = view.accountManager;
    });
    _runFilters();
    DefaultTabController.of(context).animateTo(0);
  }

  Future<void> _saveCurrentView() async {
    final name = await _nameDialog('Save report view');
    if (name == null || !mounted) return;
    try {
      await ref
          .read(platformRepositoryProvider)
          .saveFleetView(
            name: name,
            search: _search.text.trim(),
            health: _health,
            status: _status,
            district: _district.text.trim(),
            accountManager: _accountManager,
          );
      ref.invalidate(fleetSavedViewsProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _deleteView(FleetSavedView view) async {
    await ref.read(platformRepositoryProvider).deleteFleetView(view.id);
    ref.invalidate(fleetSavedViewsProvider);
  }

  Future<String?> _nameDialog(String title) async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 80,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result == null || result.isEmpty ? null : result;
  }

  Future<void> _export() async {
    final rows = await ref
        .read(platformRepositoryProvider)
        .fleetReportRows(
          search: _search.text.trim(),
          district: _district.text.trim(),
          health: _health,
          status: _status,
          accountManager: _accountManager,
        );
    String cell(Object? value) => '"${'$value'.replaceAll('"', '""')}"';
    final csv = <String>[
      'Code,Name,District,Lifecycle,Health,Subscription,Expiry,Balance',
      ...rows.map(
        (row) => [
          row.code,
          row.name,
          row.district,
          row.status,
          row.health,
          row.subscriptionStatus,
          row.subscriptionExpiry?.toIso8601String().split('T').first ?? '',
          row.balanceDue,
        ].map(cell).join(','),
      ),
    ].join('\r\n');
    final directory =
        await getExternalStorageDirectory() ??
        await getApplicationDocumentsDirectory();
    final file = File(
      '${directory.path}${Platform.pathSeparator}tereka-fleet-${DateTime.now().millisecondsSinceEpoch}.csv',
    );
    await file.writeAsString(csv, flush: true);
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('CSV saved to ${file.path}')));
    }
  }
}

class _ForecastTab extends ConsumerWidget {
  const _ForecastTab({required this.session});

  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(fleetSummaryProvider);
    final scenarios = ref.watch(forecastScenariosProvider);
    return AsyncPane(
      value: summary,
      onRetry: () => ref.invalidate(fleetSummaryProvider),
      builder: (fleet) => scenarios.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (items) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    label: 'Renewals in 90 days',
                    value: '${fleet.renewalsDue90}',
                    icon: Icons.event_repeat,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: MetricCard(
                    label: 'Renewal value',
                    value: money(fleet.projectedRenewalValue90),
                    icon: Icons.trending_up,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Six-month renewal schedule',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            ...fleet.renewalForecast.map(
              (item) => Card(
                child: ListTile(
                  title: Text(item.period),
                  subtitle: Text('${item.organizations} SACCO(s) due'),
                  trailing: Text(
                    money(item.projectedValue),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Saved scenarios',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                ),
                if (session.can('subscriptions:view'))
                  IconButton.filledTonal(
                    onPressed: () => _addScenario(context, ref),
                    icon: const Icon(Icons.add_chart),
                  ),
              ],
            ),
            if (items.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No renewal scenarios saved.'),
                ),
              ),
            ...items.map(
              (scenario) => Card(
                child: ListTile(
                  title: Text(scenario.name),
                  subtitle: Text(
                    '${scenario.renewalRate}% renewals • '
                    '${scenario.priceAdjustment >= 0 ? '+' : ''}${scenario.priceAdjustment}% price',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        money(
                          scenario.projectedValue(
                            fleet.projectedRenewalValue90,
                          ),
                        ),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        onPressed: () => _deleteScenario(ref, scenario),
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addScenario(BuildContext context, WidgetRef ref) async {
    final name = TextEditingController();
    double renewalRate = 85;
    double priceAdjustment = 0;
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Renewal forecast scenario'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Scenario name'),
              ),
              const SizedBox(height: 12),
              Text('Renewal rate: ${renewalRate.round()}%'),
              Slider(
                value: renewalRate,
                min: 0,
                max: 100,
                divisions: 20,
                onChanged: (value) => setState(() => renewalRate = value),
              ),
              Text('Price adjustment: ${priceAdjustment.round()}%'),
              Slider(
                value: priceAdjustment,
                min: -30,
                max: 30,
                divisions: 12,
                onChanged: (value) => setState(() => priceAdjustment = value),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Save scenario'),
            ),
          ],
        ),
      ),
    );
    if (submit == true && name.text.trim().isNotEmpty) {
      await ref
          .read(platformRepositoryProvider)
          .saveForecastScenario(
            name: name.text.trim(),
            renewalRate: renewalRate.round(),
            priceAdjustment: priceAdjustment.round(),
          );
      ref.invalidate(forecastScenariosProvider);
    }
    name.dispose();
  }

  Future<void> _deleteScenario(
    WidgetRef ref,
    FleetForecastScenario scenario,
  ) async {
    await ref
        .read(platformRepositoryProvider)
        .deleteForecastScenario(scenario.id);
    ref.invalidate(forecastScenariosProvider);
  }
}

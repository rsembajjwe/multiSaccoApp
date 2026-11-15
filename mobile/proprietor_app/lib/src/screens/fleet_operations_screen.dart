import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class FleetOperationsScreen extends ConsumerWidget {
  const FleetOperationsScreen({super.key, required this.session});

  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) => DefaultTabController(
    length: 2,
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Fleet operations'),
        bottom: const TabBar(
          tabs: [
            Tab(text: 'Bulk jobs'),
            Tab(text: 'Incidents'),
          ],
        ),
      ),
      floatingActionButton: session.can('tenants:manage')
          ? FloatingActionButton.extended(
              onPressed: () => _createJob(context, ref),
              icon: const Icon(Icons.playlist_add_check),
              label: const Text('Bulk action'),
            )
          : null,
      body: TabBarView(
        children: [
          _JobsTab(session: session),
          _IncidentsTab(session: session),
        ],
      ),
    ),
  );

  Future<void> _createJob(BuildContext context, WidgetRef ref) async {
    final tenants = (await ref.read(fleetProvider('').future)).items;
    if (!context.mounted) return;
    final selected = <String>{};
    final reason = TextEditingController();
    final manager = TextEditingController();
    String action = 'pending_review';
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Request bulk fleet action'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: action,
                    decoration: const InputDecoration(labelText: 'Action'),
                    items: const [
                      DropdownMenuItem(
                        value: 'pending_review',
                        child: Text('Move to pending review'),
                      ),
                      DropdownMenuItem(
                        value: 'suspended',
                        child: Text('Suspend SACCOs'),
                      ),
                      DropdownMenuItem(
                        value: 'inactive',
                        child: Text('Deactivate SACCOs'),
                      ),
                      DropdownMenuItem(
                        value: 'assign_manager',
                        child: Text('Assign portfolio manager'),
                      ),
                    ],
                    onChanged: (value) =>
                        setState(() => action = value ?? action),
                  ),
                  if (action == 'assign_manager') ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: manager,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        labelText: 'Portfolio manager name',
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextField(
                    controller: reason,
                    onChanged: (_) => setState(() {}),
                    maxLength: 500,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Business reason',
                    ),
                  ),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Select SACCOs',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                  ...tenants.map(
                    (tenant) => CheckboxListTile(
                      value: selected.contains(tenant.id),
                      contentPadding: EdgeInsets.zero,
                      title: Text(tenant.name),
                      subtitle: Text(
                        '${tenant.district} • ${label(tenant.status)}',
                      ),
                      onChanged: (checked) => setState(() {
                        if (checked == true) {
                          selected.add(tenant.id);
                        } else {
                          selected.remove(tenant.id);
                        }
                      }),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed:
                  selected.isEmpty ||
                      reason.text.trim().isEmpty ||
                      (action == 'assign_manager' &&
                          manager.text.trim().isEmpty)
                  ? null
                  : () => Navigator.pop(dialogContext, true),
              child: const Text('Submit for approval'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .submitFleetJob(
              tenantIds: selected.toList(),
              status: action == 'assign_manager' ? '' : action,
              accountManagerName: action == 'assign_manager'
                  ? manager.text.trim()
                  : '',
              reason: reason.text.trim(),
            );
        ref.invalidate(fleetJobsProvider);
        ref.invalidate(approvalsProvider);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Bulk action submitted for approval.'),
            ),
          );
        }
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    reason.dispose();
    manager.dispose();
  }
}

class _JobsTab extends ConsumerWidget {
  const _JobsTab({required this.session});

  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobs = ref.watch(fleetJobsProvider);
    return AsyncPane(
      value: jobs,
      onRetry: () => ref.invalidate(fleetJobsProvider),
      builder: (items) => items.isEmpty
          ? const Center(child: Text('No fleet bulk jobs have been submitted.'))
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(fleetJobsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, index) {
                  final job = items[index];
                  final action = job.targetStatus.isNotEmpty
                      ? 'Set lifecycle to ${label(job.targetStatus)}'
                      : 'Assign ${job.accountManagerName}';
                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.account_tree_outlined),
                      title: Text(
                        action,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        '${job.requestedCount} SACCO(s) • ${job.reason}\n'
                        'Success ${job.succeededCount}, failed ${job.failedCount}',
                      ),
                      isThreeLine: true,
                      trailing: StatusPill(job.status),
                      onTap: () => _showResults(context, ref, job),
                    ),
                  );
                },
              ),
            ),
    );
  }

  Future<void> _showResults(
    BuildContext context,
    WidgetRef ref,
    FleetBulkJob job,
  ) async {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Per-SACCO job results'),
        content: SizedBox(
          width: 520,
          child: FutureBuilder<List<FleetBulkJobResult>>(
            future: ref
                .read(platformRepositoryProvider)
                .fleetJobResults(job.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) return Text('${snapshot.error}');
              final results = snapshot.data ?? const [];
              return ListView.separated(
                shrinkWrap: true,
                itemCount: results.length,
                separatorBuilder: (_, _) => const Divider(),
                itemBuilder: (_, index) {
                  final result = results[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      result.tenantName.isEmpty
                          ? result.tenantId
                          : result.tenantName,
                    ),
                    subtitle: result.message.isEmpty
                        ? null
                        : Text(result.message),
                    trailing: StatusPill(result.status),
                  );
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _IncidentsTab extends ConsumerWidget {
  const _IncidentsTab({required this.session});

  final PlatformSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final incidents = ref.watch(fleetIncidentsProvider);
    return AsyncPane(
      value: incidents,
      onRetry: () => ref.invalidate(fleetIncidentsProvider),
      builder: (items) => items.isEmpty
          ? const Center(
              child: Text('No fleet incidents are currently recorded.'),
            )
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(fleetIncidentsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, index) {
                  final incident = items[index];
                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.warning_amber_rounded),
                      title: Text(
                        label(incident.issueType),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        '${incident.tenantId}\nOwner: '
                        '${incident.assigneeName.isEmpty ? 'Unassigned' : incident.assigneeName}',
                      ),
                      isThreeLine: true,
                      trailing: StatusPill(incident.status),
                      onTap: session.can('tenants:manage')
                          ? () => _update(context, ref, incident)
                          : null,
                    ),
                  );
                },
              ),
            ),
    );
  }

  Future<void> _update(
    BuildContext context,
    WidgetRef ref,
    FleetIncident incident,
  ) async {
    String status = incident.status;
    final note = TextEditingController(text: incident.resolutionNote);
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(label(incident.issueType)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: status,
                decoration: const InputDecoration(labelText: 'Incident status'),
                items: const [
                  DropdownMenuItem(value: 'open', child: Text('Open')),
                  DropdownMenuItem(
                    value: 'acknowledged',
                    child: Text('Acknowledged'),
                  ),
                  DropdownMenuItem(
                    value: 'escalated',
                    child: Text('Escalated'),
                  ),
                  DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                ],
                onChanged: (value) => setState(() => status = value ?? status),
              ),
              if (status == 'resolved') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: note,
                  onChanged: (_) => setState(() {}),
                  maxLength: 1000,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Resolution note',
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: status == 'resolved' && note.text.trim().isEmpty
                  ? null
                  : () => Navigator.pop(dialogContext, true),
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );
    if (submit == true) {
      try {
        await ref
            .read(platformRepositoryProvider)
            .updateFleetIncident(
              incident.incidentKey,
              status,
              resolutionNote: note.text.trim(),
            );
        ref.invalidate(fleetIncidentsProvider);
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    note.dispose();
  }
}

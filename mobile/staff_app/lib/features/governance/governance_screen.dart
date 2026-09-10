import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Meeting types the secretary can record. General meetings (and the AGM) are
/// visible to members; board and committee meetings stay staff-only.
const _meetingTypes = <String, String>{
  'general': 'General meeting',
  'agm': 'AGM',
  'board': 'Board',
  'credit_committee': 'Credit committee',
  'audit_committee': 'Audit committee',
  'management': 'Management',
};
const _meetingStatuses = <String>['scheduled', 'completed', 'cancelled'];
const _memberVisibleTypes = <String>{'general', 'agm'};

Future<void> _openMeetingForm(
    BuildContext context, WidgetRef ref, GovernanceMeeting? existing) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _MeetingFormSheet(existing: existing),
  );
}

/// Board, committee and general meetings with their resolutions and minutes.
/// The secretary (governance:manage) can add meetings and record minutes.
class GovernanceScreen extends ConsumerWidget {
  const GovernanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(governanceMeetingsProvider);
    final canManage =
        ref.watch(sessionProvider).asData?.value.can('governance:manage') ??
            false;
    return Scaffold(
      appBar: AppBar(title: const Text('Governance')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Add meeting'),
              onPressed: () => _openMeetingForm(context, ref, null),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load meetings.',
          detail: '$e',
          onRetry: () => ref.invalidate(governanceMeetingsProvider),
        ),
        data: (meetings) {
          if (meetings.isEmpty) {
            return const EmptyState(
              icon: Icons.groups_outlined,
              message: 'No meetings on record.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(governanceMeetingsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
              itemCount: meetings.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _MeetingCard(
                meetings[i],
                canManage: canManage,
                onEdit: () => _openMeetingForm(context, ref, meetings[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  const _MeetingCard(this.meeting, {required this.canManage, required this.onEdit});
  final GovernanceMeeting meeting;
  final bool canManage;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final memberVisible = _memberVisibleTypes.contains(meeting.meetingType);
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
          title: Text(meeting.title,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
                '${_meetingTypes[meeting.meetingType] ?? meeting.typeLabel} · ${Fmt.dateTime(meeting.scheduledAt)}',
                style: TextStyle(fontSize: 12.5, color: scheme.outline)),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusChip(meeting.status),
              if (meeting.openResolutions > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('${meeting.openResolutions} open',
                      style: TextStyle(fontSize: 11, color: scheme.outline)),
                ),
            ],
          ),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                memberVisible
                    ? 'Visible to all members'
                    : 'Staff only',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: memberVisible ? scheme.primary : scheme.outline),
              ),
            ),
            const SizedBox(height: 6),
            if (meeting.resolutions.isEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Text('No resolutions recorded.',
                    style: TextStyle(fontSize: 12.5, color: scheme.outline)),
              )
            else
              ...meeting.resolutions.map((r) => _ResolutionRow(r)),
            const Divider(height: 20),
            Align(
              alignment: Alignment.centerLeft,
              child: Text('Minutes',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: scheme.outline)),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                (meeting.minutes ?? '').isEmpty
                    ? 'No minutes recorded yet.'
                    : meeting.minutes!,
                style: TextStyle(
                    fontSize: 12.5,
                    color: (meeting.minutes ?? '').isEmpty
                        ? scheme.outline
                        : null),
              ),
            ),
            if (canManage) ...[
              const SizedBox(height: 6),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_note_outlined, size: 18),
                  label: const Text('Edit meeting / minutes'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ResolutionRow extends StatelessWidget {
  const _ResolutionRow(this.resolution);
  final GovernanceResolution resolution;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final owner = resolution.ownerName ?? resolution.ownerTitle;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Icon(Icons.task_alt_outlined,
                size: 16, color: scheme.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(resolution.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 13.5)),
                if ((resolution.decision ?? '').isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(resolution.decision!,
                        style: const TextStyle(fontSize: 12.5)),
                  ),
                Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Text(
                    [
                      if (owner != null && owner.isNotEmpty) 'Owner: $owner',
                      if ((resolution.dueDate ?? '').isNotEmpty)
                        'Due ${Fmt.date(resolution.dueDate)}',
                    ].join(' · '),
                    style: TextStyle(fontSize: 11.5, color: scheme.outline),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StatusChip(resolution.status),
        ],
      ),
    );
  }
}

class _MeetingFormSheet extends ConsumerStatefulWidget {
  const _MeetingFormSheet({this.existing});
  final GovernanceMeeting? existing;

  @override
  ConsumerState<_MeetingFormSheet> createState() => _MeetingFormSheetState();
}

class _MeetingFormSheetState extends ConsumerState<_MeetingFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _minutes;
  late String _type;
  late String _status;
  late DateTime _scheduledAt;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _title = TextEditingController(text: e?.title ?? '');
    _minutes = TextEditingController(text: e?.minutes ?? '');
    _type = _meetingTypes.containsKey(e?.meetingType)
        ? e!.meetingType
        : 'general';
    _status = _meetingStatuses.contains(e?.status) ? e!.status : 'scheduled';
    _scheduledAt = e?.scheduledAt ?? DateTime.now();
  }

  @override
  void dispose() {
    _title.dispose();
    _minutes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _scheduledAt,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _scheduledAt = DateTime(
          picked.year, picked.month, picked.day, _scheduledAt.hour,
          _scheduledAt.minute));
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final repo = ref.read(adminRepositoryProvider);
    final existing = widget.existing;
    try {
      if (existing == null) {
        await repo.createGovernanceMeeting(
          title: _title.text,
          meetingType: _type,
          scheduledAt: _scheduledAt,
          status: _status,
          minutes: _minutes.text,
        );
      } else {
        await repo.updateGovernanceMeeting(
          existing.id,
          title: _title.text,
          meetingType: _type,
          scheduledAt: _scheduledAt,
          status: _status,
          minutes: _minutes.text,
        );
      }
      ref.invalidate(governanceMeetingsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(existing == null
                  ? 'Meeting added.'
                  : 'Meeting updated.')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final memberVisible = _memberVisibleTypes.contains(_type);
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.existing == null ? 'Add meeting' : 'Edit meeting',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              TextFormField(
                controller: _title,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Enter a title.' : null,
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Meeting type'),
                items: _meetingTypes.entries
                    .map((e) =>
                        DropdownMenuItem(value: e.key, child: Text(e.value)))
                    .toList(),
                onChanged:
                    _busy ? null : (v) => setState(() => _type = v ?? _type),
              ),
              const SizedBox(height: 4),
              Text(
                memberVisible
                    ? 'Members can view this meeting and its minutes.'
                    : 'Staff only — members cannot see this meeting.',
                style: TextStyle(
                    fontSize: 12,
                    color: memberVisible
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.outline),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: _busy ? null : _pickDate,
                      child: InputDecorator(
                        decoration:
                            const InputDecoration(labelText: 'Scheduled date'),
                        child: Text(Fmt.date(_scheduledAt)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: _meetingStatuses
                          .map((s) => DropdownMenuItem(
                              value: s, child: Text(Fmt.label(s))))
                          .toList(),
                      onChanged: _busy
                          ? null
                          : (v) => setState(() => _status = v ?? _status),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _minutes,
                minLines: 4,
                maxLines: 12,
                decoration: const InputDecoration(
                  labelText: 'Minutes',
                  alignLabelWithHint: true,
                  hintText: 'Record the meeting minutes here',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: _busy
                      ? const SizedBox(
                          height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_outlined),
                  label: Text(
                      widget.existing == null ? 'Add meeting' : 'Save changes'),
                  onPressed: _busy ? null : _save,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

const _statuses = ['open', 'in_progress', 'resolved', 'closed'];

class _Filter {
  const _Filter(this.label, this.match);
  final String label;
  final String? match;
}

const _filters = <_Filter>[
  _Filter('All', null),
  _Filter('Open', 'open'),
  _Filter('In progress', 'in_progress'),
  _Filter('Resolved', 'resolved'),
  _Filter('Closed', 'closed'),
];

/// Member complaints with a status filter; each opens a detail where an
/// authorised officer can update the status and add resolution notes.
class ComplaintsScreen extends ConsumerStatefulWidget {
  const ComplaintsScreen({super.key, required this.canManage});
  final bool canManage;

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  int _filter = 0;
  int _reloadTick = 0;

  @override
  Widget build(BuildContext context) {
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Complaints')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ChoiceChip(
                  label: Text(_filters[i].label),
                  selected: _filter == i,
                  onSelected: (_) => setState(() => _filter = i),
                ),
              ),
            ),
          ),
          Expanded(
            child: PagedListView<Complaint>(
              search: '${_filters[_filter].match ?? ''}|$_reloadTick',
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .complaintsPage(status: _filters[_filter].match, page: page),
              itemBuilder: (context, c) => _ComplaintTile(
                complaint: c,
                memberName: names[c.memberId],
                canManage: widget.canManage,
                onChanged: () {
                  if (mounted) setState(() => _reloadTick++);
                },
              ),
              emptyIcon: Icons.forum_outlined,
              emptyMessage: 'No complaints in this view.',
              errorMessage: 'Could not load complaints.',
            ),
          ),
        ],
      ),
    );
  }
}

class _ComplaintTile extends ConsumerWidget {
  const _ComplaintTile({
    required this.complaint,
    required this.canManage,
    this.memberName,
    this.onChanged,
  });
  final Complaint complaint;
  final String? memberName;
  final bool canManage;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final high = complaint.priority.toLowerCase().contains('high') ||
        complaint.priority.toLowerCase().contains('urgent');
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          await _openDetail(context, ref);
          onChanged?.call();
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                        complaint.subject.isEmpty
                            ? Fmt.label(complaint.category)
                            : complaint.subject,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  StatusChip(complaint.status),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                  '${memberName ?? complaint.memberId} · ${Fmt.date(complaint.createdAt)}'
                  '${complaint.priority.isEmpty ? '' : ' · ${Fmt.label(complaint.priority)}'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 12,
                      color: high
                          ? const Color(0xFFB45309)
                          : scheme.onSurfaceVariant)),
              if (complaint.description.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(complaint.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurface)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openDetail(BuildContext context, WidgetRef ref) {
    return Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ComplaintDetailScreen(
        complaint: complaint,
        memberName: memberName,
        canManage: canManage,
      ),
    ));
  }
}

/// Full complaint with a status-update action for authorised officers.
class ComplaintDetailScreen extends ConsumerStatefulWidget {
  const ComplaintDetailScreen({
    super.key,
    required this.complaint,
    required this.canManage,
    this.memberName,
  });
  final Complaint complaint;
  final String? memberName;
  final bool canManage;

  @override
  ConsumerState<ComplaintDetailScreen> createState() =>
      _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends ConsumerState<ComplaintDetailScreen> {
  late String _status = widget.complaint.status.isEmpty
      ? 'open'
      : widget.complaint.status;
  late final TextEditingController _notes =
      TextEditingController(text: widget.complaint.resolutionNotes);
  bool _busy = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .updateComplaint(widget.complaint.id, _status,
              notes: _notes.text.trim());
      ref.invalidate(complaintsProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Complaint updated.')));
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
    final c = widget.complaint;
    return Scaffold(
      appBar: AppBar(title: const Text('Complaint')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                            c.subject.isEmpty
                                ? Fmt.label(c.category)
                                : c.subject,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800)),
                      ),
                      StatusChip(c.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                      '${widget.memberName ?? c.memberId} · ${Fmt.dateTime(c.createdAt)}',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 12)),
                  const Divider(height: 22),
                  KeyValueRow('Category', Fmt.label(c.category)),
                  KeyValueRow('Priority', Fmt.label(c.priority)),
                  KeyValueRow('Channel', Fmt.label(c.channel)),
                  if (c.description.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text('Description',
                        style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 4),
                    Text(c.description),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (widget.canManage) ...[
            SectionCard(
              title: 'Update status',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    children: _statuses
                        .map((s) => ChoiceChip(
                              label: Text(Fmt.label(s)),
                              selected: _status == s,
                              onSelected: _busy
                                  ? null
                                  : (_) => setState(() => _status = s),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notes,
                    minLines: 2,
                    maxLines: 5,
                    decoration: const InputDecoration(
                        labelText: 'Resolution notes',
                        alignLabelWithHint: true),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy ? null : _save,
                      child: _busy
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Save'),
                    ),
                  ),
                ],
              ),
            ),
          ] else if (c.resolutionNotes.isNotEmpty)
            SectionCard(
              title: 'Resolution',
              child: Text(c.resolutionNotes),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

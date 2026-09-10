import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

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

/// Full complaint with response and routing actions for authorised officers.
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
  bool _busy = false;

  Future<void> _runWorkflow(String action, String title,
      {bool messageRequired = true}) async {
    final controller = TextEditingController();
    final message = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 3,
          maxLines: 6,
          decoration: InputDecoration(
            labelText: messageRequired ? 'Message' : 'Optional note',
            alignLabelWithHint: true,
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (message == null) return;
    if (messageRequired && message.trim().length < 3) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Enter a response or note.')));
      }
      return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .complaintWorkflow(widget.complaint.id,
              action: action, message: message.trim());
      ref.invalidate(complaintsProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Complaint workflow updated.')));
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
    final staffNames = ref.watch(staffNamesProvider).asData?.value ??
        const <String, String>{};
    final assignedTo = c.assignedUserId.isEmpty
        ? 'Unassigned'
        : staffNames[c.assignedUserId] ?? c.assignedUserId;
    final resolvedBy = c.resolvedByUserId.isEmpty
        ? ''
        : staffNames[c.resolvedByUserId] ?? c.resolvedByUserId;
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
                  KeyValueRow('Assigned to', assignedTo),
                  if (resolvedBy.isNotEmpty)
                    KeyValueRow('Resolved by', resolvedBy),
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
              title: 'Respond and route',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _runWorkflow(
                                'reply_member', 'Reply to member'),
                        icon: const Icon(Icons.reply_outlined),
                        label: const Text('Reply'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _runWorkflow(
                                'internal_note', 'Add internal note'),
                        icon: const Icon(Icons.sticky_note_2_outlined),
                        label: const Text('Internal note'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _runWorkflow('refer_treasurer',
                                'Refer to treasurer'),
                        icon: const Icon(Icons.account_balance_wallet_outlined),
                        label: const Text('Refer treasurer'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _runWorkflow('escalate_chairman',
                                'Escalate to chairman'),
                        icon: const Icon(Icons.escalator_warning_outlined),
                        label: const Text('Escalate'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _runWorkflow('resolve', 'Resolve complaint'),
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Resolve'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _runWorkflow('close', 'Close complaint',
                                messageRequired: false),
                        icon: const Icon(Icons.archive_outlined),
                        label: const Text('Close'),
                      ),
                    ],
                  ),
                  if (_busy) ...[
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(),
                  ],
                ],
              ),
            ),
          ],
          if (c.messages.isNotEmpty || c.resolutionNotes.isNotEmpty) ...[
            const SizedBox(height: 16),
            SectionCard(
              title: 'Conversation',
              child: _ComplaintThread(
                complaint: c,
                staffNames: staffNames,
                memberName: widget.memberName,
              ),
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

/// The complaint conversation, rendered as a WhatsApp-style thread: member
/// messages sit on the left as incoming bubbles, staff replies on the right as
/// outgoing bubbles, internal notes are set apart as staff-only, and workflow
/// events (closures, referrals with no text) show as centred system pills.
class _ComplaintThread extends StatelessWidget {
  const _ComplaintThread({
    required this.complaint,
    required this.staffNames,
    this.memberName,
  });

  final Complaint complaint;
  final Map<String, String> staffNames;
  final String? memberName;

  @override
  Widget build(BuildContext context) {
    final messages = complaint.messages;
    if (messages.isEmpty) {
      return complaint.resolutionNotes.isEmpty
          ? const SizedBox.shrink()
          : Text(complaint.resolutionNotes);
    }
    final scheme = Theme.of(context).colorScheme;
    final rows = <Widget>[];
    String lastDay = '';
    for (final m in messages) {
      final day = Fmt.date(m.createdAt);
      if (day != lastDay) {
        rows.add(_DayDivider(label: day));
        lastDay = day;
      }
      if (m.visibility == 'internal') {
        rows.add(_InternalNote(message: m, staffNames: staffNames));
      } else if (m.message.trim().isEmpty) {
        rows.add(_SystemEvent(message: m));
      } else {
        rows.add(_ChatBubble(
          message: m,
          staffNames: staffNames,
          memberName: memberName,
        ));
      }
    }
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: rows,
      ),
    );
  }
}

String _msgTime(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '';
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

/// Non-reply workflow actions worth flagging on a staff bubble; a plain reply
/// or an internal note returns null (handled elsewhere).
String? _actionTag(String action) {
  switch (action) {
    case 'refer_treasurer':
      return 'Referred to treasurer';
    case 'escalate_chairman':
      return 'Escalated to chairman';
    case 'resolve':
      return 'Marked resolved';
    case 'reopen':
      return 'Reopened';
    default:
      return null;
  }
}

String _systemLabel(String action) {
  switch (action) {
    case 'close':
      return 'Complaint closed';
    case 'resolve':
      return 'Marked resolved';
    case 'refer_treasurer':
      return 'Referred to treasurer';
    case 'escalate_chairman':
      return 'Escalated to chairman';
    case 'reopen':
      return 'Complaint reopened';
    default:
      return Fmt.label(action.isEmpty ? 'update' : action);
  }
}

class _DayDivider extends StatelessWidget {
  const _DayDivider({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Text(label,
              style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurfaceVariant)),
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.message,
    required this.staffNames,
    this.memberName,
  });

  final ComplaintMessage message;
  final Map<String, String> staffNames;
  final String? memberName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isMember = message.senderType == 'member';
    final String sender;
    if (isMember) {
      final nm = message.senderName.isNotEmpty
          ? message.senderName
          : (memberName ?? 'Member');
      sender = message.senderCode.isNotEmpty ? '$nm · ${message.senderCode}' : nm;
    } else {
      sender = message.senderRole.isNotEmpty
          ? message.senderRole
          : (message.senderName.isNotEmpty
              ? message.senderName
              : (staffNames[message.senderUserId] ?? 'Staff'));
    }
    final bubbleColor =
        isMember ? scheme.primaryContainer : scheme.surfaceContainerHighest;
    final textColor = isMember ? scheme.onPrimaryContainer : scheme.onSurface;
    final nameColor = isMember ? scheme.onPrimaryContainer : scheme.primary;
    final tag = _actionTag(message.action);
    const round = Radius.circular(14);
    const tail = Radius.circular(3);
    final maxWidth = MediaQuery.of(context).size.width * 0.74;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment:
            isMember ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 7),
                decoration: BoxDecoration(
                  color: bubbleColor,
                  borderRadius: BorderRadius.only(
                    topLeft: round,
                    topRight: round,
                    bottomLeft: isMember ? round : tail,
                    bottomRight: isMember ? tail : round,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(sender,
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: nameColor)),
                    if (tag != null) ...[
                      const SizedBox(height: 2),
                      Text(tag,
                          style: TextStyle(
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                              color: textColor.withValues(alpha: 0.75))),
                    ],
                    const SizedBox(height: 3),
                    Text(message.message,
                        style: TextStyle(color: textColor, height: 1.3)),
                    const SizedBox(height: 3),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(_msgTime(message.createdAt),
                          style: TextStyle(
                              fontSize: 10.5,
                              color: textColor.withValues(alpha: 0.6))),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SystemEvent extends StatelessWidget {
  const _SystemEvent({required this.message});
  final ComplaintMessage message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final time = _msgTime(message.createdAt);
    final label = _systemLabel(message.action);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Text(
            time.isEmpty ? label : '$label · $time',
            style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
          ),
        ),
      ),
    );
  }
}

class _InternalNote extends StatelessWidget {
  const _InternalNote({required this.message, required this.staffNames});
  final ComplaintMessage message;
  final Map<String, String> staffNames;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final bg = dark ? const Color(0xFF2A2312) : const Color(0xFFFFFBEB);
    final border = dark ? const Color(0xFF7A5B12) : const Color(0xFFF59E0B);
    final head = dark ? const Color(0xFFE8C877) : const Color(0xFF92400E);
    final body = dark ? const Color(0xFFEADFC2) : const Color(0xFF5A4A1E);
    final sender = message.senderRole.isNotEmpty
        ? message.senderRole
        : (message.senderName.isNotEmpty
            ? message.senderName
            : (staffNames[message.senderUserId] ?? 'Staff'));
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border.withValues(alpha: 0.6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lock_outline, size: 13, color: head),
                const SizedBox(width: 5),
                Text('Internal note · staff only',
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700, color: head)),
                const Spacer(),
                Text(_msgTime(message.createdAt),
                    style: TextStyle(
                        fontSize: 10.5, color: head.withValues(alpha: 0.7))),
              ],
            ),
            const SizedBox(height: 5),
            Text('$sender: ${message.message}', style: TextStyle(color: body)),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/member_picker.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
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
  _Filter('Transactions', 'transaction'),
  _Filter('Loans', 'loan'),
  _Filter('Support', 'support'),
  _Filter('Messages', 'sacco_message'),
  _Filter('Security', 'security'),
  _Filter('System', 'system'),
];

/// The SACCO's notification activity: what members have been notified about,
/// searchable and filterable by category.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen(
      {super.key, required this.canManage, this.embedded = false});

  final bool canManage;
  final bool embedded;

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _controller = TextEditingController();
  String _query = '';
  int _filter = 0;
  bool _busy = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  IconData _iconFor(String category) {
    switch (category) {
      case 'transaction':
        return Icons.payments_outlined;
      case 'loan':
        return Icons.account_balance_outlined;
      case 'support':
        return Icons.forum_outlined;
      case 'sacco_message':
        return Icons.campaign_outlined;
      case 'security':
        return Icons.shield_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(notificationsFeedProvider(_query));
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: widget.embedded
          ? null
          : AppBar(
              title: const Text('Notifications'),
              actions: [
                if (widget.canManage)
                  IconButton(
                    tooltip: 'Scheduled SMS',
                    icon: const Icon(Icons.schedule_send_outlined),
                    onPressed: _showSchedules,
                  ),
                if (widget.canManage)
                  IconButton(
                    tooltip: 'Send SMS',
                    icon: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.sms_outlined),
                    onPressed: _busy ? null : () => _composeSms(),
                  ),
              ],
            ),
      floatingActionButton: widget.embedded && widget.canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.sms_outlined),
              label: const Text('Send SMS'),
              onPressed: _busy ? null : () => _composeSms(),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => setState(() => _query = v.trim()),
              onChanged: (v) {
                if (v.trim().isEmpty && _query.isNotEmpty) {
                  setState(() => _query = '');
                }
              },
              decoration: InputDecoration(
                hintText: 'Search notifications',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 44,
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
          Expanded(
            child: async.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorRetry(
                message: 'Could not load notifications.',
                detail: '$e',
                onRetry: () => ref.invalidate(notificationsFeedProvider(_query)),
              ),
              data: (all) {
                final match = _filters[_filter].match;
                final rows = match == null
                    ? all
                    : all.where((n) => n.category == match).toList();
                if (rows.isEmpty) {
                  return const EmptyState(
                      icon: Icons.notifications_none_outlined,
                      message: 'No notifications in this view.');
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(notificationsFeedProvider(_query)),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final n = rows[i];
                      return Card(
                        margin: EdgeInsets.zero,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: scheme.primary.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(_iconFor(n.category),
                                    size: 18, color: scheme.primary),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(n.title.isEmpty
                                        ? Fmt.label(n.eventType)
                                        : n.title,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    if (n.body.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(n.body,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: scheme.onSurface)),
                                    ],
                                    const SizedBox(height: 4),
                                    Text(Fmt.dateTime(n.createdAt),
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: scheme.onSurfaceVariant)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _composeSms() async {
    final draft = await showDialog<_SmsDraft>(
      context: context,
      builder: (_) => const _SmsComposeDialog(),
    );
    if (draft == null || draft.message.trim().isEmpty) return;
    final recipientCount = draft.recipientCount;
    if (recipientCount <= 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No recipients selected.')),
        );
      }
      return;
    }
    final segments = _smsSegments(draft.message);
    final requiredCredits = draft.mode == 'account_status'
        ? 0
        : recipientCount * segments;
    final status = ref.read(saccoStatusProvider).asData?.value;
    if (requiredCredits > 0 &&
        status != null &&
        requiredCredits > status.smsBalance) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
            'SMS balance is too low. Required: $requiredCredits, '
            'available: ${status.smsBalance}.',
          ),
        ));
      }
      return;
    }
    if (!mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Send SMS broadcast?',
      message:
          'Send this SMS to $recipientCount member(s). '
          '${draft.mode == 'account_status' ? 'The server will calculate credits for each personalized account message.' : 'Estimated cost is $requiredCredits SMS credit(s)${status == null ? '.' : ', leaving ${status.smsBalance - requiredCredits}.'}'}',
      confirmLabel: 'Send SMS',
      icon: Icons.sms_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      final result = await ref.read(adminRepositoryProvider).sendSmsBroadcast(
            title: draft.title,
            message: draft.message,
            memberIds: draft.allMembers ? const [] : draft.memberIds,
            mode: draft.mode,
            scheduledAt: draft.scheduledAt,
          );
      ref.invalidate(notificationsFeedProvider(_query));
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(result.scheduled
                ? 'SMS scheduled successfully.'
                : 'SMS sent. Balance: ${result.smsBalance} SMS.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showSchedules() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => _SmsSchedulesSheet(
        load: () => ref.read(adminRepositoryProvider).smsSchedules(),
        cancel: (id) async {
          await ref.read(adminRepositoryProvider).cancelSmsSchedule(id);
        },
      ),
    );
  }
}

int _smsSegments(String message) {
  final length = message.trim().length;
  if (length <= 0) return 0;
  if (length <= 160) return 1;
  return ((length + 152) ~/ 153);
}

class _SmsDraft {
  const _SmsDraft({
    required this.title,
    required this.message,
    required this.allMembers,
    required this.memberIds,
    required this.recipientCount,
    required this.mode,
    required this.scheduledAt,
  });

  final String title;
  final String message;
  final bool allMembers;
  final List<String> memberIds;
  final int recipientCount;
  final String mode;
  final DateTime? scheduledAt;
}

class _SmsComposeDialog extends ConsumerStatefulWidget {
  const _SmsComposeDialog();

  @override
  ConsumerState<_SmsComposeDialog> createState() => _SmsComposeDialogState();
}

class _SmsComposeDialogState extends ConsumerState<_SmsComposeDialog> {
  final _title = TextEditingController(text: 'SACCO message');
  final _message = TextEditingController();
  final List<Member> _recipients = [];
  bool _allMembers = true;
  int? _allCount;
  bool _loadingCount = true;
  String? _countError;
  bool _accountStatus = false;
  DateTime? _scheduledAt;

  @override
  void initState() {
    super.initState();
    _loadCount();
  }

  Future<void> _loadCount() async {
    try {
      final c = await ref.read(adminRepositoryProvider).smsRecipientCount();
      if (!mounted) return;
      setState(() {
        _allCount = c;
        _loadingCount = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _countError = '$e';
        _loadingCount = false;
      });
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _addRecipient() async {
    final picked = await showMemberPicker(context, title: 'Add SMS recipient');
    if (picked == null || !mounted) return;
    if (picked.phone.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That member has no phone number.')),
      );
      return;
    }
    if (_recipients.any((m) => m.id == picked.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That member is already a recipient.')),
      );
      return;
    }
    setState(() => _recipients.add(picked));
  }

  void _removeRecipient(String id) {
    setState(() => _recipients.removeWhere((m) => m.id == id));
  }

  Future<void> _pickSchedule() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDate: _scheduledAt ?? now,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
          _scheduledAt ?? now.add(const Duration(minutes: 5))),
    );
    if (time == null) return;
    setState(() => _scheduledAt =
        DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  @override
  Widget build(BuildContext context) {
    final count = _allMembers ? (_allCount ?? 0) : _recipients.length;
    final segments = _smsSegments(_message.text);
    final estimatedCredits = count * segments;
    final canSend = count > 0 &&
        (_accountStatus || _message.text.trim().isNotEmpty);
    return AlertDialog(
      title: const Text('Send SMS'),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _title,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  prefixIcon: Icon(Icons.subject_outlined),
                ),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Personalized account status'),
                subtitle: const Text(
                    'Adds each member’s status, savings and loan balance.'),
                value: _accountStatus,
                onChanged: (value) => setState(() => _accountStatus = value),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _message,
                minLines: 3,
                maxLines: 5,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'SMS message',
                  prefixIcon: Icon(Icons.sms_outlined),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${_message.text.trim().length} characters - '
                  '$segments segment(s) - $estimatedCredits credit(s)',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  _loadingCount
                      ? 'All members with phones (loading...)'
                      : _countError != null
                          ? 'All members with phones'
                          : 'All members with phones (${_allCount ?? 0})',
                ),
                value: _allMembers,
                onChanged: (v) => setState(() => _allMembers = v),
              ),
              if (!_allMembers) ...[
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '${_recipients.length} recipient(s) selected',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                ..._recipients.map((m) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                          m.fullName.isEmpty ? m.membershipNo : m.fullName),
                      subtitle: Text(m.phone),
                      trailing: IconButton(
                        icon: const Icon(Icons.close),
                        tooltip: 'Remove',
                        onPressed: () => _removeRecipient(m.id),
                      ),
                    )),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.person_add_alt_1_outlined),
                    label: const Text('Add recipient'),
                    onPressed: _addRecipient,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.schedule_send_outlined),
                title: Text(_scheduledAt == null
                    ? 'Send now'
                    : 'Scheduled: ${Fmt.dateTime(_scheduledAt!)}'),
                trailing: Wrap(spacing: 4, children: [
                  if (_scheduledAt != null)
                    IconButton(
                      tooltip: 'Clear schedule',
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(() => _scheduledAt = null),
                    ),
                  IconButton(
                    tooltip: 'Choose date and time',
                    icon: const Icon(Icons.edit_calendar_outlined),
                    onPressed: _pickSchedule,
                  ),
                ]),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton.icon(
          onPressed: !canSend
              ? null
              : () => Navigator.of(context).pop(_SmsDraft(
                    title: _title.text.trim(),
                    message: _message.text.trim(),
                    allMembers: _allMembers,
                    memberIds: _recipients.map((m) => m.id).toList(),
                    recipientCount: count,
                    mode: _accountStatus ? 'account_status' : 'custom',
                    scheduledAt: _scheduledAt,
                  )),
          icon: const Icon(Icons.send_outlined),
          label: Text('Send $count'),
        ),
      ],
    );
  }
}

class _SmsSchedulesSheet extends StatefulWidget {
  const _SmsSchedulesSheet({required this.load, required this.cancel});

  final Future<List<SmsSchedule>> Function() load;
  final Future<void> Function(String id) cancel;

  @override
  State<_SmsSchedulesSheet> createState() => _SmsSchedulesSheetState();
}

class _SmsSchedulesSheetState extends State<_SmsSchedulesSheet> {
  late Future<List<SmsSchedule>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.load();
  }

  Future<void> _cancel(SmsSchedule schedule) async {
    await widget.cancel(schedule.id);
    if (mounted) setState(() => _future = widget.load());
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.72,
        child: Column(children: [
          ListTile(
            title: const Text('Scheduled SMS',
                style: TextStyle(fontWeight: FontWeight.w800)),
            trailing: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<SmsSchedule>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return ErrorRetry(
                    message: 'Could not load scheduled SMS.',
                    detail: '${snapshot.error}',
                    onRetry: () => setState(() => _future = widget.load()),
                  );
                }
                final rows = snapshot.data ?? const <SmsSchedule>[];
                if (rows.isEmpty) {
                  return const EmptyState(
                      icon: Icons.schedule_send_outlined,
                      message: 'No SMS has been scheduled.');
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, index) {
                    final row = rows[index];
                    return Card(
                      child: ListTile(
                        title: Text(row.title),
                        subtitle: Text(
                            '${Fmt.label(row.status)} · ${row.scheduledAt == null ? '-' : Fmt.dateTime(row.scheduledAt!)}\n'
                            '${row.estimatedCredits} estimated credit(s)${row.failureReason.isEmpty ? '' : ' · ${row.failureReason}'}'),
                        isThreeLine: true,
                        trailing: row.status == 'scheduled'
                            ? IconButton(
                                tooltip: 'Cancel scheduled SMS',
                                icon: const Icon(Icons.cancel_outlined),
                                onPressed: () => _cancel(row),
                              )
                            : null,
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
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
  const NotificationsScreen({super.key, required this.canManage});

  final bool canManage;

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
    final membersAsync = widget.canManage ? ref.watch(membersProvider('')) : null;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
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
              onPressed: _busy
                  ? null
                  : () => _composeSms(membersAsync?.asData?.value),
            ),
        ],
      ),
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

  Future<void> _composeSms(List<Member>? members) async {
    if (members == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Members are still loading.')));
      return;
    }
    final draft = await showDialog<_SmsDraft>(
      context: context,
      builder: (_) => _SmsComposeDialog(members: members),
    );
    if (draft == null || draft.message.trim().isEmpty) return;
    final membersWithPhones =
        members.where((m) => m.phone.trim().isNotEmpty).toList();
    final recipientCount =
        draft.allMembers ? membersWithPhones.length : draft.memberIds.length;
    final segments = _smsSegments(draft.message);
    final requiredCredits = recipientCount * segments;
    final status = ref.read(saccoStatusProvider).asData?.value;
    if (status != null && requiredCredits > status.smsBalance) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
            'SMS balance is too low. Required: $requiredCredits, '
            'available: ${status.smsBalance}.',
          ),
        ));
      }
      return;
    }
    if (!context.mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Send SMS broadcast?',
      message:
          'Send this SMS to $recipientCount member(s). Estimated cost is '
          '$requiredCredits SMS credit(s)'
          '${status == null ? '.' : ', leaving ${status.smsBalance - requiredCredits}.'}',
      confirmLabel: 'Send SMS',
      icon: Icons.sms_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      final balance = await ref.read(adminRepositoryProvider).sendSmsBroadcast(
            title: draft.title,
            message: draft.message,
            memberIds: draft.allMembers ? const [] : draft.memberIds,
          );
      ref.invalidate(notificationsFeedProvider(_query));
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('SMS sent. Balance: $balance SMS.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
  });

  final String title;
  final String message;
  final bool allMembers;
  final List<String> memberIds;
}

class _SmsComposeDialog extends StatefulWidget {
  const _SmsComposeDialog({required this.members});

  final List<Member> members;

  @override
  State<_SmsComposeDialog> createState() => _SmsComposeDialogState();
}

class _SmsComposeDialogState extends State<_SmsComposeDialog> {
  final _title = TextEditingController(text: 'SACCO message');
  final _message = TextEditingController();
  final Set<String> _selected = {};
  bool _allMembers = true;

  @override
  void dispose() {
    _title.dispose();
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final membersWithPhones =
        widget.members.where((m) => m.phone.trim().isNotEmpty).toList();
    final count = _allMembers ? membersWithPhones.length : _selected.length;
    final segments = _smsSegments(_message.text);
    final estimatedCredits = count * segments;
    final canSend = count > 0 && _message.text.trim().isNotEmpty;
    return AlertDialog(
      title: const Text('Send SMS'),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _title,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  prefixIcon: Icon(Icons.subject_outlined),
                ),
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
                title: Text('All members with phones ($count)'),
                value: _allMembers,
                onChanged: (v) => setState(() => _allMembers = v),
              ),
              if (!_allMembers)
                ...membersWithPhones.map((m) => CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title:
                          Text(m.fullName.isEmpty ? m.membershipNo : m.fullName),
                      subtitle: Text(m.phone),
                      value: _selected.contains(m.id),
                      onChanged: (v) => setState(() {
                        if (v == true) {
                          _selected.add(m.id);
                        } else {
                          _selected.remove(m.id);
                        }
                      }),
                    )),
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
                    memberIds: _selected.toList(),
                  )),
          icon: const Icon(Icons.send_outlined),
          label: Text('Send $count'),
        ),
      ],
    );
  }
}

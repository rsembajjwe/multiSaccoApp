import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
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
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final _controller = TextEditingController();
  String _query = '';
  int _filter = 0;

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
      appBar: AppBar(title: const Text('Notifications')),
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
}

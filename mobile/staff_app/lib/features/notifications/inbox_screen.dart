import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// The signed-in officer's personal notification inbox.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myNotificationsProvider);
    final unread = async.asData?.value.where((n) => !n.isRead).length ?? 0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () async {
                await ref
                    .read(adminRepositoryProvider)
                    .markAllNotificationsRead();
                ref.invalidate(myNotificationsProvider);
              },
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load your notifications.',
          detail: '$e',
          onRetry: () => ref.invalidate(myNotificationsProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const EmptyState(
              icon: Icons.notifications_none_outlined,
              message: 'You have no notifications.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myNotificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _NotificationTile(notification: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.notification});
  final AppNotification notification;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final unread = !notification.isRead;
    return Card(
      margin: EdgeInsets.zero,
      color: unread ? scheme.primary.withValues(alpha: 0.06) : null,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: unread
            ? () async {
                await ref
                    .read(adminRepositoryProvider)
                    .markNotificationRead(notification.id);
                ref.invalidate(myNotificationsProvider);
              }
            : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: unread ? scheme.primary : Colors.transparent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification.title.isEmpty
                          ? Fmt.label(notification.eventType)
                          : notification.title,
                      style: TextStyle(
                        fontWeight:
                            unread ? FontWeight.w700 : FontWeight.w600,
                        fontSize: 14.5,
                      ),
                    ),
                    if (notification.body.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(notification.body,
                          style:
                              const TextStyle(fontSize: 13, height: 1.3)),
                    ],
                    const SizedBox(height: 6),
                    Text(Fmt.dateTime(notification.createdAt),
                        style:
                            TextStyle(fontSize: 11, color: scheme.outline)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

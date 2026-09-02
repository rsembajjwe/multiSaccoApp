import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';

class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    final unread = ref.watch(unreadCountProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          if (unread > 0)
            IconButton(
              tooltip: 'Mark all read',
              icon: const Icon(Icons.done_all),
              onPressed: () async {
                final list =
                    ref.read(notificationsProvider).valueOrNull ?? const [];
                for (final n in list.where((e) => !e.read)) {
                  await ref
                      .read(notificationRepositoryProvider)
                      .acknowledge(n.id);
                }
                ref.invalidate(notificationsProvider);
              },
            ),
        ],
      ),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
            message: 'Could not load your messages.',
            detail: '$e',
            onRetry: () => ref.invalidate(notificationsProvider),
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(notificationsProvider),
          child: items.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 120),
                  Center(child: Text('No messages yet.')),
                ])
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (_, i) => _MessageTile(items[i]),
                ),
        ),
      ),
    );
  }
}

class _MessageTile extends ConsumerWidget {
  const _MessageTile(this.n);

  final MemberNotification n;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final when = n.createdAt == null
        ? ''
        : DateFormat.yMMMd().add_jm().format(n.createdAt!.toLocal());
    return Card(
      child: ListTile(
        leading: Icon(
          n.read ? Icons.mark_email_read_outlined : Icons.mark_email_unread,
          color: n.read ? null : Theme.of(context).colorScheme.primary,
        ),
        title: Text(
          n.title,
          style: TextStyle(fontWeight: n.read ? FontWeight.normal : FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (n.body.isNotEmpty) Text(n.body),
            if (when.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(when, style: Theme.of(context).textTheme.bodySmall),
              ),
          ],
        ),
        isThreeLine: n.body.isNotEmpty,
        onTap: n.read
            ? null
            : () async {
                await ref.read(notificationRepositoryProvider).acknowledge(n.id);
                ref.invalidate(notificationsProvider);
              },
      ),
    );
  }
}

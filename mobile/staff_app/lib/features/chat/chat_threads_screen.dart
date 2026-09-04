import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'chat_thread_screen.dart';

/// Support chat threads members have opened with the SACCO.
class ChatThreadsScreen extends ConsumerWidget {
  const ChatThreadsScreen({super.key, required this.canReply});
  final bool canReply;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(chatThreadsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Support chat')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load chats.',
          detail: '$e',
          onRetry: () => ref.invalidate(chatThreadsProvider),
        ),
        data: (threads) {
          if (threads.isEmpty) {
            return const EmptyState(
                icon: Icons.chat_bubble_outline,
                message: 'No support chats yet.');
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(chatThreadsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: threads.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _ThreadTile(thread: threads[i], canReply: canReply),
            ),
          );
        },
      ),
    );
  }
}

class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread, required this.canReply});
  final ChatThread thread;
  final bool canReply;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => ChatThreadScreen(thread: thread, canReply: canReply))),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: scheme.primaryContainer,
                    child: Icon(Icons.support_agent,
                        color: scheme.onPrimaryContainer),
                  ),
                  if (thread.awaitingReply)
                    Positioned(
                      right: -1,
                      top: -1,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: const Color(0xFFB91C1C),
                          shape: BoxShape.circle,
                          border: Border.all(color: scheme.surface, width: 2),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(thread.subject.isEmpty ? 'Support' : thread.subject,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                        '${thread.memberName.isEmpty ? thread.memberId : thread.memberName}'
                        '${thread.lastMessagePreview.isEmpty ? '' : ' · ${thread.lastMessagePreview}'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(Fmt.date(thread.lastMessageAt),
                      style: TextStyle(
                          fontSize: 11, color: scheme.onSurfaceVariant)),
                  const SizedBox(height: 4),
                  StatusChip(thread.status),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

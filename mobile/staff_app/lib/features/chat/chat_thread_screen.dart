import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// A single support conversation with a reply composer.
class ChatThreadScreen extends ConsumerStatefulWidget {
  const ChatThreadScreen({super.key, required this.thread, required this.canReply});
  final ChatThread thread;
  final bool canReply;

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    // Mark read on open (best-effort).
    Future.microtask(
        () => ref.read(adminRepositoryProvider).markThreadRead(widget.thread.id));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(adminRepositoryProvider)
          .sendChatMessage(widget.thread.id, text);
      _controller.clear();
      ref.invalidate(chatMessagesProvider(widget.thread.id));
      ref.invalidate(chatThreadsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(chatMessagesProvider(widget.thread.id));
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.thread.subject.isEmpty ? 'Support' : widget.thread.subject,
                style: const TextStyle(fontSize: 16)),
            if (widget.thread.memberName.isNotEmpty)
              Text(widget.thread.memberName,
                  style: TextStyle(
                      fontSize: 12,
                      color: scheme.onSurface.withValues(alpha: 0.7))),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => ErrorRetry(
                message: 'Could not load messages.',
                detail: '$e',
                onRetry: () =>
                    ref.invalidate(chatMessagesProvider(widget.thread.id)),
              ),
              data: (messages) {
                if (messages.isEmpty) {
                  return const Center(child: Text('No messages yet.'));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (_, i) => _Bubble(message: messages[i]),
                );
              },
            ),
          ),
          if (widget.canReply)
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
                        textInputAction: TextInputAction.newline,
                        decoration: const InputDecoration(
                          hintText: 'Type a reply',
                          isDense: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _sending ? null : _send,
                      icon: _sending
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text('You can read this conversation but not reply.',
                  style: TextStyle(color: scheme.onSurfaceVariant)),
            ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final staff = message.fromStaff;
    return Align(
      alignment: staff ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: staff ? scheme.primary : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(staff ? 14 : 2),
            bottomRight: Radius.circular(staff ? 2 : 14),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.senderName.isNotEmpty)
              Text(message.senderName,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: staff
                          ? scheme.onPrimary.withValues(alpha: 0.85)
                          : scheme.onSurfaceVariant)),
            if (message.senderName.isNotEmpty) const SizedBox(height: 2),
            Text(message.body,
                style: TextStyle(
                    color: staff ? scheme.onPrimary : scheme.onSurface)),
            const SizedBox(height: 4),
            Text(Fmt.dateTime(message.createdAt),
                style: TextStyle(
                    fontSize: 10,
                    color: staff
                        ? scheme.onPrimary.withValues(alpha: 0.7)
                        : scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

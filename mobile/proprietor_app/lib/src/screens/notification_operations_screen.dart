import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class NotificationOperationsScreen extends ConsumerStatefulWidget {
  const NotificationOperationsScreen({super.key, required this.session});

  final PlatformSession session;

  @override
  ConsumerState<NotificationOperationsScreen> createState() =>
      _NotificationOperationsScreenState();
}

class _NotificationOperationsScreenState
    extends ConsumerState<NotificationOperationsScreen> {
  String _status = 'all';
  String _channel = 'all';
  String? _retryingId;

  @override
  Widget build(BuildContext context) {
    final providers = ref.watch(notificationProviderStatusProvider);
    final deliveries = ref.watch(notificationDeliveriesProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification operations'),
        actions: [
          IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Provider health',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            providers.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => _ErrorCard('$error'),
              data: (items) => items.isEmpty
                  ? const _ErrorCard('No provider status is available.')
                  : Column(
                      children: items
                          .map(
                            (provider) => Card(
                              child: ListTile(
                                leading: Icon(
                                  provider.isReady
                                      ? Icons.check_circle
                                      : Icons.error,
                                  color: provider.isReady
                                      ? Colors.green
                                      : Colors.red,
                                ),
                                title: Text(
                                  '${label(provider.channel)} - ${provider.provider}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                subtitle: Text(
                                  provider.balance.isEmpty
                                      ? provider.message
                                      : '${provider.message}\nBalance: ${provider.balance}',
                                ),
                                isThreeLine: provider.balance.isNotEmpty,
                                trailing: StatusPill(provider.status),
                              ),
                            ),
                          )
                          .toList(),
                    ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Campaign and delivery history',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All')),
                      DropdownMenuItem(value: 'sent', child: Text('Sent')),
                      DropdownMenuItem(value: 'failed', child: Text('Failed')),
                    ],
                    onChanged: (value) =>
                        setState(() => _status = value ?? 'all'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _channel,
                    decoration: const InputDecoration(labelText: 'Channel'),
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All')),
                      DropdownMenuItem(value: 'sms', child: Text('SMS')),
                      DropdownMenuItem(value: 'email', child: Text('Email')),
                      DropdownMenuItem(value: 'in_app', child: Text('In-app')),
                      DropdownMenuItem(value: 'push', child: Text('Push')),
                    ],
                    onChanged: (value) =>
                        setState(() => _channel = value ?? 'all'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            deliveries.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _ErrorCard('$error'),
              data: (page) {
                final items = page.items
                    .where(
                      (item) =>
                          (_status == 'all' || item.status == _status) &&
                          (_channel == 'all' || item.channel == _channel),
                    )
                    .toList();
                if (items.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('No deliveries match these filters.'),
                    ),
                  );
                }
                return Column(children: items.map(_deliveryCard).toList());
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _deliveryCard(NotificationDeliveryItem item) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.title.isEmpty ? label(item.eventType) : item.title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              StatusPill(item.status),
            ],
          ),
          const SizedBox(height: 6),
          Text(item.message, maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          Text(
            '${item.tenantId} - ${label(item.channel)} via ${item.provider}',
          ),
          Text(item.recipient),
          if (item.createdAt != null)
            Text(
              DateFormat(
                'dd MMM yyyy, HH:mm',
              ).format(item.createdAt!.toLocal()),
            ),
          if (item.failed && widget.session.can('notifications:manage')) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: _retryingId == item.id ? null : () => _retry(item),
                icon: _retryingId == item.id
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.replay),
                label: const Text('Retry delivery'),
              ),
            ),
          ],
        ],
      ),
    ),
  );

  Future<void> _refresh() async {
    ref.invalidate(notificationProviderStatusProvider);
    ref.invalidate(notificationDeliveriesProvider);
    await Future.wait([
      ref.read(notificationProviderStatusProvider.future),
      ref.read(notificationDeliveriesProvider.future),
    ]);
  }

  Future<void> _retry(NotificationDeliveryItem item) async {
    setState(() => _retryingId = item.id);
    try {
      await ref
          .read(platformRepositoryProvider)
          .retryNotificationDelivery(item.id);
      ref.invalidate(notificationDeliveriesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Delivery retry submitted.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _retryingId = null);
    }
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard(this.message);
  final String message;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: const EdgeInsets.all(16), child: Text(message)),
  );
}

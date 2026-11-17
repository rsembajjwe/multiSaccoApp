import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models.dart';
import '../providers.dart';
import '../widgets.dart';

class SmsBroadcastScreen extends ConsumerStatefulWidget {
  const SmsBroadcastScreen({super.key});

  @override
  ConsumerState<SmsBroadcastScreen> createState() => _SmsBroadcastScreenState();
}

class _SmsBroadcastScreenState extends ConsumerState<SmsBroadcastScreen> {
  final _title = TextEditingController(text: 'Tereka platform update');
  final _message = TextEditingController();
  final Set<String> _selectedTenantIds = {};
  bool _allSaccos = true;
  bool _sending = false;
  PlatformSmsBroadcastResult? _result;

  @override
  void dispose() {
    _title.dispose();
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenants = ref.watch(smsBroadcastTenantsProvider);
    final providerStatuses = ref.watch(notificationProviderStatusProvider);
    NotificationProviderStatus? smsProvider;
    providerStatuses.whenData((statuses) {
      smsProvider = _smsProvider(statuses);
    });
    final messageLength = _message.text.length;
    final segments = messageLength == 0
        ? 0
        : math.max(1, (messageLength / 160).ceil());
    return Scaffold(
      appBar: AppBar(title: const Text('Message SACCOs')),
      body: AsyncPane(
        value: tenants,
        onRetry: () => ref.invalidate(smsBroadcastTenantsProvider),
        builder: (page) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Recipients',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _allSaccos,
                      title: const Text('All SACCOs'),
                      subtitle: Text(
                        '${page.total} SACCOs in the current portfolio',
                      ),
                      onChanged: (value) => setState(() => _allSaccos = value),
                    ),
                    if (!_allSaccos)
                      ...page.items.map(
                        (tenant) => CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: _selectedTenantIds.contains(tenant.id),
                          title: Text(tenant.name),
                          subtitle: Text('${tenant.code} - ${tenant.district}'),
                          onChanged: (checked) => setState(() {
                            if (checked == true) {
                              _selectedTenantIds.add(tenant.id);
                            } else {
                              _selectedTenantIds.remove(tenant.id);
                            }
                          }),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            providerStatuses.when(
              loading: () => const Card(
                child: ListTile(
                  leading: CircularProgressIndicator(),
                  title: Text('Checking SMS provider'),
                ),
              ),
              error: (error, _) => Card(
                child: ListTile(
                  leading: const Icon(Icons.warning_amber_rounded),
                  title: const Text('SMS provider status unavailable'),
                  subtitle: Text('$error'),
                ),
              ),
              data: (statuses) {
                final sms = _smsProvider(statuses);
                return Card(
                  child: ListTile(
                    leading: Icon(
                      sms?.isReady == true
                          ? Icons.check_circle_outline
                          : Icons.error_outline,
                    ),
                    title: Text(
                      sms?.isReady == true
                          ? 'SMS provider ready'
                          : 'SMS sending unavailable',
                    ),
                    subtitle: Text(
                      sms == null
                          ? 'No SMS provider is configured on the online backend. Configure the provider before broadcasting.'
                          : '${sms.provider}: ${sms.message}${sms.balance.isEmpty ? '' : ' Balance: ${sms.balance}'}',
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextField(
                      controller: _title,
                      maxLength: 80,
                      decoration: const InputDecoration(
                        labelText: 'Message title',
                      ),
                    ),
                    TextField(
                      controller: _message,
                      minLines: 4,
                      maxLines: 8,
                      maxLength: 480,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        labelText: 'SMS message',
                        alignLabelWithHint: true,
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '$segments SMS segment${segments == 1 ? '' : 's'} per verified recipient. Proprietor broadcasts do not debit SACCO SMS wallets.',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_result != null) ...[
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Delivery result',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text('${_result!.sent} sent, ${_result!.failed} failed'),
                      Text(
                        '${_result!.saccosReached} of ${_result!.saccosSelected} SACCOs had verified leadership phones',
                      ),
                      Text(
                        '${_result!.providerSmsUnits} provider SMS units used',
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: _sending || smsProvider?.isReady != true
                  ? null
                  : _send,
              icon: _sending
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send),
              label: Text(_sending ? 'Sending...' : 'Send SMS'),
            ),
          ],
        ),
      ),
    );
  }

  NotificationProviderStatus? _smsProvider(
    List<NotificationProviderStatus> statuses,
  ) {
    for (final status in statuses) {
      if (status.channel.toLowerCase() == 'sms') return status;
    }
    return null;
  }

  Future<void> _send() async {
    final message = _message.text.trim();
    if (message.isEmpty || (!_allSaccos && _selectedTenantIds.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter a message and select at least one SACCO.'),
        ),
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Send proprietor SMS?'),
        content: Text(
          _allSaccos
              ? 'This will send to verified leadership phones in every SACCO.'
              : 'This will send to verified leadership phones in ${_selectedTenantIds.length} selected SACCO(s).',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Send'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _sending = true);
    try {
      final result = await ref
          .read(platformRepositoryProvider)
          .sendPlatformSmsBroadcast(
            allSaccos: _allSaccos,
            tenantIds: _selectedTenantIds.toList(),
            title: _title.text.trim(),
            message: message,
          );
      if (mounted) setState(() => _result = result);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

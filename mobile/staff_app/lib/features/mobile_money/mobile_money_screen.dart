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
  _Filter('Pending', 'pending'),
  _Filter('Posted', 'posted'),
  _Filter('Failed', 'failed'),
  _Filter('Expired', 'expired'),
  _Filter('Cancelled', 'cancelled'),
];

/// Staff view of mobile-money requests and provider status.
class MobileMoneyScreen extends ConsumerStatefulWidget {
  const MobileMoneyScreen(
      {super.key, required this.canManage, this.embedded = false});
  final bool canManage;
  final bool embedded;

  @override
  ConsumerState<MobileMoneyScreen> createState() => _MobileMoneyScreenState();
}

class _MobileMoneyScreenState extends ConsumerState<MobileMoneyScreen> {
  int _filter = 0;
  String? _busyRequestId;

  Future<void> _refreshProvider(MobileMoneyPaymentRequest request) async {
    setState(() => _busyRequestId = request.id);
    try {
      await ref
          .read(adminRepositoryProvider)
          .refreshMobileMoneyProviderStatus(request.id);
      ref.invalidate(mobileMoneyPaymentRequestsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Provider status refreshed.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busyRequestId = null);
    }
  }

  Future<void> _closeRequest(
      MobileMoneyPaymentRequest request, String status) async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => _CloseRequestDialog(status: status),
    );
    if (reason == null) return;
    if (!mounted) return;
    final confirmed = await confirmAction(
      context,
      title: 'Mark request ${Fmt.label(status)}?',
      message:
          'This will close ${request.externalReference.isEmpty ? 'this mobile-money request' : request.externalReference} as ${Fmt.label(status)}. Use this only after reconciliation confirms the payment will not be posted.',
      confirmLabel: 'Mark ${Fmt.label(status)}',
      icon: Icons.fact_check_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busyRequestId = request.id);
    try {
      await ref
          .read(adminRepositoryProvider)
          .updateMobileMoneyPaymentRequestStatus(
            request.id,
            status,
            reason: reason,
          );
      ref.invalidate(mobileMoneyPaymentRequestsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment request marked $status.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busyRequestId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mobileMoneyPaymentRequestsProvider);
    const tabs = TabBar(
      tabs: [
        Tab(text: 'Requests'),
        Tab(text: 'Callbacks'),
        Tab(text: 'Balances'),
      ],
    );
    final views = <Widget>[
            Column(
              children: [
                SizedBox(
                  height: 52,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
                      message: 'Could not load mobile-money requests.',
                      detail: '$e',
                      onRetry: () =>
                          ref.invalidate(mobileMoneyPaymentRequestsProvider),
                    ),
                    data: (all) {
                      final match = _filters[_filter].match;
                      final rows = match == null
                          ? all
                          : all
                              .where((r) =>
                                  r.status.toLowerCase().contains(match))
                              .toList();
                      if (rows.isEmpty) {
                        return const EmptyState(
                          icon: Icons.phone_android_outlined,
                          message: 'No mobile-money requests in this view.',
                        );
                      }
                      return RefreshIndicator(
                        onRefresh: () async =>
                            ref.invalidate(mobileMoneyPaymentRequestsProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                          itemCount: rows.length + 1,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            if (i == 0) return _Summary(rows: rows);
                            final request = rows[i - 1];
                            return _RequestTile(
                              request: request,
                              busy: _busyRequestId == request.id,
                              canManage: widget.canManage,
                              onRefreshProvider: () =>
                                  _refreshProvider(request),
                              onClose: (status) =>
                                  _closeRequest(request, status),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            const _CallbacksTab(),
            const _BalancesTab(),
    ];
    if (widget.embedded) {
      return DefaultTabController(
        length: 3,
        child: Column(
          children: [
            tabs,
            Expanded(child: TabBarView(children: views)),
          ],
        ),
      );
    }
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Mobile Money'),
          bottom: tabs,
        ),
        body: TabBarView(children: views),
      ),
    );
  }
}

class _CallbacksTab extends ConsumerStatefulWidget {
  const _CallbacksTab();

  @override
  ConsumerState<_CallbacksTab> createState() => _CallbacksTabState();
}

class _CallbacksTabState extends ConsumerState<_CallbacksTab> {
  int _filter = 0;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mobileMoneyCallbacksProvider);
    return Column(
      children: [
        SizedBox(
          height: 52,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
              message: 'Could not load mobile-money callbacks.',
              detail: '$e',
              onRetry: () => ref.invalidate(mobileMoneyCallbacksProvider),
            ),
            data: (all) {
              final match = _filters[_filter].match;
              final rows = match == null
                  ? all
                  : all
                      .where((c) => c.status.toLowerCase().contains(match))
                      .toList();
              if (rows.isEmpty) {
                return const EmptyState(
                  icon: Icons.receipt_long_outlined,
                  message: 'No mobile-money callbacks in this view.',
                );
              }
              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(mobileMoneyCallbacksProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: rows.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    if (i == 0) return _CallbackSummary(rows: rows);
                    return _CallbackTile(callback: rows[i - 1]);
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CallbackSummary extends StatelessWidget {
  const _CallbackSummary({required this.rows});
  final List<MobileMoneyCallback> rows;

  @override
  Widget build(BuildContext context) {
    final total = rows.fold<num>(0, (sum, row) => sum + row.amount);
    final pending = rows
        .where((row) => row.status.toLowerCase().contains('pending'))
        .length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        '${rows.length} callback(s) - ${Fmt.money(total)} - $pending pending',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}

class _CallbackTile extends StatelessWidget {
  const _CallbackTile({required this.callback});
  final MobileMoneyCallback callback;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => showModalBottomSheet<void>(
          context: context,
          showDragHandle: true,
          builder: (_) => _CallbackDetailSheet(callback: callback),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: scheme.secondary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.receipt_long_outlined,
                        color: scheme.secondary, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          callback.externalReference.isEmpty
                              ? Fmt.label(callback.purpose)
                              : callback.externalReference,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${Fmt.label(callback.purpose)} - ${Fmt.label(callback.provider)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        Fmt.money(callback.amount),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      StatusChip(callback.status),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      callback.accountLabel.isEmpty
                          ? 'No collection account matched'
                          : callback.accountLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (callback.duplicate)
                    const Padding(
                      padding: EdgeInsets.only(left: 8),
                      child: StatusChip('duplicate'),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                Fmt.dateTime(callback.receivedAt),
                style: TextStyle(
                  fontSize: 11,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CallbackDetailSheet extends StatelessWidget {
  const _CallbackDetailSheet({required this.callback});
  final MobileMoneyCallback callback;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Text('Provider callback',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          KeyValueRow('Reference', callback.externalReference),
          KeyValueRow('Provider', Fmt.label(callback.provider)),
          KeyValueRow('Purpose', Fmt.label(callback.purpose)),
          KeyValueRow('Amount', Fmt.money(callback.amount), emphasize: true),
          KeyValueRow('Status', Fmt.label(callback.status)),
          KeyValueRow('Received', Fmt.dateTime(callback.receivedAt)),
          if (callback.resourceType.isNotEmpty)
            KeyValueRow('Resource', Fmt.label(callback.resourceType)),
          if (callback.resourceId.isNotEmpty)
            KeyValueRow('Resource ID', callback.resourceId),
          if (callback.collectionAccount.isNotEmpty)
            KeyValueRow('Collection account', callback.collectionAccount),
          if (callback.suggestedCollectionAccount.isNotEmpty)
            KeyValueRow(
              'Suggested account',
              callback.suggestedCollectionAccount,
            ),
          if (callback.duplicate) const KeyValueRow('Duplicate', 'Yes'),
        ],
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.rows});
  final List<MobileMoneyPaymentRequest> rows;

  @override
  Widget build(BuildContext context) {
    final total = rows.fold<num>(0, (sum, row) => sum + row.amount);
    final pending = rows
        .where((row) => row.status.toLowerCase().contains('pending'))
        .length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        '${rows.length} request(s) - ${Fmt.money(total)} - $pending pending',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({
    required this.request,
    required this.busy,
    required this.canManage,
    required this.onRefreshProvider,
    required this.onClose,
  });

  final MobileMoneyPaymentRequest request;
  final bool busy;
  final bool canManage;
  final VoidCallback onRefreshProvider;
  final ValueChanged<String> onClose;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final stale = _isStalePending(request);
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => showModalBottomSheet<void>(
          context: context,
          showDragHandle: true,
          builder: (_) => _RequestDetailSheet(request: request),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.phone_android_outlined,
                        color: scheme.primary, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          request.externalReference.isEmpty
                              ? Fmt.label(request.purpose)
                              : request.externalReference,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${Fmt.label(request.purpose)} - ${Fmt.label(request.provider)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        Fmt.money(request.amount),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      StatusChip(request.status),
                    ],
                  ),
                ],
              ),
              if (request.statusMessage.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  request.statusMessage,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: scheme.onSurface),
                ),
              ],
              if (stale) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.timer_off_outlined,
                        size: 16, color: Color(0xFFB45309)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Pending for more than 15 minutes. Refresh provider '
                        'status or reconcile before closing.',
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      Fmt.dateTime(request.requestedAt),
                      style: TextStyle(
                        fontSize: 11,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (busy)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else ...[
                    IconButton(
                      tooltip: 'Refresh provider status',
                      onPressed:
                          request.canRefresh ? onRefreshProvider : null,
                      icon: const Icon(Icons.sync_outlined),
                    ),
                    if (canManage && request.canCloseManually)
                      PopupMenuButton<String>(
                        tooltip: 'Mark request',
                        onSelected: onClose,
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                            value: 'failed',
                            child: Text('Mark failed'),
                          ),
                          PopupMenuItem(
                            value: 'expired',
                            child: Text('Mark expired'),
                          ),
                          PopupMenuItem(
                            value: 'cancelled',
                            child: Text('Mark cancelled'),
                          ),
                        ],
                      ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool _isStalePending(MobileMoneyPaymentRequest request) {
    if (!request.status.toLowerCase().contains('pending')) return false;
    final requestedAt = DateTime.tryParse(request.requestedAt);
    if (requestedAt == null) return false;
    return DateTime.now().difference(requestedAt.toLocal()) >
        const Duration(minutes: 15);
  }
}

class _RequestDetailSheet extends StatelessWidget {
  const _RequestDetailSheet({required this.request});
  final MobileMoneyPaymentRequest request;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Text('Payment request',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          KeyValueRow('Reference', request.externalReference),
          KeyValueRow('Provider', Fmt.label(request.provider)),
          KeyValueRow('Provider reference', request.providerReference),
          KeyValueRow('Purpose', Fmt.label(request.purpose)),
          KeyValueRow('Phone', request.payerPhone),
          KeyValueRow('Amount', Fmt.money(request.amount), emphasize: true),
          KeyValueRow('Status', Fmt.label(request.status)),
          KeyValueRow('Requested', Fmt.dateTime(request.requestedAt)),
          if (request.completedAt.isNotEmpty)
            KeyValueRow('Completed', Fmt.dateTime(request.completedAt)),
          if (request.statusMessage.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Status message',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(request.statusMessage),
          ],
          if (request.checkoutPrompt.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Checkout prompt',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(request.checkoutPrompt),
          ],
        ],
      ),
    );
  }
}

class _CloseRequestDialog extends StatefulWidget {
  const _CloseRequestDialog({required this.status});
  final String status;

  @override
  State<_CloseRequestDialog> createState() => _CloseRequestDialogState();
}

class _CloseRequestDialogState extends State<_CloseRequestDialog> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Mark ${Fmt.label(widget.status)}'),
      content: Form(
        key: _formKey,
        child: TextFormField(
          controller: _controller,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Reason',
            hintText: 'Add the reason recorded during reconciliation',
          ),
          validator: (v) => v == null || v.trim().length < 8
              ? 'Enter a clear reconciliation reason.'
              : null,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, _controller.text.trim());
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}


/// Live MTN / Airtel account (float) balances for configured providers.
/// Added alongside Codex's mobile-money screen (with consent).
class _BalancesTab extends ConsumerWidget {
  const _BalancesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mobileMoneyBalancesProvider);
    return async.when(
      loading: () => const ListSkeleton(),
      error: (e, _) => ErrorRetry(
        message: 'Could not load provider balances.',
        detail: '$e',
        onRetry: () => ref.invalidate(mobileMoneyBalancesProvider),
      ),
      data: (balances) {
        // Always surface both networks (MTN & Airtel), even before a provider
        // is configured, so the treasurer sees them here.
        const known = <MapEntry<String, String>>[
          MapEntry('mtn_momo', 'MTN MoMo'),
          MapEntry('airtel_money', 'Airtel Money'),
        ];
        final display = <MobileMoneyBalance>[];
        for (final k in known) {
          MobileMoneyBalance? match;
          for (final b in balances) {
            if (b.providerId == k.key) {
              match = b;
              break;
            }
          }
          display.add(match ??
              MobileMoneyBalance(
                providerId: k.key,
                label: k.value,
                available: false,
                message: 'Not configured for this SACCO yet.',
              ));
        }
        for (final b in balances) {
          if (b.providerId != 'mtn_momo' && b.providerId != 'airtel_money') {
            display.add(b);
          }
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(mobileMoneyBalancesProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: display.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _BalanceCard(balance: display[i]),
          ),
        );
      },
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.balance});
  final MobileMoneyBalance balance;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ok = balance.available && balance.balance != null;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.phone_android_outlined,
                  color: scheme.primary, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(balance.label,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 4),
                  if (ok)
                    Text(
                      '${balance.currency ?? ''} ${Fmt.number(balance.balance)}'
                          .trim(),
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w800),
                    )
                  else
                    Text(
                      balance.message ?? 'Balance unavailable.',
                      style: TextStyle(fontSize: 12.5, color: scheme.error),
                    ),
                  if (balance.checkedAt != null && ok) ...[
                    const SizedBox(height: 2),
                    Text('As of ${Fmt.dateTime(balance.checkedAt)}',
                        style:
                            TextStyle(fontSize: 11, color: scheme.outline)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

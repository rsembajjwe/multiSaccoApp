import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import 'payment_status_sheet.dart';
import 'mobile_money_network_selector.dart';

final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class PaymentsScreen extends ConsumerWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(paymentHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Payments')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => openPaymentSheet(context),
        icon: const Icon(Icons.smartphone),
        label: const Text('Pay'),
      ),
      body: history.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load payments.',
          detail: '$e',
          onRetry: () => ref.invalidate(paymentHistoryProvider),
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(paymentHistoryProvider),
          child: items.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 120),
                    Center(child: Text('No payments yet. Tap Pay to start.')),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => _PaymentTile(
                    items[i],
                    onRefresh: () async {
                      try {
                        await ref
                            .read(paymentRepositoryProvider)
                            .statusOf(items[i].id);
                        ref.invalidate(paymentHistoryProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Status checked.')),
                          );
                        }
                      } catch (error) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Could not check status: $error'),
                            ),
                          );
                        }
                      }
                    },
                  ),
                ),
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile(this.p, {required this.onRefresh});

  final MobileMoneyPayment p;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final when = p.createdAt == null
        ? ''
        : DateFormat.yMMMd().add_jm().format(p.createdAt!.toLocal());
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    _money.format(p.amount),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: colors.secondaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      paymentStatusLabel(
                        p.status,
                        provider: p.provider,
                        createdAt: p.createdAt,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: colors.onSecondaryContainer,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              paymentPurposeLabel(p.purpose),
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 12,
              runSpacing: 6,
              children: [
                if (p.provider != null && p.provider!.isNotEmpty)
                  _PaymentDetail(
                    icon: Icons.smartphone_outlined,
                    label: _providerLabel(p.provider!),
                  ),
                if (when.isNotEmpty)
                  _PaymentDetail(
                    icon: Icons.schedule_outlined,
                    label: when,
                  ),
              ],
            ),
            if (paymentNeedsStatusCheck(
              p.status,
              createdAt: p.createdAt,
            )) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Check status'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PaymentDetail extends StatelessWidget {
  const _PaymentDetail({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      );
}

String paymentPurposeLabel(String purpose) {
  for (final option in PaymentPurpose.values) {
    if (option.value == purpose) return option.label;
  }
  return _sentenceCase(purpose);
}

String paymentStatusLabel(
  String status, {
  String? provider,
  DateTime? createdAt,
  DateTime? now,
}) {
  final providerName = _providerLabel(provider ?? 'provider');
  switch (status.toLowerCase()) {
    case 'pending_provider_callback':
    case 'pending_provider_confirmation':
      if (paymentConfirmationIsDelayed(
        status,
        createdAt: createdAt,
        now: now,
      )) {
        return '$providerName confirmation delayed';
      }
      if (_paymentAge(createdAt, now: now) >= const Duration(minutes: 2)) {
        return 'Still waiting for $providerName';
      }
      return 'Waiting for $providerName';
    case 'posted':
    case 'completed':
    case 'successful':
      return 'Completed';
    case 'paid_pending_callback':
      return '$providerName confirmed - credit pending';
    default:
      return _sentenceCase(status);
  }
}

bool paymentConfirmationIsDelayed(
  String status, {
  DateTime? createdAt,
  DateTime? now,
}) {
  final normalized = status.toLowerCase();
  final pending = normalized == 'pending_provider_callback' ||
      normalized == 'pending_provider_confirmation';
  return pending &&
      _paymentAge(createdAt, now: now) >= const Duration(minutes: 10);
}

bool paymentNeedsStatusCheck(
  String status, {
  DateTime? createdAt,
  DateTime? now,
}) {
  if (status.toLowerCase() == 'paid_pending_callback') return true;
  return paymentConfirmationIsDelayed(
    status,
    createdAt: createdAt,
    now: now,
  );
}

Duration _paymentAge(DateTime? createdAt, {DateTime? now}) {
  if (createdAt == null) return Duration.zero;
  final elapsed = (now ?? DateTime.now()).difference(createdAt);
  return elapsed.isNegative ? Duration.zero : elapsed;
}

String _sentenceCase(String value) {
  final words = value.trim().replaceAll('_', ' ');
  if (words.isEmpty) return 'Unknown';
  return '${words[0].toUpperCase()}${words.substring(1).toLowerCase()}';
}

String _providerLabel(String provider) {
  final normalized = provider.toLowerCase();
  if (normalized.contains('airtel')) return 'Airtel';
  if (normalized.contains('mtn') || normalized.contains('momo')) return 'MTN';
  return provider;
}

Future<void> openPaymentSheet(BuildContext context,
    {PaymentPurpose? initialPurpose}) async {
  final payment = await showModalBottomSheet<MobileMoneyPayment>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: _PayForm(initialPurpose: initialPurpose),
    ),
  );
  if (payment != null && context.mounted) {
    await showPaymentStatus(
      context,
      payment.id,
      payment.amount,
      provider: payment.provider,
    );
  }
}

class _PayForm extends ConsumerStatefulWidget {
  const _PayForm({this.initialPurpose});
  final PaymentPurpose? initialPurpose;
  @override
  ConsumerState<_PayForm> createState() => _PayFormState();
}

class _PayFormState extends ConsumerState<_PayForm> {
  late PaymentPurpose _purpose =
      widget.initialPurpose ?? PaymentPurpose.savings;
  MobileMoneyNetwork _network = MobileMoneyNetwork.mtn;
  Loan? _loan;
  final _amount = TextEditingController();
  final _phone = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = num.tryParse(_amount.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount.');
      return;
    }
    if (_purpose == PaymentPurpose.loanRepayment && _loan == null) {
      setState(() => _error = 'Choose the loan to repay.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payment = await ref.read(paymentRepositoryProvider).request(
            purpose: _purpose,
            amount: amount,
            network: _network,
            payerPhone: _phone.text.trim(),
            loanId: _purpose == PaymentPurpose.loanRepayment ? _loan?.id : null,
          );
      ref.invalidate(paymentHistoryProvider);
      if (mounted) Navigator.of(context).pop(payment);
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loans = ref.watch(loansProvider);
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Mobile money payment',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          MobileMoneyNetworkSelector(
            value: _network,
            onChanged: (network) => setState(() => _network = network),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<PaymentPurpose>(
            initialValue: _purpose,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Purpose'),
            items: PaymentPurpose.values
                .map((p) => DropdownMenuItem(value: p, child: Text(p.label)))
                .toList(),
            onChanged: (p) => setState(() => _purpose = p ?? _purpose),
          ),
          if (_purpose == PaymentPurpose.loanRepayment) ...[
            const SizedBox(height: 12),
            loans.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => const Text('Could not load loans.'),
              data: (items) => DropdownButtonFormField<Loan>(
                initialValue: _loan,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Loan to repay'),
                items: items
                    .map((l) => DropdownMenuItem(
                        value: l,
                        child:
                            Text('${l.product} — ${_money.format(l.balance)}')))
                    .toList(),
                onChanged: (l) => setState(() => _loan = l),
              ),
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Amount (UGX)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile money number (optional)',
              helperText: 'Leave blank to use your registered number',
            ),
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Text(_error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Request payment'),
          ),
        ],
      ),
    );
  }
}

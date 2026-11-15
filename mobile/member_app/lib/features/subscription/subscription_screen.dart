import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/error_retry.dart';
import '../payments/payment_status_sheet.dart';
import '../payments/mobile_money_network_selector.dart';

final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(membershipProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Member app subscription')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(
          message: 'Could not load your subscription.',
          detail: '$e',
          onRetry: () => ref.invalidate(membershipProvider),
        ),
        data: (sub) {
          if (sub == null) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                    'No member-app subscription is available. Contact your SACCO office.',
                    textAlign: TextAlign.center),
              ),
            );
          }
          final active = sub.status == 'active' &&
              sub.expiry != null &&
              !sub.expiry!.isBefore(DateTime.now());
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(membershipProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(sub.planName,
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        _row('Status', sub.status),
                        _row('Billing', 'Annual — SACCO cycle'),
                        _row('Amount', _money.format(sub.amount)),
                        _row('Paid', _money.format(sub.paid)),
                        _row('Balance due', _money.format(sub.balanceDue)),
                        if (sub.expiry != null)
                          _row('Expires',
                              DateFormat('d MMM y').format(sub.expiry!)),
                        if (sub.daysToExpiry != null)
                          _row('Days to expiry', '${sub.daysToExpiry}'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (!active && sub.balanceDue > 0)
                  FilledButton.icon(
                    onPressed: () => _openPaySheet(context, ref, sub),
                    icon: const Icon(Icons.payments_outlined),
                    label: Text(
                        'Pay annual access (${_money.format(sub.balanceDue)})'),
                  )
                else if (active)
                  Column(
                    children: [
                      const Card(
                        child: ListTile(
                          leading:
                              Icon(Icons.check_circle, color: Colors.green),
                          title:
                              Text('Your member-app subscription is active.'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () => context.go('/home'),
                        icon: const Icon(Icons.arrow_forward),
                        label: const Text('Continue to member app'),
                      ),
                    ],
                  )
                else
                  const Card(
                    child: ListTile(
                      leading: Icon(Icons.info_outline),
                      title: Text('SACCO staff subscription renewal required.'),
                      subtitle: Text(
                          'Contact your SACCO office before renewing member-app access.'),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );

  Future<void> _openPaySheet(
      BuildContext context, WidgetRef ref, MemberSubscription sub) async {
    final payment = await showModalBottomSheet<MobileMoneyPayment>(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding:
            EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: _PayDuesForm(balanceDue: sub.balanceDue),
      ),
    );
    if (payment != null && context.mounted) {
      ref.invalidate(membershipProvider);
      await showPaymentStatus(
        context,
        payment.id,
        payment.amount,
        provider: payment.provider,
      );
    }
  }
}

class _PayDuesForm extends ConsumerStatefulWidget {
  const _PayDuesForm({required this.balanceDue});
  final num balanceDue;

  @override
  ConsumerState<_PayDuesForm> createState() => _PayDuesFormState();
}

class _PayDuesFormState extends ConsumerState<_PayDuesForm> {
  MobileMoneyNetwork _network = MobileMoneyNetwork.mtn;
  late final TextEditingController _amount =
      TextEditingController(text: widget.balanceDue.toStringAsFixed(0));
  final TextEditingController _phone = TextEditingController();
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
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payment = await ref.read(paymentRepositoryProvider).request(
            purpose: PaymentPurpose.membershipDues,
            amount: amount,
            network: _network,
            payerPhone: _phone.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop(payment);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Pay member app annual access',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          MobileMoneyNetworkSelector(
            value: _network,
            onChanged: (network) => setState(() => _network = network),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Amount (UGX)', prefixText: 'UGX '),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile-money phone (optional)',
              hintText: 'Defaults to your registered number',
            ),
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Text(_error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Send payment prompt'),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import 'payment_status_sheet.dart';

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
                  itemBuilder: (_, i) => _PaymentTile(items[i]),
                ),
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile(this.p);
  final MobileMoneyPayment p;

  @override
  Widget build(BuildContext context) {
    final when = p.createdAt == null
        ? ''
        : DateFormat.yMMMd().add_jm().format(p.createdAt!.toLocal());
    return Card(
      child: ListTile(
        title: Text(_money.format(p.amount)),
        subtitle: Text([p.purpose, if (when.isNotEmpty) when].join('  •  ')),
        trailing: Chip(label: Text(p.status)),
      ),
    );
  }
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
    await showPaymentStatus(context, payment.id, payment.amount);
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
            payerPhone: _phone.text.trim(),
            loanId: _purpose == PaymentPurpose.loanRepayment ? _loan?.id : null,
          );
      ref.invalidate(paymentHistoryProvider);
      if (mounted) Navigator.of(context).pop(payment);
    } catch (_) {
      setState(() => _error = 'Could not start the payment. Try again.');
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
                        value: l, child: Text('${l.product} — ${_money.format(l.balance)}')))
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

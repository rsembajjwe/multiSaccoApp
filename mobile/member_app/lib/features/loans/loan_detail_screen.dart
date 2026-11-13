import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../payments/payment_status_sheet.dart';
import '../payments/mobile_money_network_selector.dart';

final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

class LoanDetailScreen extends ConsumerWidget {
  const LoanDetailScreen({super.key, required this.loan});
  final Loan loan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repayments = ref.watch(loanRepaymentsProvider(loan.id));
    return Scaffold(
      appBar: AppBar(title: Text(loan.product)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openPaySheet(context, ref),
        icon: const Icon(Icons.payments_outlined),
        label: const Text('Make a payment'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(loanRepaymentsProvider(loan.id)),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _row(
                        'Status',
                        loan.stage?.isNotEmpty == true
                            ? loan.stage!
                            : loan.status),
                    _row('Principal', _money.format(loan.principal)),
                    _row('Outstanding balance', _money.format(loan.balance)),
                    if (loan.monthlyInstallment != null)
                      _row('Monthly instalment',
                          _money.format(loan.monthlyInstallment)),
                    if (loan.totalPayable != null)
                      _row('Total payable', _money.format(loan.totalPayable)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text('Payment history',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            repayments.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Could not load payment history.'),
              ),
              data: (rows) {
                if (rows.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: Text('No payments recorded yet.')),
                  );
                }
                return Column(
                  children: rows
                      .map((r) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: const Icon(Icons.check_circle_outline,
                                  color: Colors.green),
                              title: Text(_money.format(r.amount)),
                              subtitle: Text([
                                if (r.channel.isNotEmpty) r.channel,
                                if (r.reference.isNotEmpty)
                                  'Ref ${r.reference}',
                                if (r.paidAt != null)
                                  DateFormat('d MMM y').format(r.paidAt!),
                              ].join(' · ')),
                            ),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 80),
          ],
        ),
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

  Future<void> _openPaySheet(BuildContext context, WidgetRef ref) async {
    final payment = await showModalBottomSheet<MobileMoneyPayment>(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _PayLoanForm(loan: loan),
      ),
    );
    if (payment != null && context.mounted) {
      ref.invalidate(loanRepaymentsProvider(loan.id));
      await showPaymentStatus(
        context,
        payment.id,
        payment.amount,
        provider: payment.provider,
      );
    }
  }
}

class _PayLoanForm extends ConsumerStatefulWidget {
  const _PayLoanForm({required this.loan});
  final Loan loan;

  @override
  ConsumerState<_PayLoanForm> createState() => _PayLoanFormState();
}

class _PayLoanFormState extends ConsumerState<_PayLoanForm> {
  MobileMoneyNetwork _network = MobileMoneyNetwork.mtn;
  late final TextEditingController _amount = TextEditingController(
    text: (widget.loan.monthlyInstallment ?? widget.loan.balance)
        .toStringAsFixed(0),
  );
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
            purpose: PaymentPurpose.loanRepayment,
            amount: amount,
            network: _network,
            loanId: widget.loan.id,
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
          Text('Repay ${widget.loan.product}',
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

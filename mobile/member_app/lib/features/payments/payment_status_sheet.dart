import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers.dart';

final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

/// Polls a just-created mobile-money request until it reaches a terminal
/// state (posted/paid = success, failed/expired/cancelled = failure) or a
/// timeout, so the member gets real in-app confirmation rather than a
/// fire-and-forget snackbar.
class PaymentStatusSheet extends ConsumerStatefulWidget {
  const PaymentStatusSheet({
    super.key,
    required this.paymentId,
    required this.amount,
  });

  final String paymentId;
  final num amount;

  @override
  ConsumerState<PaymentStatusSheet> createState() => _PaymentStatusSheetState();
}

class _PaymentStatusSheetState extends ConsumerState<PaymentStatusSheet> {
  Timer? _timer;
  String _status = 'pending';
  int _ticks = 0;
  static const _maxTicks = 20; // ~60s at 3s intervals

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _poll());
    _poll();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  bool _isSuccess(String s) {
    final v = s.toLowerCase();
    return v.contains('post') ||
        v.contains('paid') ||
        v.contains('complet') ||
        v.contains('success');
  }

  bool _isFailure(String s) {
    final v = s.toLowerCase();
    return v.contains('fail') ||
        v.contains('reject') ||
        v.contains('cancel') ||
        v.contains('expire') ||
        v.contains('declin');
  }

  bool get _terminal => _isSuccess(_status) || _isFailure(_status);
  bool get _timedOut => !_terminal && _ticks >= _maxTicks;

  Future<void> _poll() async {
    if (_terminal || _timedOut) {
      _finish();
      return;
    }
    _ticks++;
    try {
      final p =
          await ref.read(paymentRepositoryProvider).statusOf(widget.paymentId);
      if (p != null && mounted) setState(() => _status = p.status);
    } catch (_) {
      // ignore transient poll errors; keep trying until timeout
    }
    if (_terminal || _timedOut) _finish();
  }

  void _finish() {
    _timer?.cancel();
    ref.invalidate(paymentHistoryProvider);
    ref.invalidate(dashboardProvider);
    ref.invalidate(statementProvider);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    late IconData icon;
    late Color color;
    late String title;
    late String subtitle;

    if (_isSuccess(_status)) {
      icon = Icons.check_circle;
      color = Colors.green;
      title = 'Payment confirmed';
      subtitle = '${_money.format(widget.amount)} received. Your balance is updated.';
    } else if (_isFailure(_status)) {
      icon = Icons.cancel;
      color = scheme.error;
      title = 'Payment not completed';
      subtitle = 'The payment was $_status. No money was taken.';
    } else if (_timedOut) {
      icon = Icons.schedule;
      color = Colors.orange;
      title = 'Still processing';
      subtitle =
          'This is taking longer than usual. Check Payments shortly for the final status.';
    } else {
      icon = Icons.hourglass_top;
      color = scheme.primary;
      title = 'Waiting for confirmation';
      subtitle = 'Approve the prompt on your phone to complete '
          '${_money.format(widget.amount)}.';
    }

    final pending = !_terminal && !_timedOut;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (pending)
            SizedBox(
              width: 56,
              height: 56,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const CircularProgressIndicator(),
                  Icon(icon, color: color, size: 24),
                ],
              ),
            )
          else
            Icon(icon, color: color, size: 56),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(subtitle, textAlign: TextAlign.center),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(pending ? 'Close' : 'Done'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Shows the status sheet for a created payment.
Future<void> showPaymentStatus(
    BuildContext context, String paymentId, num amount) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    builder: (_) => PaymentStatusSheet(paymentId: paymentId, amount: amount),
  );
}

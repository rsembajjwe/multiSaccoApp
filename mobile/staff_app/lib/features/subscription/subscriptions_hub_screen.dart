import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/mobile_money.dart';
import '../../providers.dart';
import 'member_subscriptions_screen.dart';
import 'subscription_screen.dart';

class SubscriptionsHubScreen extends ConsumerWidget {
  const SubscriptionsHubScreen({
    super.key,
    required this.canViewSubscription,
    required this.canPaySubscription,
    required this.canViewMemberSubscriptions,
    required this.canManageMemberSubscriptions,
    required this.canPromptMemberSubscriptions,
    required this.canManageNotifications,
  });

  final bool canViewSubscription;
  final bool canPaySubscription;
  final bool canViewMemberSubscriptions;
  final bool canManageMemberSubscriptions;
  final bool canPromptMemberSubscriptions;
  final bool canManageNotifications;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync =
        canManageNotifications ? ref.watch(saccoStatusProvider) : null;
    return Scaffold(
      appBar: AppBar(title: const Text('Subscriptions')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (canViewSubscription)
            _HubTile(
              icon: Icons.workspace_premium_outlined,
              title: 'SACCO platform subscription',
              subtitle: 'Pay balance and top up member capacity',
              enabled: true,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => SubscriptionScreen(canPay: canPaySubscription),
              )),
            ),
          if (canViewMemberSubscriptions || canManageMemberSubscriptions)
            _HubTile(
              icon: Icons.fact_check_outlined,
              title: 'Member dues',
              subtitle:
                  'Track paid members and pay platform for selected members',
              enabled: true,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => MemberSubscriptionsScreen(
                  canManage: canManageMemberSubscriptions,
                  canPrompt: canPromptMemberSubscriptions,
                ),
              )),
            ),
          if (canManageNotifications)
            _HubTile(
              icon: Icons.sms_outlined,
              title: 'SMS credits',
              subtitle: statusAsync?.maybeWhen(
                    data: (s) =>
                        '${s.smsBalance} SMS available at ${s.smsRate} each',
                    orElse: () => 'Buy SMS credits by mobile money',
                  ) ??
                  'Buy SMS credits by mobile money',
              enabled: true,
              onTap: () => _showSmsTopUpDialog(context, ref),
            ),
        ],
      ),
    );
  }

  Future<void> _showSmsTopUpDialog(BuildContext context, WidgetRef ref) async {
    final request = await showDialog<_SmsTopUpRequest>(
      context: context,
      builder: (_) => const _SmsTopUpDialog(),
    );
    if (request == null) return;
    try {
      final payment = await ref
          .read(adminRepositoryProvider)
          .requestSmsTopUpMobileMoney(
            smsCount: request.smsCount,
            payerPhone: request.phone,
            provider: request.provider,
          );
      ref.invalidate(mobileMoneyPaymentRequestsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text('SMS payment prompt sent: ${payment.externalReference}')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }
}

class _HubTile extends StatelessWidget {
  const _HubTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: ListTile(
        enabled: enabled,
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
        onTap: enabled ? onTap : null,
      ),
    );
  }
}

class _SmsTopUpRequest {
  const _SmsTopUpRequest({
    required this.smsCount,
    required this.phone,
    required this.provider,
  });

  final int smsCount;
  final String phone;
  final String provider;
}

class _SmsTopUpDialog extends StatefulWidget {
  const _SmsTopUpDialog();

  @override
  State<_SmsTopUpDialog> createState() => _SmsTopUpDialogState();
}

class _SmsTopUpDialogState extends State<_SmsTopUpDialog> {
  final _formKey = GlobalKey<FormState>();
  final _count = TextEditingController(text: '100');
  final _phone = TextEditingController(text: '+256');
  String _provider = 'mtn';

  @override
  void dispose() {
    _count.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final smsCount = int.tryParse(_count.text.trim().replaceAll(',', '')) ?? 0;
    Navigator.of(context).pop(_SmsTopUpRequest(
      smsCount: smsCount,
      phone: normalizeUgandanMobileNumber(_phone.text)!,
      provider: _provider,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      scrollable: true,
      title: const Text('Buy SMS credits'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'mtn', label: Text('MTN')),
              ButtonSegment(value: 'airtel', label: Text('Airtel')),
            ],
            selected: {_provider},
            onSelectionChanged: (value) =>
                setState(() => _provider = value.first),
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _count,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'SMS credits',
              prefixIcon: Icon(Icons.sms_outlined),
            ),
            validator: (value) {
              final count = int.tryParse(
                  (value ?? '').trim().replaceAll(',', ''));
              return count == null || count <= 0
                  ? 'Enter the number of SMS credits.'
                  : null;
            },
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'SACCO mobile money phone',
              prefixIcon: Icon(Icons.phone_android_outlined),
            ),
            validator: (value) =>
                validateUgandanMobileMoneyPhone(value, _provider),
          ),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel')),
        FilledButton.icon(
          onPressed: _submit,
          icon: const Icon(Icons.account_balance_wallet_outlined),
          label: const Text('Send prompt'),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/member_picker.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Record a member paying money into the SACCO, against a chosen product
/// (fund type). Cash posts immediately and credits the member's fund balance;
/// mobile money fires an MTN / Airtel prompt to the member's phone.
///
/// When [recordCashBook] is true (opened from the Treasurer's Cash book), a
/// successful *cash* deposit also records a cash-in entry in the cash book so
/// cash-on-hand and the Cash-flow tracker stay in step. Mobile money never
/// writes a cash entry — it is not cash in hand.
class MemberDepositSheet extends ConsumerStatefulWidget {
  const MemberDepositSheet({
    super.key,
    this.recordCashBook = false,
    this.title = 'Member deposit',
  });

  final bool recordCashBook;
  final String title;

  @override
  ConsumerState<MemberDepositSheet> createState() => _MemberDepositSheetState();
}

/// Maps a fund type to the backend transaction type. System funds use their
/// fixed types; a custom fund uses `<code>_contribution` (the backend resolves
/// the fund from the code).
String transactionTypeForFund(FundType f) {
  switch (f.code.toLowerCase()) {
    case 'savings':
      return 'savings_deposit';
    case 'shares':
      return 'share_purchase';
    case 'welfare':
      return 'welfare_contribution';
    default:
      return '${f.code.toLowerCase()}_contribution';
  }
}

/// Mobile-money collection is only supported for savings deposits by the
/// backend; every other fund is cash-only here.
bool fundSupportsMobileMoney(FundType f) => f.code.toLowerCase() == 'savings';

class _MemberDepositSheetState extends ConsumerState<MemberDepositSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _phone = TextEditingController();
  final _narration = TextEditingController();
  String _mode = 'cash';
  String _provider = 'mtn';
  Member? _member;
  FundType? _fund;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _phone.dispose();
    _narration.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_fund == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Choose a product.')));
      return;
    }
    if (_member == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Choose a member.')));
      return;
    }
    final fund = _fund!;
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final memberName = _member?.fullName ?? 'the selected member';
    final isCash = _mode == 'cash';
    final confirmed = await confirmAction(
      context,
      title: isCash ? 'Post cash ${fund.name.toLowerCase()}?' : 'Send payment prompt?',
      message: isCash
          ? 'Post ${Fmt.money(amount)} to $memberName\'s ${fund.name} '
              '(cash)${widget.recordCashBook ? ' and add it to cash on hand.' : '.'}'
          : 'Send a ${Fmt.money(amount)} ${_provider.toUpperCase()} mobile '
              'money prompt to ${_phone.text.trim()} for $memberName '
              '(${fund.name}).',
      confirmLabel: isCash ? 'Post deposit' : 'Send prompt',
      icon: isCash ? Icons.savings_outlined : Icons.send_to_mobile_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      if (isCash) {
        await ref.read(adminRepositoryProvider).createMemberContribution(
              memberId: _member!.id,
              type: transactionTypeForFund(fund),
              amount: amount,
              narration: _narration.text,
            );
        if (widget.recordCashBook) {
          await ref.read(adminRepositoryProvider).createCashEntry(
                purpose: 'collection',
                amount: amount,
                description: '${fund.name} collection - $memberName',
                memberId: _member!.id,
              );
          ref.invalidate(cashBookProvider);
        }
        ref.invalidate(transactionsProvider(''));
        ref.invalidate(memberProvider(_member!.id));
        ref.invalidate(memberFundBalancesProvider);
        ref.invalidate(saccoStatusProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${fund.name} deposit posted.')),
          );
          Navigator.of(context).pop();
        }
      } else {
        final request = await ref
            .read(adminRepositoryProvider)
            .requestMemberSavingsMobileMoney(
              memberId: _member!.id,
              amount: amount,
              payerPhone: _phone.text,
              provider: _provider,
            );
        ref.invalidate(mobileMoneyPaymentRequestsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(request.checkoutPrompt.isEmpty
                  ? 'Mobile-money prompt sent to member phone.'
                  : request.checkoutPrompt),
            ),
          );
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fundsAsync = ref.watch(fundTypesProvider);
    if (_mode == 'mobile_money' &&
        _phone.text.isEmpty &&
        _member != null &&
        _member!.phone.isNotEmpty) {
      _phone.text = _member!.phone;
    }
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              fundsAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: LinearProgressIndicator(),
                ),
                error: (e, _) => Text('Could not load products: $e',
                    style: const TextStyle(color: Color(0xFFB91C1C))),
                data: (funds) {
                  final active = funds.where((f) => f.active).toList();
                  if (active.isEmpty) {
                    return const Text('No active products configured.');
                  }
                  _fund ??= active.firstWhere(
                    (f) => f.code.toLowerCase() == 'savings',
                    orElse: () => active.first,
                  );
                  // Keep mode valid for the selected product.
                  if (!fundSupportsMobileMoney(_fund!) &&
                      _mode == 'mobile_money') {
                    _mode = 'cash';
                  }
                  return DropdownButtonFormField<String>(
                    initialValue: _fund!.id,
                    decoration: const InputDecoration(labelText: 'Product'),
                    items: [
                      for (final f in active)
                        DropdownMenuItem(
                          value: f.id,
                          child: Text(f.name),
                        ),
                    ],
                    onChanged: _busy
                        ? null
                        : (v) => setState(() {
                              _fund = active.firstWhere((f) => f.id == v);
                              if (!fundSupportsMobileMoney(_fund!)) {
                                _mode = 'cash';
                              }
                            }),
                  );
                },
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: [
                  const ButtonSegment(
                    value: 'cash',
                    icon: Icon(Icons.payments_outlined),
                    label: Text('Cash'),
                  ),
                  ButtonSegment(
                    value: 'mobile_money',
                    icon: const Icon(Icons.phone_android_outlined),
                    label: const Text('Mobile money'),
                    enabled: _fund != null && fundSupportsMobileMoney(_fund!),
                  ),
                ],
                selected: {_mode},
                onSelectionChanged: _busy
                    ? null
                    : (value) => setState(() => _mode = value.first),
              ),
              if (_fund != null && !fundSupportsMobileMoney(_fund!))
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    'Mobile money is available for Savings only. '
                    '${_fund!.name} is recorded as cash.',
                    style: TextStyle(
                        fontSize: 11.5,
                        color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _busy
                    ? null
                    : () async {
                        final picked = await showMemberPicker(context);
                        if (picked != null && mounted) {
                          setState(() {
                            _member = picked;
                            if (_mode == 'mobile_money' &&
                                picked.phone.isNotEmpty) {
                              _phone.text = picked.phone;
                            }
                          });
                        }
                      },
                borderRadius: BorderRadius.circular(8),
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Member',
                    suffixIcon: Icon(Icons.search),
                  ),
                  child: Text(
                    _member == null
                        ? 'Tap to search & select a member'
                        : '${_member!.fullName} - ${_member!.membershipNo}',
                    overflow: TextOverflow.ellipsis,
                    style: _member == null
                        ? TextStyle(color: Theme.of(context).hintColor)
                        : null,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _amount,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration:
                    const InputDecoration(labelText: 'Amount', prefixText: 'UGX '),
                validator: (v) {
                  final parsed =
                      num.tryParse((v ?? '').trim().replaceAll(',', ''));
                  return parsed == null || parsed <= 0 ? 'Enter amount.' : null;
                },
              ),
              if (_mode == 'mobile_money') ...[
                const SizedBox(height: 10),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'mtn', label: Text('MTN')),
                    ButtonSegment(value: 'airtel', label: Text('Airtel')),
                  ],
                  selected: {_provider},
                  onSelectionChanged: _busy
                      ? null
                      : (value) => setState(() => _provider = value.first),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Member phone'),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Enter member phone.'
                      : null,
                ),
              ] else ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _narration,
                  minLines: 2,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Narration'),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: _busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(_mode == 'cash'
                          ? Icons.save_outlined
                          : Icons.send_to_mobile_outlined),
                  label: Text(_mode == 'cash'
                      ? 'Post cash deposit'
                      : 'Send phone prompt'),
                  onPressed: _busy ? null : _save,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

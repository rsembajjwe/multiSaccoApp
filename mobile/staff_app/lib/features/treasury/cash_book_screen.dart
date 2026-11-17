import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/member_picker.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import '../transactions/member_deposit_sheet.dart';
import '../transactions/loan_repayment_sheet.dart';

/// Treasurer's cash book: cash drawn from the bank (bank withdrawal) and every
/// use of that cash. The running balance is cash on hand.
class CashBookScreen extends ConsumerWidget {
  const CashBookScreen(
      {super.key, required this.canManage, this.embedded = false});

  final bool canManage;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(cashBookProvider);
    return Scaffold(
      appBar: embedded ? null : AppBar(title: const Text('Cash book')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Record'),
              onPressed: () async {
                FocusManager.instance.primaryFocus?.unfocus();
                final choice = await showModalBottomSheet<String>(
                  context: context,
                  showDragHandle: true,
                  builder: (_) => SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ListTile(
                          leading: const Icon(Icons.groups_outlined),
                          title: const Text('Member collection'),
                          subtitle: const Text(
                              'A member pays in - cash posts & adds to cash '
                              'on hand, or send a mobile-money prompt'),
                          onTap: () => Navigator.pop(context, 'collection'),
                        ),
                        ListTile(
                          leading: const Icon(Icons.request_quote_outlined),
                          title: const Text('Loan repayment'),
                          subtitle: const Text(
                              'Post cash to an active member loan and issue a receipt'),
                          onTap: () => Navigator.pop(context, 'repayment'),
                        ),
                        ListTile(
                          leading: const Icon(Icons.local_atm_outlined),
                          title: const Text('Cash movement'),
                          subtitle: const Text(
                              'Bank the cash, draw from bank, loan, expense '
                              'or payout'),
                          onTap: () => Navigator.pop(context, 'cash'),
                        ),
                      ],
                    ),
                  ),
                );
                if (choice == null || !context.mounted) return;
                await showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  showDragHandle: true,
                  builder: (_) {
                    if (choice == 'collection') {
                      return const MemberDepositSheet(
                        title: 'Member collection',
                      );
                    }
                    if (choice == 'repayment') {
                      return const LoanRepaymentSheet();
                    }
                    return const _CashEntrySheet();
                  },
                );
              },
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load the cash book.',
          detail: '$e',
          onRetry: () => ref.invalidate(cashBookProvider),
        ),
        data: (book) {
          num sumOf(String p) => book.entries
              .where((e) => e.purpose == p)
              .fold<num>(0, (s, e) => s + e.amount);
          final collections = sumOf('collection');
          final banked = sumOf('bank_deposit');
          final drawnUsed = sumOf('bank_withdrawal');
          // Cash physically held: collected cash not yet banked. Cash drawn from
          // the bank is always drawn for a use, so it nets out here.
          final cashOnHand = collections - banked;
          // Money still sitting in the bank: total banked less what has been
          // drawn from the bank and used (loans, expenses, member withdrawals...).
          final cashDeposited = banked - drawnUsed;
          // Total funds the SACCO holds now: on hand plus in the bank.
          // Invariant: cash on hand + cash deposited = total deposits.
          final totalDeposits = cashOnHand + cashDeposited;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cashBookProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              children: [
                BalanceCard(
                  label: 'Cash on hand',
                  value: Fmt.money(cashOnHand),
                  icon: Icons.local_atm_outlined,
                  color: const Color(0xFF0F766E),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _MiniStat(
                        label: 'Total deposits',
                        value: Fmt.money(totalDeposits),
                        color: const Color(0xFF15803D),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _MiniStat(
                        label: 'Cash deposited',
                        value: Fmt.money(cashDeposited),
                        color: const Color(0xFF0E7490),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text('Entries',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (book.entries.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 28),
                    child: EmptyState(
                      icon: Icons.local_atm_outlined,
                      message: 'No cash movements recorded yet.',
                    ),
                  )
                else
                  for (final e in book.entries) ...[
                    _EntryTile(entry: e),
                    const SizedBox(height: 8),
                  ],
              ],
            ),
          );
        },
      ),
    );
  }
}

String cashPurposeLabel(String p) {
  switch (p) {
    case 'collection':
      return 'Member collection';
    case 'bank_withdrawal':
      return 'Cash from bank';
    case 'bank_deposit':
      return 'Bank the cash';
    case 'loan_disbursement':
      return 'Loan disbursement';
    case 'expense':
      return 'Expense';
    case 'member_payout':
      return 'Member payout';
    default:
      return 'Other cash';
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry});
  final TreasuryCashEntry entry;
  @override
  Widget build(BuildContext context) {
    final isFromBank = entry.purpose == 'bank_withdrawal';
    final color = isFromBank
        ? const Color(0xFF7C3AED)
        : entry.isIn
            ? const Color(0xFF15803D)
            : const Color(0xFFB91C1C);
    final meta = <String>[
      if (entry.entryDate != null) Fmt.date(entry.entryDate),
      if ((entry.reference ?? '').isNotEmpty) 'Ref ${entry.reference}',
      if ((entry.description ?? '').isNotEmpty) entry.description!,
    ].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(
          isFromBank
              ? Icons.account_balance_outlined
              : (entry.isIn ? Icons.south_west : Icons.north_east),
          color: color,
        ),
        title: Text(cashPurposeLabel(entry.purpose)),
        subtitle: meta.isEmpty ? null : Text(meta),
        trailing: Text(
          '${entry.isIn ? '+' : '-'}${Fmt.money(entry.amount)}',
          style: TextStyle(
              color: color, fontWeight: FontWeight.w700, fontSize: 13.5),
        ),
        isThreeLine: meta.length > 34,
      ),
    );
  }
}

const _inPurposes = {'collection', 'bank_withdrawal'};

const _purposes = <MapEntry<String, String>>[
  MapEntry('bank_withdrawal', 'Cash from bank'),
  MapEntry('bank_deposit', 'Bank the cash'),
];

const _withdrawalReasons = <MapEntry<String, String>>[
  MapEntry('loan_disbursement', 'Loan disbursement'),
  MapEntry('expense', 'Expense'),
  MapEntry('member_withdraw', 'Member withdraw'),
  MapEntry('other', 'Other'),
];

String _reasonLabel(String r) {
  for (final e in _withdrawalReasons) {
    if (e.key == r) return e.value;
  }
  return 'Other';
}

bool _reasonWantsMember(String r) =>
    r == 'loan_disbursement' || r == 'member_withdraw';

class _CashEntrySheet extends ConsumerStatefulWidget {
  const _CashEntrySheet();
  @override
  ConsumerState<_CashEntrySheet> createState() => _CashEntrySheetState();
}

class _CashEntrySheetState extends ConsumerState<_CashEntrySheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _reference = TextEditingController();
  final _description = TextEditingController();
  String _purpose = 'bank_withdrawal';
  String _reason = 'loan_disbursement';
  Member? _member;
  bool _busy = false;
  String? _formError;

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _formError = null);
    if (!_formKey.currentState!.validate()) {
      setState(() =>
          _formError = 'Complete the highlighted cash fields before posting.');
      return;
    }
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final isIn = _inPurposes.contains(_purpose);
    final action = _purpose == 'bank_withdrawal'
        ? 'cash from bank for ${_reasonLabel(_reason).toLowerCase()}'
        : cashPurposeLabel(_purpose).toLowerCase();
    final confirmed = await confirmAction(
      context,
      title: isIn ? 'Record cash in?' : 'Record cash out?',
      message: isIn
          ? 'Add ${Fmt.money(amount)} to cash on hand — $action.'
          : 'Reduce cash on hand by ${Fmt.money(amount)} — $action.',
      confirmLabel: 'Record',
      icon: Icons.local_atm_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      final note = _description.text.trim();
      final wantsMember =
          _purpose == 'bank_withdrawal' && _reasonWantsMember(_reason);
      final description = _purpose == 'bank_withdrawal'
          ? (note.isEmpty
              ? _reasonLabel(_reason)
              : '${_reasonLabel(_reason)} - $note')
          : note;
      await ref.read(adminRepositoryProvider).createCashEntry(
            purpose: _purpose,
            amount: amount,
            reference: _reference.text,
            description: description,
            memberId: wantsMember ? _member?.id : null,
          );
      ref.invalidate(cashBookProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cash entry recorded.')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() =>
            _formError = 'Cash entry was not recorded. Review and retry. $e');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final showMember =
        _purpose == 'bank_withdrawal' && _reasonWantsMember(_reason);
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Record cash movement',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _purpose,
                decoration: const InputDecoration(labelText: 'Movement'),
                items: [
                  for (final e in _purposes)
                    DropdownMenuItem(value: e.key, child: Text(e.value)),
                ],
                onChanged: _busy ? null : (v) => setState(() => _purpose = v!),
              ),
              if (_purpose == 'bank_withdrawal') ...[
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _reason,
                  decoration: const InputDecoration(labelText: 'Reason'),
                  items: [
                    for (final e in _withdrawalReasons)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: _busy ? null : (v) => setState(() => _reason = v!),
                ),
              ],
              const SizedBox(height: 10),
              TextFormField(
                controller: _amount,
                onChanged: (_) {
                  if (_formError != null) setState(() => _formError = null);
                },
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                    labelText: 'Amount', prefixText: 'UGX '),
                validator: (v) {
                  final n = num.tryParse((v ?? '').trim().replaceAll(',', ''));
                  return n == null || n <= 0 ? 'Enter a valid amount.' : null;
                },
              ),
              if (showMember) ...[
                const SizedBox(height: 10),
                InkWell(
                  onTap: _busy
                      ? null
                      : () async {
                          final picked = await showMemberPicker(context,
                              unavailableReason: postingUnavailableReason);
                          if (picked != null && mounted) {
                            setState(() => _member = picked);
                          }
                        },
                  borderRadius: BorderRadius.circular(8),
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Member (optional)',
                      suffixIcon: Icon(Icons.search),
                    ),
                    child: Text(
                      _member == null
                          ? 'Tap to link a member'
                          : '${_member!.fullName} - ${_member!.membershipNo}',
                      overflow: TextOverflow.ellipsis,
                      style: _member == null
                          ? TextStyle(color: Theme.of(context).hintColor)
                          : null,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 10),
              TextFormField(
                controller: _reference,
                decoration:
                    const InputDecoration(labelText: 'Reference (optional)'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _description,
                minLines: 1,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Note (optional)'),
              ),
              const SizedBox(height: 16),
              if (_formError != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _formError!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: _busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_outlined),
                  label: const Text('Record entry'),
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

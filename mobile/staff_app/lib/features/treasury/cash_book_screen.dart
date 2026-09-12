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

/// Treasurer's cash book: cash drawn from the bank (bank withdrawal) and every
/// use of that cash. The running balance is cash on hand.
class CashBookScreen extends ConsumerWidget {
  const CashBookScreen({super.key, required this.canManage});

  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(cashBookProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Cash book')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Record'),
              onPressed: () async {
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
                  builder: (_) => choice == 'collection'
                      ? const MemberDepositSheet(
                          recordCashBook: true, title: 'Member collection')
                      : const _CashEntrySheet(),
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
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cashBookProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              children: [
                BalanceCard(
                  label: 'Cash on hand',
                  value: Fmt.money(book.cashOnHand),
                  icon: Icons.local_atm_outlined,
                  color: const Color(0xFF0F766E),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _MiniStat(
                        label: 'Drawn from bank',
                        value: Fmt.money(book.totalIn),
                        color: const Color(0xFF15803D),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _MiniStat(
                        label: 'Cash deposited',
                        value: Fmt.money(book.totalOut),
                        color: const Color(0xFFB91C1C),
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
  const _MiniStat({required this.label, required this.value, required this.color});
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
    final scheme = Theme.of(context).colorScheme;
    final color =
        entry.isIn ? const Color(0xFF15803D) : const Color(0xFFB91C1C);
    final meta = <String>[
      if (entry.entryDate != null) Fmt.date(entry.entryDate),
      if ((entry.reference ?? '').isNotEmpty) 'Ref ${entry.reference}',
      if ((entry.description ?? '').isNotEmpty) entry.description!,
    ].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(
          entry.isIn ? Icons.south_west : Icons.north_east,
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
  MapEntry('bank_withdrawal', 'Cash from bank (cash in)'),
  MapEntry('bank_deposit', 'Bank the cash (cash out)'),
  MapEntry('loan_disbursement', 'Loan disbursement'),
  MapEntry('expense', 'Expense'),
  MapEntry('member_payout', 'Member payout'),
  MapEntry('other', 'Other cash'),
];

bool _wantsMember(String p) =>
    p == 'member_payout' || p == 'loan_disbursement' || p == 'collection';

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
  Member? _member;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final isIn = _inPurposes.contains(_purpose);
    final confirmed = await confirmAction(
      context,
      title: isIn ? 'Record cash in?' : 'Record cash out?',
      message: isIn
          ? 'Add ${Fmt.money(amount)} to cash on hand — '
              '${cashPurposeLabel(_purpose).toLowerCase()}.'
          : 'Reduce cash on hand by ${Fmt.money(amount)} — '
              '${cashPurposeLabel(_purpose).toLowerCase()}.',
      confirmLabel: 'Record',
      icon: Icons.local_atm_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createCashEntry(
            purpose: _purpose,
            amount: amount,
            reference: _reference.text,
            description: _description.text,
            memberId: _wantsMember(_purpose) ? _member?.id : null,
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
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final showMember = _wantsMember(_purpose);
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
                decoration: const InputDecoration(labelText: 'Purpose'),
                items: [
                  for (final e in _purposes)
                    DropdownMenuItem(value: e.key, child: Text(e.value)),
                ],
                onChanged:
                    _busy ? null : (v) => setState(() => _purpose = v!),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _amount,
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
                          final picked = await showMemberPicker(context);
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
                decoration: const InputDecoration(
                    labelText: 'Reference (optional)'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _description,
                minLines: 1,
                maxLines: 3,
                decoration:
                    const InputDecoration(labelText: 'Note (optional)'),
              ),
              const SizedBox(height: 16),
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

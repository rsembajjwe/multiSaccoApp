import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/member_picker.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'transaction_detail_screen.dart';
import 'member_deposit_sheet.dart';
import 'loan_repayment_sheet.dart';

class _Filter {
  const _Filter(this.label, this.match);
  final String label;
  final String? match; // substring of type, or null for all
}

const _filters = <_Filter>[
  _Filter('All', null),
  _Filter('Pending', 'pending_approval'),
  _Filter('Savings', 'savings_deposit'),
  _Filter('Withdrawals', 'withdrawal'),
  _Filter('Shares', 'share'),
  _Filter('Welfare', 'welfare'),
];

/// SACCO-wide financial transaction ledger with search and a type filter.
class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  final _controller = TextEditingController();
  String _query = '';
  int _filter = 0;
  int _reloadTick = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // Text search and the type chips share the backend `search` channel (the
  // server LIKE-matches the type column), so paging stays correct — a free
  // text query takes priority, otherwise the selected chip's token is sent.
  String get _effectiveSearch =>
      _query.isNotEmpty ? _query : (_filters[_filter].match ?? '');

  Future<void> _showNewEntryMenu() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.savings_outlined),
              title: const Text('Member contribution'),
              subtitle: const Text('Savings, shares, welfare or another fund'),
              onTap: () => Navigator.pop(context, 'savings'),
            ),
            ListTile(
              leading: const Icon(Icons.request_quote_outlined),
              title: const Text('Loan repayment'),
              subtitle: const Text('Post cash against an active loan'),
              onTap: () => Navigator.pop(context, 'repayment'),
            ),
            ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text('Withdrawal'),
              subtitle: const Text('Cash pays out now; bank goes for approval'),
              onTap: () => Navigator.pop(context, 'withdrawal'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) {
        if (choice == 'withdrawal') return const _WithdrawalSheet();
        if (choice == 'repayment') {
          return const LoanRepaymentSheet();
        }
        return const MemberDepositSheet();
      },
    );
    if (mounted) setState(() => _reloadTick++);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).asData?.value;
    final canCreate = session?.can('transactions:create') ?? false;
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Transactions')),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('New'),
              onPressed: _showNewEntryMenu,
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => setState(() {
                _query = v.trim();
                if (_query.isNotEmpty) _filter = 0;
              }),
              onChanged: (v) {
                if (v.trim().isEmpty && _query.isNotEmpty) {
                  setState(() => _query = '');
                }
              },
              decoration: InputDecoration(
                hintText: 'Search reference, type or member',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => ChoiceChip(
                label: Text(_filters[i].label),
                selected: _filter == i,
                onSelected: (_) => setState(() {
                  _filter = i;
                  _query = '';
                  _controller.clear();
                }),
              ),
            ),
          ),
          Expanded(
            child: PagedListView<FinancialTxn>(
              search: '$_effectiveSearch|$_reloadTick',
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .transactionsPage(search: _effectiveSearch, page: page),
              itemBuilder: (context, t) =>
                  _TxnTile(txn: t, memberName: names[t.memberId]),
              emptyIcon: Icons.receipt_long_outlined,
              emptyMessage: 'No transactions match this view.',
              errorMessage: 'Could not load transactions.',
            ),
          ),
        ],
      ),
    );
  }
}

class _TxnTile extends StatelessWidget {
  const _TxnTile({required this.txn, this.memberName});
  final FinancialTxn txn;
  final String? memberName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final out = txn.isOutflow;
    final color = out ? const Color(0xFFB91C1C) : const Color(0xFF15803D);
    final title =
        txn.narration.isNotEmpty ? txn.narration : Fmt.label(txn.type);
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) =>
                TransactionDetailScreen(txn: txn, memberName: memberName))),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.13),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(out ? Icons.north_east : Icons.south_west,
                    color: color, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(
                        '${memberName ?? txn.memberId}${memberName == null && txn.memberId.isEmpty ? '' : ' · '}${Fmt.dateTime(txn.date)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('${out ? '-' : '+'}${Fmt.money(txn.amount)}',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, color: color)),
                  const SizedBox(height: 4),
                  StatusChip(txn.status),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Records a member withdrawal. Cash pays out and posts immediately; bank goes
/// to the approval queue for a second officer to post (transactions:approve).
class _WithdrawalSheet extends ConsumerStatefulWidget {
  const _WithdrawalSheet();

  @override
  ConsumerState<_WithdrawalSheet> createState() => _WithdrawalSheetState();
}

class _WithdrawalSheetState extends ConsumerState<_WithdrawalSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _narration = TextEditingController();
  String _channel = 'cash';
  Member? _member;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _narration.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_member == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Choose a member.')));
      return;
    }
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final memberName = _member?.fullName ?? 'the selected member';
    final isCash = _channel == 'cash';
    final confirmed = await confirmAction(
      context,
      title:
          isCash ? 'Post cash withdrawal?' : 'Submit withdrawal for approval?',
      message: isCash
          ? 'Pay out ${Fmt.money(amount)} in cash to $memberName and reduce '
              'their savings balance now.'
          : 'Submit a ${Fmt.money(amount)} ${Fmt.label(_channel)} withdrawal for '
              '$memberName. A second officer must post it before the balance '
              'changes.',
      confirmLabel: isCash ? 'Post withdrawal' : 'Submit',
      icon: Icons.payments_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createWithdrawal(
            memberId: _member!.id,
            amount: amount,
            channel: _channel,
            narration: _narration.text,
          );
      ref.invalidate(transactionsProvider(''));
      ref.invalidate(memberProvider(_member!.id));
      ref.invalidate(memberFundBalancesProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isCash
                ? 'Cash withdrawal posted.'
                : 'Withdrawal submitted for approval.'),
          ),
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
                'Member withdrawal',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'cash',
                    icon: Icon(Icons.payments_outlined),
                    label: Text('Cash'),
                  ),
                  ButtonSegment(
                    value: 'bank',
                    icon: Icon(Icons.account_balance_outlined),
                    label: Text('Bank'),
                  ),
                ],
                selected: {_channel},
                onSelectionChanged: _busy
                    ? null
                    : (value) => setState(() => _channel = value.first),
              ),
              const SizedBox(height: 12),
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
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount'),
                validator: (v) {
                  final parsed =
                      num.tryParse((v ?? '').trim().replaceAll(',', ''));
                  return parsed == null || parsed <= 0 ? 'Enter amount.' : null;
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _narration,
                minLines: 1,
                maxLines: 3,
                decoration:
                    const InputDecoration(labelText: 'Narration (optional)'),
              ),
              const SizedBox(height: 8),
              Text(
                _channel == 'cash'
                    ? 'Cash withdrawals post immediately.'
                    : 'Bank withdrawals wait for a second officer to post.',
                style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
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
                      : const Icon(Icons.payments_outlined),
                  label:
                      Text(_channel == 'cash' ? 'Post withdrawal' : 'Submit'),
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

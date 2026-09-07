import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'transaction_detail_screen.dart';

class _Filter {
  const _Filter(this.label, this.match);
  final String label;
  final String? match; // substring of type, or null for all
}

const _filters = <_Filter>[
  _Filter('All', null),
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

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).asData?.value;
    final canCreate = session?.can('transactions:create') ?? false;
    final names = ref.watch(memberNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Transactions')),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.savings_outlined),
              label: const Text('Savings'),
              onPressed: () async {
                await showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  showDragHandle: true,
                  builder: (_) => const _SavingsDepositSheet(),
                );
                if (mounted) setState(() => _reloadTick++);
              },
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

class _SavingsDepositSheet extends ConsumerStatefulWidget {
  const _SavingsDepositSheet();

  @override
  ConsumerState<_SavingsDepositSheet> createState() =>
      _SavingsDepositSheetState();
}

class _SavingsDepositSheetState extends ConsumerState<_SavingsDepositSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _phone = TextEditingController();
  final _narration = TextEditingController();
  String _mode = 'cash';
  String _provider = 'mtn';
  String? _memberId;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _phone.dispose();
    _narration.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _memberId == null) return;
    setState(() => _busy = true);
    try {
      final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
      if (_mode == 'cash') {
        await ref.read(adminRepositoryProvider).createCashSavingsDeposit(
              memberId: _memberId!,
              amount: amount,
              narration: _narration.text,
            );
        ref.invalidate(transactionsProvider(''));
        ref.invalidate(memberProvider(_memberId!));
        ref.invalidate(memberFundBalancesProvider);
        ref.invalidate(saccoStatusProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cash savings posted.')),
          );
          Navigator.of(context).pop();
        }
      } else {
        final request = await ref
            .read(adminRepositoryProvider)
            .requestMemberSavingsMobileMoney(
              memberId: _memberId!,
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
    final membersAsync = ref.watch(membersProvider(''));
    final members = membersAsync.asData?.value
            .where((m) => m.status == 'active')
            .toList() ??
        const <Member>[];
    Member? selectedMember;
    for (final member in members) {
      if (member.id == _memberId) {
        selectedMember = member;
        break;
      }
    }
    if (_mode == 'mobile_money' &&
        _phone.text.isEmpty &&
        selectedMember != null &&
        selectedMember.phone.isNotEmpty) {
      _phone.text = selectedMember.phone;
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
                'Member savings',
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
                    value: 'mobile_money',
                    icon: Icon(Icons.phone_android_outlined),
                    label: Text('Mobile money'),
                  ),
                ],
                selected: {_mode},
                onSelectionChanged: _busy
                    ? null
                    : (value) => setState(() => _mode = value.first),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _memberId,
                decoration: const InputDecoration(labelText: 'Member'),
                items: members
                    .map((m) => DropdownMenuItem(
                          value: m.id,
                          child: Text(
                            '${m.fullName} - ${m.membershipNo}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ))
                    .toList(),
                onChanged: _busy
                    ? null
                    : (v) {
                        setState(() {
                          _memberId = v;
                          Member? member;
                          for (final candidate in members) {
                            if (candidate.id == v) {
                              member = candidate;
                              break;
                            }
                          }
                          if (member != null && member.phone.isNotEmpty) {
                            _phone.text = member.phone;
                          }
                        });
                      },
                validator: (v) => v == null ? 'Choose a member.' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _amount,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount'),
                validator: (v) {
                  final parsed =
                      num.tryParse((v ?? '').trim().replaceAll(',', ''));
                  return parsed == null || parsed <= 0
                      ? 'Enter amount.'
                      : null;
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
                  decoration:
                      const InputDecoration(labelText: 'Member phone'),
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
                      ? 'Post cash savings'
                      : 'Send phone prompt'),
                  onPressed: _busy ? null : _save,
                ),
              ),
              if (membersAsync.isLoading) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
            ],
          ),
        ),
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
    final title = txn.narration.isNotEmpty ? txn.narration : Fmt.label(txn.type);
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => TransactionDetailScreen(
                txn: txn, memberName: memberName))),
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
                    style: TextStyle(fontWeight: FontWeight.w800, color: color)),
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

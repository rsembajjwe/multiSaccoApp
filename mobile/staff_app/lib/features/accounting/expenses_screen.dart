import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Operating expenses (rent, utilities, staff, technology...). Posts to the
/// expense account picked from the chart of accounts.
class ExpensesScreen extends ConsumerWidget {
  const ExpensesScreen(
      {super.key, required this.canManage, this.embedded = false});

  final bool canManage;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(expensesProvider);
    final accounts =
        ref.watch(expenseAccountsProvider).asData?.value ?? const [];
    final names = {for (final a in accounts) a.code: a.name};
    return Scaffold(
      appBar: embedded ? null : AppBar(title: const Text('Expenses')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Record'),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _ExpenseSheet(),
              ),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load expenses.',
          detail: '$e',
          onRetry: () => ref.invalidate(expensesProvider),
        ),
        data: (expenses) {
          if (expenses.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              message: 'No expenses recorded yet.',
            );
          }
          final total = expenses.fold<num>(0, (sum, e) => sum + e.amount);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(expensesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              itemCount: expenses.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                if (i == 0) {
                  return BalanceCard(
                    label: 'Total expenses',
                    value: Fmt.money(total),
                    icon: Icons.receipt_long_outlined,
                    color: const Color(0xFFB91C1C),
                  );
                }
                final e = expenses[i - 1];
                final meta = <String>[
                  if (e.expenseDate != null) Fmt.date(e.expenseDate),
                  Fmt.label(e.channel),
                  if ((e.reference ?? '').isNotEmpty) 'Ref ${e.reference}',
                  if ((e.description ?? '').isNotEmpty) e.description!,
                ].join(' · ');
                return Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: const Icon(Icons.receipt_long_outlined),
                    title: Text(names[e.accountCode] ?? e.accountCode),
                    subtitle: meta.isEmpty ? null : Text(meta),
                    trailing: Text('-${Fmt.money(e.amount)}',
                        style: const TextStyle(
                            color: Color(0xFFB91C1C),
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5)),
                    isThreeLine: meta.length > 34,
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

const _channels = <MapEntry<String, String>>[
  MapEntry('cash', 'Cash'),
  MapEntry('bank', 'Bank'),
  MapEntry('mobile_money', 'Mobile money'),
];

class _ExpenseSheet extends ConsumerStatefulWidget {
  const _ExpenseSheet();
  @override
  ConsumerState<_ExpenseSheet> createState() => _ExpenseSheetState();
}

class _ExpenseSheetState extends ConsumerState<_ExpenseSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _reference = TextEditingController();
  final _description = TextEditingController();
  String? _accountCode;
  String? _supplierId;
  String _channel = 'cash';
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
    if (!_formKey.currentState!.validate() || _accountCode == null) {
      setState(() => _formError =
          'Complete the highlighted expense fields before posting.');
      return;
    }
    final amount = num.parse(_amount.text.trim().replaceAll(',', ''));
    final confirmed = await confirmAction(
      context,
      title: 'Record expense?',
      message:
          'Post ${Fmt.money(amount)} paid by ${Fmt.label(_channel)}. This creates a ledger entry.',
      confirmLabel: 'Record',
      icon: Icons.receipt_long_outlined,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createExpense(
            accountCode: _accountCode!,
            amount: amount,
            channel: _channel,
            supplierId: _supplierId,
            reference: _reference.text,
            description: _description.text,
          );
      ref.invalidate(expensesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense recorded.')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() =>
            _formError = 'Expense was not recorded. Review and retry. $e');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accountsAsync = ref.watch(expenseAccountsProvider);
    final accounts = accountsAsync.asData?.value ?? const <ChartAccount>[];
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
              Text('Record expense',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _accountCode,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: 'Expense account',
                  hintText:
                      accounts.isEmpty ? 'Loading accounts…' : 'Select account',
                ),
                items: [
                  for (final a in accounts)
                    DropdownMenuItem(
                        value: a.code,
                        child: Text('${a.name} (${a.code})',
                            overflow: TextOverflow.ellipsis)),
                ],
                onChanged:
                    _busy ? null : (v) => setState(() => _accountCode = v),
                validator: (v) => v == null ? 'Pick an expense account.' : null,
              ),
              if (accountsAsync.hasError) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Could not load expense accounts.',
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => ref.invalidate(expenseAccountsProvider),
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              SegmentedButton<String>(
                segments: [
                  for (final c in _channels)
                    ButtonSegment(value: c.key, label: Text(c.value)),
                ],
                selected: {_channel},
                onSelectionChanged: _busy
                    ? null
                    : (value) => setState(() => _channel = value.first),
              ),
              const SizedBox(height: 10),
              Builder(builder: (context) {
                final suppliers =
                    ref.watch(suppliersProvider).asData?.value ?? const [];
                return DropdownButtonFormField<String>(
                  initialValue: _supplierId,
                  isExpanded: true,
                  decoration:
                      const InputDecoration(labelText: 'Supplier (optional)'),
                  items: [
                    const DropdownMenuItem<String>(
                        value: null, child: Text('None')),
                    for (final sup in suppliers)
                      DropdownMenuItem(
                          value: sup.id,
                          child:
                              Text(sup.name, overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged:
                      _busy ? null : (v) => setState(() => _supplierId = v),
                );
              }),
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
                decoration:
                    const InputDecoration(labelText: 'Description (optional)'),
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
                  label: const Text('Record expense'),
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

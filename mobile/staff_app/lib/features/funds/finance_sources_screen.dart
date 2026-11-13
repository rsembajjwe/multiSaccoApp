import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../providers.dart';

/// SACCO sources-of-funds register: where the SACCO's capital comes from
/// (share capital, savings mobilised, grants, borrowings, retained earnings...).
/// Distinct from "Fund types", which are the member account buckets.
class FinanceSourcesScreen extends ConsumerWidget {
  const FinanceSourcesScreen(
      {super.key, required this.canManage, this.embedded = false});

  final bool canManage;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(fundingSourcesProvider);
    return Scaffold(
      appBar:
          embedded ? null : AppBar(title: const Text('Finance sources')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Add source'),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _FinanceSourceSheet(),
              ),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load finance sources.',
          detail: '$e',
          onRetry: () => ref.invalidate(fundingSourcesProvider),
        ),
        data: (sources) {
          if (sources.isEmpty) {
            return const EmptyState(
              icon: Icons.savings_outlined,
              message: 'No finance sources recorded yet.',
            );
          }
          final total = sources
              .where((s) => s.isActive)
              .fold<num>(0, (sum, s) => sum + s.amount);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(fundingSourcesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              itemCount: sources.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                if (i == 0) {
                  return BalanceCard(
                    label: 'Active capital (recorded)',
                    value: Fmt.money(total),
                    icon: Icons.account_balance_outlined,
                    color: const Color(0xFF0F766E),
                  );
                }
                final s = sources[i - 1];
                final meta = <String>[
                  if ((s.provider ?? '').isNotEmpty) s.provider!,
                  if (s.dateReceived != null) Fmt.date(s.dateReceived),
                  if ((s.reference ?? '').isNotEmpty) 'Ref ${s.reference}',
                ].join(' · ');
                return Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: Icon(_iconFor(s.sourceType)),
                    title: Text(Fmt.label(s.sourceType)),
                    subtitle: meta.isEmpty ? null : Text(meta),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('${s.currencyCode} ${Fmt.money(s.amount)}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 2),
                        StatusChip(s.status),
                      ],
                    ),
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

IconData _iconFor(String type) {
  switch (type) {
    case 'share_capital':
      return Icons.pie_chart_outline;
    case 'member_savings':
      return Icons.savings_outlined;
    case 'grant':
    case 'donation':
      return Icons.volunteer_activism_outlined;
    case 'external_borrowing':
      return Icons.account_balance_outlined;
    case 'retained_earnings':
      return Icons.trending_up;
    case 'investment_income':
      return Icons.stacked_line_chart;
    default:
      return Icons.account_balance_wallet_outlined;
  }
}

const _sourceTypes = <MapEntry<String, String>>[
  MapEntry('share_capital', 'Share capital'),
  MapEntry('member_savings', 'Member savings'),
  MapEntry('grant', 'Grant'),
  MapEntry('donation', 'Donation'),
  MapEntry('external_borrowing', 'External borrowing'),
  MapEntry('retained_earnings', 'Retained earnings'),
  MapEntry('investment_income', 'Investment income'),
  MapEntry('other', 'Other'),
];

class _FinanceSourceSheet extends ConsumerStatefulWidget {
  const _FinanceSourceSheet();

  @override
  ConsumerState<_FinanceSourceSheet> createState() =>
      _FinanceSourceSheetState();
}

class _FinanceSourceSheetState extends ConsumerState<_FinanceSourceSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _provider = TextEditingController();
  final _reference = TextEditingController();
  final _notes = TextEditingController();
  String _sourceType = 'share_capital';
  DateTime? _dateReceived;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _provider.dispose();
    _reference.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateReceived ?? now,
      firstDate: DateTime(now.year - 20),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) setState(() => _dateReceived = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final amount = num.tryParse(_amount.text.trim().replaceAll(',', ''));
    if (amount == null || amount <= 0) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createFundingSource(
            sourceType: _sourceType,
            amount: amount,
            provider: _provider.text,
            reference: _reference.text,
            dateReceived: _dateReceived,
            notes: _notes.text,
          );
      ref.invalidate(fundingSourcesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Finance source added.')),
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Add finance source',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _sourceType,
              decoration: const InputDecoration(labelText: 'Source type'),
              items: [
                for (final e in _sourceTypes)
                  DropdownMenuItem(value: e.key, child: Text(e.value)),
              ],
              onChanged:
                  _busy ? null : (v) => setState(() => _sourceType = v!),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _amount,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                  labelText: 'Amount', prefixText: 'UGX '),
              validator: (v) {
                final n = num.tryParse((v ?? '').trim().replaceAll(',', ''));
                if (n == null || n <= 0) return 'Enter a valid amount.';
                return null;
              },
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _provider,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                  labelText: 'Provider / origin (optional)'),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _reference,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                  labelText: 'Reference (optional)'),
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: _busy ? null : _pickDate,
              borderRadius: BorderRadius.circular(8),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Date received (optional)',
                  suffixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                ),
                child: Text(
                  _dateReceived == null
                      ? 'Not set'
                      : Fmt.date(_dateReceived),
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _notes,
              minLines: 2,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Notes (optional)'),
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
                    : const Icon(Icons.save_outlined),
                label: const Text('Save source'),
                onPressed: _busy ? null : _save,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

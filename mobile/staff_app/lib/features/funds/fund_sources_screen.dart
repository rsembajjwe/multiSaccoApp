import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../providers.dart';

class FundSourcesScreen extends ConsumerWidget {
  const FundSourcesScreen({super.key, required this.canManage});

  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(fundTypesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Fund types')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Add fund'),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _FundTypeSheet(),
              ),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load fund sources.',
          detail: '$e',
          onRetry: () => ref.invalidate(fundTypesProvider),
        ),
        data: (funds) {
          if (funds.isEmpty) {
            return const EmptyState(
              icon: Icons.account_balance_wallet_outlined,
              message: 'No fund sources configured.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(fundTypesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              itemCount: funds.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final fund = funds[i];
                return Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: Icon(
                      fund.system
                          ? Icons.lock_outline
                          : Icons.account_balance_wallet_outlined,
                    ),
                    title: Text(fund.name),
                    subtitle: Text(
                      '${fund.code} · ${Fmt.label(fund.basis)} basis',
                    ),
                    trailing: StatusChip(fund.active ? 'active' : 'inactive'),
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

class _FundTypeSheet extends ConsumerStatefulWidget {
  const _FundTypeSheet();

  @override
  ConsumerState<_FundTypeSheet> createState() => _FundTypeSheetState();
}

class _FundTypeSheetState extends ConsumerState<_FundTypeSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _code = TextEditingController();
  final _description = TextEditingController();
  String _basis = 'savings';
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    _description.dispose();
    super.dispose();
  }

  void _syncCode(String value) {
    if (_code.text.isNotEmpty) return;
    final code = value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'_+'), '_')
        .replaceAll(RegExp(r'^_|_$'), '');
    if (code.isEmpty || !RegExp(r'^[a-z]').hasMatch(code)) return;
    _code.text = code.length > 40 ? code.substring(0, 40) : code;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createFundType(
            name: _name.text,
            code: _code.text,
            basis: _basis,
            description: _description.text,
          );
      ref.invalidate(fundTypesProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Fund type added.')),
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
              'Add fund type',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _name,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Name'),
              onChanged: _syncCode,
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Enter a name.' : null,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _code,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Code'),
              validator: (v) {
                final value = v == null ? '' : v.trim();
                if (!RegExp(r'^[a-z][a-z0-9_]{1,39}$').hasMatch(value)) {
                  return 'Use lowercase letters, numbers or underscores.';
                }
                return null;
              },
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _basis,
              decoration: const InputDecoration(labelText: 'Basis'),
              items: const [
                DropdownMenuItem(value: 'savings', child: Text('Savings')),
                DropdownMenuItem(value: 'shares', child: Text('Shares')),
                DropdownMenuItem(value: 'welfare', child: Text('Welfare')),
              ],
              onChanged: _busy ? null : (v) => setState(() => _basis = v!),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _description,
              minLines: 2,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description'),
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
                label: const Text('Save fund'),
                onPressed: _busy ? null : _save,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

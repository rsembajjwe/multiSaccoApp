import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class FundSourcesScreen extends ConsumerWidget {
  const FundSourcesScreen(
      {super.key, required this.canManage, this.embedded = false});

  final bool canManage;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(fundTypesProvider);
    return Scaffold(
      appBar: embedded ? null : AppBar(title: const Text('Fund types')),
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
          message: 'Could not load fund types.',
          detail: '$e',
          onRetry: () => ref.invalidate(fundTypesProvider),
        ),
        data: (funds) {
          if (funds.isEmpty) {
            return const EmptyState(
              icon: Icons.account_balance_wallet_outlined,
              message: 'No fund types configured.',
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
                  clipBehavior: Clip.antiAlias,
                  child: ListTile(
                    onTap: canManage
                        ? () => showModalBottomSheet<void>(
                              context: context,
                              isScrollControlled: true,
                              showDragHandle: true,
                              builder: (_) => _FundTypeSheet(fundType: fund),
                            )
                        : null,
                    leading: Icon(
                      fund.system
                          ? Icons.lock_outline
                          : Icons.account_balance_wallet_outlined,
                    ),
                    title: Text(fund.name),
                    subtitle: Text(
                      '${fund.code} · ${Fmt.label(fund.basis)} basis',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        StatusChip(fund.active ? 'active' : 'inactive'),
                        if (canManage) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right),
                        ],
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

class _FundTypeSheet extends ConsumerStatefulWidget {
  const _FundTypeSheet({this.fundType});

  final FundType? fundType;

  @override
  ConsumerState<_FundTypeSheet> createState() => _FundTypeSheetState();
}

class _FundTypeSheetState extends ConsumerState<_FundTypeSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _description;
  late final TextEditingController _displayOrder;
  late String _basis;
  late bool _active;
  bool _busy = false;

  bool get _isEdit => widget.fundType != null;

  @override
  void initState() {
    super.initState();
    final fundType = widget.fundType;
    _name = TextEditingController(text: fundType?.name ?? '');
    _description = TextEditingController(text: fundType?.description ?? '');
    _displayOrder =
        TextEditingController(text: '${fundType?.displayOrder ?? 100}');
    _basis = fundType?.basis ?? 'savings';
    _active = fundType?.active ?? true;
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _displayOrder.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final repository = ref.read(adminRepositoryProvider);
      if (_isEdit) {
        await repository.updateFundType(
          widget.fundType!.id,
          name: _name.text,
          basis: _basis,
          description: _description.text,
          active: _active,
          displayOrder: int.parse(_displayOrder.text.trim()),
        );
      } else {
        await repository.createFundType(
          name: _name.text,
          basis: _basis,
          description: _description.text,
        );
      }
      ref.invalidate(fundTypesProvider);
      ref.invalidate(saccoStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isEdit ? 'Fund type updated.' : 'Fund type added.',
            ),
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
                _isEdit ? 'Edit fund type' : 'Add fund type',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _name,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Name',
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Enter a name.' : null,
              ),
              const SizedBox(height: 10),
              if (_isEdit) ...[
                TextFormField(
                  initialValue: widget.fundType!.code,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Code',
                    helperText: 'The fund code cannot be changed.',
                  ),
                ),
                const SizedBox(height: 10),
              ] else ...[
                const Text(
                  'A simple unique code will be generated automatically.',
                ),
                const SizedBox(height: 10),
              ],
              DropdownButtonFormField<String>(
                initialValue: _basis,
                decoration: InputDecoration(
                  labelText: 'Basis',
                  helperText: widget.fundType?.system == true
                      ? 'The basis of a built-in fund cannot be changed.'
                      : null,
                ),
                items: const [
                  DropdownMenuItem(value: 'savings', child: Text('Savings')),
                  DropdownMenuItem(value: 'shares', child: Text('Shares')),
                  DropdownMenuItem(value: 'welfare', child: Text('Welfare')),
                ],
                onChanged: _busy || widget.fundType?.system == true
                    ? null
                    : (v) => setState(() => _basis = v!),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _description,
                minLines: 2,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              if (_isEdit) ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _displayOrder,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Display order'),
                  validator: (value) =>
                      int.tryParse(value?.trim() ?? '') == null
                          ? 'Enter a whole number.'
                          : null,
                ),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Active'),
                  subtitle: widget.fundType!.system
                      ? const Text('Built-in funds must remain active.')
                      : null,
                  value: _active,
                  onChanged: _busy || widget.fundType!.system
                      ? null
                      : (value) => setState(() => _active = value),
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
                      : const Icon(Icons.save_outlined),
                  label: Text(_isEdit ? 'Save changes' : 'Save fund'),
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

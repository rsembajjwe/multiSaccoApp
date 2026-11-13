import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Savings and fund product setup. Add and edit products with fund-types:manage.
class FinancialProductsScreen extends ConsumerWidget {
  const FinancialProductsScreen(
      {super.key, this.embedded = false, this.canManage = false});

  final bool embedded;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(financialProductsProvider);
    return Scaffold(
      appBar: embedded ? null : AppBar(title: const Text('Products')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Add product'),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _ProductSheet(),
              ),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load products.',
          detail: '$e',
          onRetry: () => ref.invalidate(financialProductsProvider),
        ),
        data: (products) {
          if (products.isEmpty) {
            return const EmptyState(
              icon: Icons.category_outlined,
              message: 'No products configured.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(financialProductsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) =>
                  _ProductTile(products[i], canManage: canManage),
            ),
          );
        },
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile(this.product, {required this.canManage});
  final FinancialProduct product;
  final bool canManage;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: canManage
            ? () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  showDragHandle: true,
                  builder: (_) => _ProductSheet(product: product),
                )
            : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.category_outlined,
                        color: scheme.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name.isEmpty ? product.code : product.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15)),
                        if (product.code.isNotEmpty)
                          Text(product.code,
                              style: TextStyle(
                                  fontSize: 12, color: scheme.outline)),
                      ],
                    ),
                  ),
                  StatusChip(product.status),
                  if (canManage)
                    Padding(
                      padding: const EdgeInsets.only(left: 4),
                      child: Icon(Icons.chevron_right,
                          size: 20, color: scheme.outline),
                    ),
                ],
              ),
              if (product.productType.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(product.productType.replaceAll('_', ' '),
                    style: TextStyle(fontSize: 12.5, color: scheme.outline)),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _mini(context, 'Contribution',
                      Fmt.money(product.contributionAmount)),
                  _mini(context, 'Min balance',
                      Fmt.money(product.minimumBalance)),
                  _mini(context, 'Interest', product.interestLabel),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _mini(BuildContext context, String label, String value) {
    final scheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: scheme.outline)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(
                  fontSize: 13.5, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Add (product == null) or edit an existing product.
class _ProductSheet extends ConsumerStatefulWidget {
  const _ProductSheet({this.product});
  final FinancialProduct? product;
  @override
  ConsumerState<_ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends ConsumerState<_ProductSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _code;
  late final TextEditingController _name;
  late final TextEditingController _contribution;
  late final TextEditingController _minBalance;
  late final TextEditingController _interest;
  FundType? _fund;
  late String _status;
  bool _busy = false;

  bool get _isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _code = TextEditingController(text: p?.code ?? '');
    _name = TextEditingController(text: p?.name ?? '');
    _contribution =
        TextEditingController(text: p == null ? '0' : '${p.contributionAmount}');
    _minBalance =
        TextEditingController(text: p == null ? '0' : '${p.minimumBalance}');
    _interest = TextEditingController(
        text: (p == null || p.interestRate == 0) ? '' : '${p.interestRate}');
    _status = p?.status.isNotEmpty == true ? p!.status : 'active';
  }

  @override
  void dispose() {
    _code.dispose();
    _name.dispose();
    _contribution.dispose();
    _minBalance.dispose();
    _interest.dispose();
    super.dispose();
  }

  num _numOf(String t) => num.tryParse(t.trim().replaceAll(',', '')) ?? 0;

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_isEdit && _fund == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Choose a fund type.')));
      return;
    }
    setState(() => _busy = true);
    try {
      final repo = ref.read(adminRepositoryProvider);
      final interest =
          _interest.text.trim().isEmpty ? null : _numOf(_interest.text);
      if (_isEdit) {
        await repo.updateFinancialProduct(
          widget.product!.id,
          name: _name.text,
          contributionAmount: _numOf(_contribution.text),
          minimumBalance: _numOf(_minBalance.text),
          interestRate: interest,
          status: _status,
        );
      } else {
        await repo.createFinancialProduct(
          productType: _fund!.code,
          code: _code.text,
          name: _name.text,
          contributionAmount: _numOf(_contribution.text),
          minimumBalance: _numOf(_minBalance.text),
          interestRate: interest,
        );
      }
      ref.invalidate(financialProductsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEdit ? 'Product updated.' : 'Product added.')),
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
    final fundsAsync = ref.watch(fundTypesProvider);
    final p = widget.product;
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
              Text(_isEdit ? 'Edit product' : 'Add product',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              if (_isEdit)
                InputDecorator(
                  decoration: const InputDecoration(labelText: 'Fund type'),
                  child: Text(p!.productType.replaceAll('_', ' ')),
                )
              else
                fundsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: LinearProgressIndicator(),
                  ),
                  error: (e, _) => Text('Could not load fund types: $e',
                      style: const TextStyle(color: Color(0xFFB91C1C))),
                  data: (funds) {
                    final active = funds.where((f) => f.active).toList();
                    if (active.isEmpty) {
                      return const Text('Configure a fund type first.');
                    }
                    _fund ??= active.first;
                    return DropdownButtonFormField<String>(
                      initialValue: _fund!.id,
                      decoration: const InputDecoration(labelText: 'Fund type'),
                      items: [
                        for (final f in active)
                          DropdownMenuItem(value: f.id, child: Text(f.name)),
                      ],
                      onChanged: _busy
                          ? null
                          : (v) => setState(() =>
                              _fund = active.firstWhere((f) => f.id == v)),
                    );
                  },
                ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Product name'),
                validator: (v) =>
                    (v ?? '').trim().isEmpty ? 'Enter a name.' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _code,
                readOnly: _isEdit,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  labelText: 'Code',
                  hintText: 'e.g. SAV-STD',
                  helperText: _isEdit ? 'Code cannot be changed' : null,
                ),
                validator: (v) =>
                    (v ?? '').trim().isEmpty ? 'Enter a code.' : null,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _contribution,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                          labelText: 'Contribution', prefixText: 'UGX '),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _minBalance,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                          labelText: 'Min balance', prefixText: 'UGX '),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _interest,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                    labelText: 'Interest rate (optional)', suffixText: '%'),
              ),
              if (_isEdit) ...[
                const SizedBox(height: 14),
                Text('Status',
                    style: TextStyle(
                        fontSize: 12.5,
                        color: Theme.of(context).colorScheme.onSurfaceVariant)),
                const SizedBox(height: 6),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'active', label: Text('Active')),
                    ButtonSegment(value: 'inactive', label: Text('Inactive')),
                  ],
                  selected: {_status},
                  onSelectionChanged: _busy
                      ? null
                      : (v) => setState(() => _status = v.first),
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
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_outlined),
                  label: Text(_isEdit ? 'Save changes' : 'Save product'),
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

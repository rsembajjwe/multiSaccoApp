import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../providers.dart';

/// Suppliers / payees that operating expenses can be attributed to.
class SuppliersScreen extends ConsumerWidget {
  const SuppliersScreen(
      {super.key, required this.canManage, this.embedded = false});

  final bool canManage;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(suppliersProvider);
    return Scaffold(
      appBar: embedded ? null : AppBar(title: const Text('Suppliers')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('Add supplier'),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _SupplierSheet(),
              ),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load suppliers.',
          detail: '$e',
          onRetry: () => ref.invalidate(suppliersProvider),
        ),
        data: (suppliers) {
          if (suppliers.isEmpty) {
            return const EmptyState(
              icon: Icons.storefront_outlined,
              message: 'No suppliers added yet.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(suppliersProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              itemCount: suppliers.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final s = suppliers[i];
                final meta = <String>[
                  if ((s.phone ?? '').isNotEmpty) s.phone!,
                  if ((s.email ?? '').isNotEmpty) s.email!,
                  if ((s.taxId ?? '').isNotEmpty) 'TIN ${s.taxId}',
                ].join(' · ');
                return Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: const Icon(Icons.storefront_outlined),
                    title: Text(s.name),
                    subtitle: meta.isEmpty ? null : Text(meta),
                    trailing: StatusChip(s.status),
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

class _SupplierSheet extends ConsumerStatefulWidget {
  const _SupplierSheet();
  @override
  ConsumerState<_SupplierSheet> createState() => _SupplierSheetState();
}

class _SupplierSheetState extends ConsumerState<_SupplierSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _taxId = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _taxId.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createSupplier(
            name: _name.text,
            phone: _phone.text,
            email: _email.text,
            taxId: _taxId.text,
          );
      ref.invalidate(suppliersProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Supplier added.')),
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
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Add supplier',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            TextFormField(
              controller: _name,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Name'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Enter a name.' : null,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration:
                  const InputDecoration(labelText: 'Phone (optional)'),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration:
                  const InputDecoration(labelText: 'Email (optional)'),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _taxId,
              decoration:
                  const InputDecoration(labelText: 'Tax ID / TIN (optional)'),
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
                label: const Text('Save supplier'),
                onPressed: _busy ? null : _save,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

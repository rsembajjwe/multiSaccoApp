import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// The SACCO's branches.
class BranchesScreen extends ConsumerWidget {
  const BranchesScreen({super.key, required this.canManage});

  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(branchesProvider);
    final staff = ref.watch(staffNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Branches')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showBranchDialog(context, ref),
              icon: const Icon(Icons.add_business_outlined),
              label: const Text('Add branch'),
            )
          : null,
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load branches.',
          detail: '$e',
          onRetry: () => ref.invalidate(branchesProvider),
        ),
        data: (branches) {
          if (branches.isEmpty) {
            return const EmptyState(
                icon: Icons.account_tree_outlined,
                message: 'No branches on record.');
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(branchesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: branches.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final b = branches[i];
                final scheme = Theme.of(context).colorScheme;
                final manager = staff[b.managerUserId];
                return Card(
                  margin: EdgeInsets.zero,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: canManage
                        ? () => _showBranchDialog(context, ref, branch: b)
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: scheme.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.account_tree_outlined,
                                color: scheme.primary, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                          b.name.isEmpty ? b.code : b.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700)),
                                    ),
                                    if (b.code.isNotEmpty)
                                      Text(b.code,
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: scheme.onSurfaceVariant)),
                                  ],
                                ),
                                if (b.address.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(b.address,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: scheme.onSurfaceVariant)),
                                ],
                                if (manager != null && manager.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text('Manager: $manager',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: scheme.onSurfaceVariant)),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusChip(b.status.isEmpty ? 'active' : b.status),
                          if (canManage) ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.edit_outlined, size: 20),
                          ],
                        ],
                      ),
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

  Future<void> _showBranchDialog(
    BuildContext context,
    WidgetRef ref, {
    Branch? branch,
  }) async {
    final changed = await showDialog<bool>(
      context: context,
      builder: (_) => _BranchDialog(branch: branch),
    );
    if (changed == true) ref.invalidate(branchesProvider);
  }
}

class _BranchDialog extends ConsumerStatefulWidget {
  const _BranchDialog({this.branch});

  final Branch? branch;

  @override
  ConsumerState<_BranchDialog> createState() => _BranchDialogState();
}

class _BranchDialogState extends ConsumerState<_BranchDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _code;
  late final TextEditingController _name;
  late final TextEditingController _address;
  String? _managerUserId;
  String _status = 'active';
  bool _busy = false;

  bool get _editing => widget.branch != null;

  @override
  void initState() {
    super.initState();
    _code = TextEditingController(text: widget.branch?.code ?? '');
    _name = TextEditingController(text: widget.branch?.name ?? '');
    _address = TextEditingController(text: widget.branch?.address ?? '');
    final managerUserId = widget.branch?.managerUserId ?? '';
    _managerUserId = managerUserId.isEmpty ? null : managerUserId;
    _status = widget.branch?.status.toLowerCase() == 'inactive'
        ? 'inactive'
        : 'active';
  }

  @override
  void dispose() {
    _code.dispose();
    _name.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final repository = ref.read(adminRepositoryProvider);
      if (_editing) {
        await repository.updateBranch(
          branchId: widget.branch!.id,
          code: _code.text,
          name: _name.text,
          address: _address.text,
          managerUserId: _managerUserId,
          status: _status,
        );
      } else {
        await repository.createBranch(
          code: _code.text,
          name: _name.text,
          address: _address.text,
          managerUserId: _managerUserId,
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Could not ${_editing ? 'update' : 'create'} branch. $error',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(usersProvider).asData?.value ?? const [];
    return AlertDialog(
      title: Text(_editing ? 'Edit branch' : 'Add branch'),
      content: SizedBox(
        width: 440,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextFormField(
                controller: _code,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Branch code',
                  helperText: 'A short unique code, for example KLA.',
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Enter a branch code.'
                    : null,
              ),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Branch name'),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Enter a branch name.'
                    : null,
              ),
              TextFormField(
                controller: _address,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Address'),
              ),
              DropdownButtonFormField<String>(
                initialValue: _managerUserId,
                decoration:
                    const InputDecoration(labelText: 'Manager (optional)'),
                items: users
                    .where((user) =>
                        user.status.toLowerCase() == 'active' ||
                        user.id == _managerUserId)
                    .map((user) => DropdownMenuItem(
                          value: user.id,
                          child: Text(user.fullName.isEmpty
                              ? user.email
                              : user.fullName),
                        ))
                    .toList(),
                onChanged: _busy
                    ? null
                    : (value) => setState(() => _managerUserId = value),
              ),
              if (_editing)
                DropdownButtonFormField<String>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: const [
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(
                      value: 'inactive',
                      child: Text('Inactive'),
                    ),
                  ],
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _status = value ?? _status),
                ),
            ]),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: _busy
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(_editing ? 'Save changes' : 'Create branch'),
        ),
      ],
    );
  }
}

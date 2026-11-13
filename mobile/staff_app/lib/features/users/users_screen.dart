import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Staff users and roles for the SACCO.
class UsersScreen extends ConsumerWidget {
  const UsersScreen({
    super.key,
    required this.canViewUsers,
    required this.canManageUsers,
    required this.canViewRoles,
    required this.canCreateRoles,
  });

  final bool canViewUsers;
  final bool canManageUsers;
  final bool canViewRoles;
  final bool canCreateRoles;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tabs = <Tab>[];
    final views = <Widget>[];
    if (canViewUsers) {
      tabs.add(const Tab(text: 'Staff'));
      views.add(
          _StaffTab(canManage: canManageUsers, canViewRoles: canViewRoles));
    }
    if (canViewRoles) {
      tabs.add(const Tab(text: 'Roles'));
      views.add(_RolesTab(canCreate: canCreateRoles));
    }
    if (tabs.isEmpty) {
      return const Scaffold(
          body: EmptyState(
        icon: Icons.lock_outline,
        message: 'You do not have permission to view users or roles.',
      ));
    }
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Users & roles'),
          bottom: tabs.length > 1 ? TabBar(tabs: tabs) : null,
        ),
        body: tabs.length > 1 ? TabBarView(children: views) : views.first,
      ),
    );
  }
}

class _StaffTab extends ConsumerWidget {
  const _StaffTab({required this.canManage, required this.canViewRoles});

  final bool canManage;
  final bool canViewRoles;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(usersProvider);
    return async.when(
      loading: () => const ListSkeleton(),
      error: (e, _) => ErrorRetry(
        message: 'Could not load staff.',
        detail: '$e',
        onRetry: () => ref.invalidate(usersProvider),
      ),
      data: (users) {
        final addButton = canManage
            ? Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: FilledButton.icon(
                  onPressed: () => _showCreateUser(context, ref),
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Add staff account'),
                ),
              )
            : const SizedBox.shrink();
        if (users.isEmpty) {
          return Column(children: [
            addButton,
            const Expanded(
                child: EmptyState(
                    icon: Icons.badge_outlined,
                    message: 'No staff users found.')),
          ]);
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(usersProvider),
          child: ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              addButton,
              ...users.map((user) => Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: _UserTile(
                      user: user,
                      canManage: canManage,
                      canViewRoles: canViewRoles,
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showCreateUser(BuildContext context, WidgetRef ref) async {
    final created = await showDialog<bool>(
      context: context,
      builder: (_) => _CreateUserDialog(canAssignRole: canViewRoles),
    );
    if (created == true) ref.invalidate(usersProvider);
  }
}

class _UserTile extends ConsumerWidget {
  const _UserTile({
    required this.user,
    required this.canManage,
    required this.canViewRoles,
  });
  final AppUser user;
  final bool canManage;
  final bool canViewRoles;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final initials = user.fullName.trim().isEmpty
        ? '?'
        : user.fullName
            .trim()
            .split(RegExp(r'\s+'))
            .take(2)
            .map((p) => p[0].toUpperCase())
            .join();
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: canViewRoles || canManage ? () => _showUser(context, ref) : null,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: scheme.primaryContainer,
                child: Text(initials,
                    style: TextStyle(
                        color: scheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.fullName.isEmpty ? '—' : user.fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(user.email.isEmpty ? user.phone : user.email,
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
                  StatusChip(user.status),
                  if (user.mfaEnabled) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified_user_outlined,
                            size: 13, color: scheme.primary),
                        const SizedBox(width: 3),
                        Text('MFA',
                            style:
                                TextStyle(fontSize: 11, color: scheme.primary)),
                      ],
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showUser(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _UserManagementSheet(
        user: user,
        canManage: canManage,
        canViewRoles: canViewRoles,
      ),
    );
  }
}

class _CreateUserDialog extends ConsumerStatefulWidget {
  const _CreateUserDialog({required this.canAssignRole});

  final bool canAssignRole;

  @override
  ConsumerState<_CreateUserDialog> createState() => _CreateUserDialogState();
}

class _CreateUserDialogState extends ConsumerState<_CreateUserDialog> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  bool _busy = false;
  String _deliveryChannel = 'email';
  String? _roleId;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final repository = ref.read(adminRepositoryProvider);
      final user = await repository.createUser(
        fullName: _name.text,
        email: _email.text,
        phone: _phone.text,
        deliveryChannel: _deliveryChannel,
      );
      if (_roleId != null) {
        await repository.replaceUserRoles(user.id, [_roleId!]);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not create staff account. $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roles = widget.canAssignRole
        ? ref.watch(rolesProvider).asData?.value ?? const <AppRole>[]
        : const <AppRole>[];
    return AlertDialog(
      title: const Text('Add staff account'),
      content: SizedBox(
        width: 440,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name'),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Enter the staff member name.'
                    : null,
              ),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (value) {
                  final email = value?.trim() ?? '';
                  if (_deliveryChannel == 'email' &&
                      (!email.contains('@') || !email.contains('.'))) {
                    return 'Enter a valid email address.';
                  }
                  return null;
                },
              ),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration:
                    const InputDecoration(labelText: 'Phone (+256...)'),
                validator: (value) {
                  final phone = value?.trim() ?? '';
                  if (_deliveryChannel == 'sms' &&
                      !RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(phone)) {
                    return 'Enter a valid international phone number.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                      value: 'email',
                      icon: Icon(Icons.email_outlined),
                      label: Text('Email')),
                  ButtonSegment(
                      value: 'sms',
                      icon: Icon(Icons.sms_outlined),
                      label: Text('SMS')),
                ],
                selected: {_deliveryChannel},
                onSelectionChanged: _busy
                    ? null
                    : (selected) => setState(
                        () => _deliveryChannel = selected.first),
              ),
              const SizedBox(height: 8),
              Text(
                'A secure temporary password will be generated and sent through the selected channel. Contact ownership is verified when it is used for the mandatory first-login password change.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (widget.canAssignRole)
                DropdownButtonFormField<String>(
                  initialValue: _roleId,
                  decoration: const InputDecoration(labelText: 'Initial role'),
                  items: roles
                      .map((role) => DropdownMenuItem(
                            value: role.id,
                            child: Text(role.name),
                          ))
                      .toList(),
                  onChanged: _busy ? null : (value) => _roleId = value,
                  validator: (value) => value == null
                      ? 'Assign an initial role to this account.'
                      : null,
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
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Create'),
        ),
      ],
    );
  }
}

class _UserManagementSheet extends ConsumerStatefulWidget {
  const _UserManagementSheet({
    required this.user,
    required this.canManage,
    required this.canViewRoles,
  });

  final AppUser user;
  final bool canManage;
  final bool canViewRoles;

  @override
  ConsumerState<_UserManagementSheet> createState() =>
      _UserManagementSheetState();
}

class _UserManagementSheetState extends ConsumerState<_UserManagementSheet> {
  Set<String>? _selectedRoleIds;
  bool _busy = false;

  Future<void> _run(Future<void> Function() action, String success) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(usersProvider);
      ref.invalidate(userRoleIdsProvider(widget.user.id));
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(success)));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed. $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestReset() async {
    setState(() => _busy = true);
    try {
      final token = await ref
          .read(adminRepositoryProvider)
          .requestUserPasswordReset(widget.user.id);
      ref.invalidate(usersProvider);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Password reset created'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text(
                'Give this one-time reset token to the staff member securely. It expires in 30 minutes.'),
            const SizedBox(height: 12),
            SelectableText(token),
          ]),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            )
          ],
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not create password reset. $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rolesAsync = widget.canViewRoles ? ref.watch(rolesProvider) : null;
    final idsAsync = widget.canViewRoles
        ? ref.watch(userRoleIdsProvider(widget.user.id))
        : null;
    final roles = rolesAsync?.asData?.value ?? const <AppRole>[];
    final loadedIds = idsAsync?.asData?.value;
    _selectedRoleIds ??= loadedIds == null ? null : {...loadedIds};

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
            20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  widget.user.fullName.isEmpty
                      ? 'Staff member'
                      : widget.user.fullName,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800)),
              Text(widget.user.email,
                  style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: [
                StatusChip(widget.user.status),
                if (widget.user.mfaEnabled) const StatusChip('MFA enabled'),
                StatusChip(
                    '${widget.user.activeSessionCount} active session(s)'),
              ]),
              if (widget.canViewRoles) ...[
                const SizedBox(height: 20),
                Text('Assigned roles',
                    style: Theme.of(context).textTheme.titleSmall),
                if (rolesAsync!.isLoading || idsAsync!.isLoading)
                  const Center(
                      child: Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator()))
                else if (rolesAsync.hasError || idsAsync.hasError)
                  Text('Could not load role assignments.',
                      style:
                          TextStyle(color: Theme.of(context).colorScheme.error))
                else
                  ...roles.map((role) => CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        title: Text(role.name),
                        subtitle:
                            Text('${role.permissionIds.length} permissions'),
                        value: _selectedRoleIds?.contains(role.id) ?? false,
                        onChanged: !widget.canManage || _busy
                            ? null
                            : (selected) => setState(() {
                                  if (selected == true) {
                                    _selectedRoleIds?.add(role.id);
                                  } else {
                                    _selectedRoleIds?.remove(role.id);
                                  }
                                }),
                      )),
                if (widget.canManage && roles.isNotEmpty)
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.tonal(
                      onPressed: _busy || (_selectedRoleIds?.isEmpty ?? true)
                          ? null
                          : () => _run(
                              () => ref
                                  .read(adminRepositoryProvider)
                                  .replaceUserRoles(widget.user.id,
                                      _selectedRoleIds!.toList()),
                              'Role assignments updated.'),
                      child: const Text('Save roles'),
                    ),
                  ),
              ],
              if (widget.canManage) ...[
                const Divider(height: 32),
                Text('Account controls',
                    style: Theme.of(context).textTheme.titleSmall),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Account active'),
                  value: widget.user.status.toLowerCase() == 'active',
                  onChanged: _busy
                      ? null
                      : (active) => _run(
                          () => ref
                              .read(adminRepositoryProvider)
                              .updateUserStatus(widget.user.id,
                                  active ? 'active' : 'suspended'),
                          active ? 'Account activated.' : 'Account suspended.'),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('MFA enabled'),
                  value: widget.user.mfaEnabled,
                  onChanged: _busy
                      ? null
                      : (enabled) => _run(
                          () => ref
                              .read(adminRepositoryProvider)
                              .updateUserMfa(widget.user.id, enabled),
                          enabled ? 'MFA enabled.' : 'MFA disabled.'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.password_outlined),
                  title: const Text('Create password reset'),
                  onTap: _busy ? null : _requestReset,
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.logout_outlined),
                  title: const Text('Revoke active sessions'),
                  onTap: _busy
                      ? null
                      : () => _run(
                          () async => ref
                              .read(adminRepositoryProvider)
                              .revokeUserSessions(widget.user.id),
                          'Active sessions revoked.'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _RolesTab extends ConsumerWidget {
  const _RolesTab({required this.canCreate});

  final bool canCreate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(rolesProvider);
    return async.when(
      loading: () => const ListSkeleton(),
      error: (e, _) => ErrorRetry(
        message: 'Could not load roles.',
        detail: '$e',
        onRetry: () => ref.invalidate(rolesProvider),
      ),
      data: (roles) {
        final createButton = canCreate
            ? Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: FilledButton.icon(
                  onPressed: () => _showRoleDialog(context, ref),
                  icon: const Icon(Icons.add_moderator_outlined),
                  label: const Text('Create custom role'),
                ),
              )
            : const SizedBox.shrink();
        if (roles.isEmpty) {
          return Column(children: [
            createButton,
            const Expanded(
              child: EmptyState(
                  icon: Icons.shield_outlined, message: 'No roles defined.'),
            ),
          ]);
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(rolesProvider),
          child: ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              createButton,
              ...roles.map((role) => Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: _RoleTile(
                      role: role,
                      onEdit: canCreate && !role.protectedRole
                          ? () => _showRoleDialog(context, ref, role: role)
                          : null,
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showRoleDialog(
    BuildContext context,
    WidgetRef ref, {
    AppRole? role,
  }) async {
    final changed = await showDialog<bool>(
      context: context,
      builder: (_) => _RoleDialog(role: role),
    );
    if (changed == true) ref.invalidate(rolesProvider);
  }
}

class _RoleDialog extends ConsumerStatefulWidget {
  const _RoleDialog({this.role});

  final AppRole? role;

  @override
  ConsumerState<_RoleDialog> createState() => _RoleDialogState();
}

class _RoleDialogState extends ConsumerState<_RoleDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  final _selected = <String>{};
  bool _busy = false;

  bool get _editing => widget.role != null;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.role?.name ?? '');
    _selected.addAll(widget.role?.permissionIds ?? const []);
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one permission.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final repository = ref.read(adminRepositoryProvider);
      if (_editing) {
        await repository.updateRole(
          roleId: widget.role!.id,
          name: _name.text,
          permissionIds: _selected.toList(),
        );
      } else {
        await repository.createRole(
          name: _name.text,
          permissionIds: _selected.toList(),
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Could not ${_editing ? 'update' : 'create'} role. $error',
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
    final permissionsAsync = ref.watch(permissionsCatalogProvider);
    final permissions =
        permissionsAsync.asData?.value ?? const <AppPermission>[];
    final modules = <String, List<AppPermission>>{};
    for (final permission in permissions) {
      modules.putIfAbsent(permission.module, () => []).add(permission);
    }
    return AlertDialog(
      title: Text(_editing ? 'Edit custom role' : 'Create custom role'),
      content: SizedBox(
        width: 520,
        height: MediaQuery.sizeOf(context).height * 0.65,
        child: Form(
          key: _formKey,
          child: Column(children: [
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Role name'),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Enter a role name.'
                  : null,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: permissionsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => ErrorRetry(
                  message: 'Could not load permissions.',
                  detail: '$error',
                  onRetry: () => ref.invalidate(permissionsCatalogProvider),
                ),
                data: (_) => ListView(
                  children: modules.entries.map((entry) {
                    final allSelected = entry.value.every(
                      (permission) => _selected.contains(permission.id),
                    );
                    return ExpansionTile(
                      title: Text(entry.key),
                      subtitle: Text('${entry.value.length} permission(s)'),
                      trailing: Checkbox(
                        value: allSelected,
                        onChanged: _busy
                            ? null
                            : (checked) => setState(() {
                                  for (final permission in entry.value) {
                                    if (checked == true) {
                                      _selected.add(permission.id);
                                    } else {
                                      _selected.remove(permission.id);
                                    }
                                  }
                                }),
                      ),
                      children: entry.value
                          .map((permission) => CheckboxListTile(
                                dense: true,
                                title: Text(permission.action),
                                subtitle: permission.description.isEmpty
                                    ? null
                                    : Text(permission.description),
                                value: _selected.contains(permission.id),
                                onChanged: _busy
                                    ? null
                                    : (checked) => setState(() {
                                          if (checked == true) {
                                            _selected.add(permission.id);
                                          } else {
                                            _selected.remove(permission.id);
                                          }
                                        }),
                              ))
                          .toList(),
                    );
                  }).toList(),
                ),
              ),
            ),
          ]),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _busy || permissions.isEmpty ? null : _save,
          child: _busy
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(_editing ? 'Save changes' : 'Create role'),
        ),
      ],
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({required this.role, this.onEdit});
  final AppRole role;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.shield_outlined,
                    color: scheme.primary, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(role.name.isEmpty ? '—' : role.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('${role.permissionIds.length} permission(s)',
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              if (role.protectedRole)
                const StatusChip('protected')
              else if (onEdit != null)
                const Icon(Icons.edit_outlined, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

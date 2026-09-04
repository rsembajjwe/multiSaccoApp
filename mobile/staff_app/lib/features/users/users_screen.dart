import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/error_retry.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Staff users and roles for the SACCO (view).
class UsersScreen extends ConsumerWidget {
  const UsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Users & roles'),
          bottom: const TabBar(tabs: [
            Tab(text: 'Staff'),
            Tab(text: 'Roles'),
          ]),
        ),
        body: const TabBarView(
          children: [_StaffTab(), _RolesTab()],
        ),
      ),
    );
  }
}

class _StaffTab extends ConsumerWidget {
  const _StaffTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(usersProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorRetry(
        message: 'Could not load staff.',
        detail: '$e',
        onRetry: () => ref.invalidate(usersProvider),
      ),
      data: (users) {
        if (users.isEmpty) {
          return const EmptyState(
              icon: Icons.badge_outlined, message: 'No staff users found.');
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(usersProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: users.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _UserTile(user: users[i]),
          ),
        );
      },
    );
  }
}

class _UserTile extends ConsumerWidget {
  const _UserTile({required this.user});
  final AppUser user;

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
        onTap: () => _showRoles(context, ref),
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
                            style: TextStyle(
                                fontSize: 11, color: scheme.primary)),
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

  void _showRoles(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user.fullName.isEmpty ? 'Staff member' : user.fullName,
                style: Theme.of(ctx)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
            if (user.email.isNotEmpty)
              Text(user.email,
                  style: Theme.of(ctx).textTheme.bodySmall),
            const SizedBox(height: 16),
            Text('Roles', style: Theme.of(ctx).textTheme.titleSmall),
            const SizedBox(height: 8),
            Consumer(builder: (c, r, _) {
              final rolesAsync = r.watch(rolesProvider);
              final idsAsync = r.watch(userRoleIdsProvider(user.id));
              if (idsAsync.isLoading || rolesAsync.isLoading) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (idsAsync.hasError) {
                return Text('Could not load roles. ${idsAsync.error}',
                    style: TextStyle(color: Theme.of(c).colorScheme.error));
              }
              final ids = idsAsync.asData?.value ?? const [];
              final roleMap = {
                for (final role in rolesAsync.asData?.value ?? const <AppRole>[])
                  role.id: role.name
              };
              if (ids.isEmpty) {
                return const Text('No roles assigned.');
              }
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ids
                    .map((id) => Chip(label: Text(roleMap[id] ?? id)))
                    .toList(),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _RolesTab extends ConsumerWidget {
  const _RolesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(rolesProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorRetry(
        message: 'Could not load roles.',
        detail: '$e',
        onRetry: () => ref.invalidate(rolesProvider),
      ),
      data: (roles) {
        if (roles.isEmpty) {
          return const EmptyState(
              icon: Icons.shield_outlined, message: 'No roles defined.');
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(rolesProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: roles.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _RoleTile(role: roles[i]),
          ),
        );
      },
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({required this.role});
  final AppRole role;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
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
              child: Icon(Icons.shield_outlined, color: scheme.primary, size: 18),
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
            if (role.protectedRole) const StatusChip('protected'),
          ],
        ),
      ),
    );
  }
}

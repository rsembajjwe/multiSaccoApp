import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../providers.dart';

/// The SACCO's branches (read-only).
class BranchesScreen extends ConsumerWidget {
  const BranchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(branchesProvider);
    final staff = ref.watch(staffNamesProvider).asData?.value ?? const {};
    return Scaffold(
      appBar: AppBar(title: const Text('Branches')),
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

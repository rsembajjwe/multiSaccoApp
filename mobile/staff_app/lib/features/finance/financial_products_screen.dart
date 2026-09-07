import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Savings & loan product setup (read-only).
class FinancialProductsScreen extends ConsumerWidget {
  const FinancialProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(financialProductsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
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
              itemBuilder: (_, i) => _ProductTile(products[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile(this.product);
  final FinancialProduct product;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
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
                _mini(context, 'Contribution', Fmt.money(product.contributionAmount)),
                _mini(context, 'Min balance', Fmt.money(product.minimumBalance)),
                _mini(context, 'Interest', product.interestLabel),
              ],
            ),
          ],
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

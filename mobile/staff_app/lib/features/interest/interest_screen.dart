import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Interest income (profit) booked per year, derived from the loan book.
/// Interest is attributed to the year each loan was disbursed.
class InterestScreen extends ConsumerWidget {
  const InterestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(interestByYearProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Interest income')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(
          message: 'Could not load interest figures.',
          detail: '$e',
          onRetry: () => ref.invalidate(interestByYearProvider),
        ),
        data: (years) {
          if (years.isEmpty) {
            return const EmptyState(
                icon: Icons.trending_up,
                message: 'No loans yet, so no interest has been booked.');
          }
          final totalInterest = years.fold<num>(0, (s, y) => s + y.interest);
          final maxInterest = years
              .map((y) => y.interest)
              .fold<num>(0, (a, b) => a > b ? a : b);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(interestByYearProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Total interest booked',
                            style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 6),
                        Text(Fmt.money(totalInterest),
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Text('Across ${years.length} year(s) of lending',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text('By year',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                ...years.map((y) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _YearBar(year: y, max: maxInterest),
                    )),
                const SizedBox(height: 8),
                Text(
                    'Interest is attributed to the year each loan was disbursed. '
                    'Rejected and cancelled loans are excluded.',
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _YearBar extends StatelessWidget {
  const _YearBar({required this.year, required this.max});
  final InterestYear year;
  final num max;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fraction =
        max > 0 ? (year.interest / max).clamp(0.0, 1.0).toDouble() : 0.0;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('${year.year}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800)),
                const Spacer(),
                Text(Fmt.money(year.interest),
                    style: TextStyle(
                        fontWeight: FontWeight.w800, color: scheme.primary)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 10,
                backgroundColor: scheme.surfaceContainerHighest,
              ),
            ),
            const SizedBox(height: 8),
            Text(
                '${year.loanCount} loan(s) · ${Fmt.money(year.principal)} disbursed',
                style: TextStyle(
                    fontSize: 12, color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

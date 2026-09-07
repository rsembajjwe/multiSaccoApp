import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class _Filter {
  const _Filter(this.label, this.match);
  final String label;
  final String? match;
}

const _filters = <_Filter>[
  _Filter('All', null),
  _Filter('Pending', 'pending'),
  _Filter('Approved', 'approved'),
  _Filter('Paid', 'paid'),
  _Filter('Rejected', 'rejected'),
];

/// Welfare claims across the SACCO, with a status filter.
class WelfareScreen extends ConsumerStatefulWidget {
  const WelfareScreen({super.key});

  @override
  ConsumerState<WelfareScreen> createState() => _WelfareScreenState();
}

class _WelfareScreenState extends ConsumerState<WelfareScreen> {
  int _filter = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Welfare claims')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ChoiceChip(
                  label: Text(_filters[i].label),
                  selected: _filter == i,
                  onSelected: (_) => setState(() => _filter = i),
                ),
              ),
            ),
          ),
          Expanded(
            child: PagedListView<WelfareClaim>(
              search: _filters[_filter].match ?? '',
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .welfareClaimsPage(status: _filters[_filter].match, page: page),
              itemBuilder: (context, c) => _ClaimTile(claim: c),
              emptyIcon: Icons.volunteer_activism_outlined,
              emptyMessage: 'No welfare claims in this view.',
              errorMessage: 'Could not load welfare claims.',
            ),
          ),
        ],
      ),
    );
  }
}

class _ClaimTile extends StatelessWidget {
  const _ClaimTile({required this.claim});
  final WelfareClaim claim;

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
                Expanded(
                  child: Text(Fmt.label(claim.claimType),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                StatusChip(claim.status),
              ],
            ),
            const SizedBox(height: 2),
            Text(
                '${claim.memberName.isEmpty ? claim.membershipNo : claim.memberName} · ${Fmt.money(claim.amount)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
            if (claim.description.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(claim.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: scheme.onSurface)),
            ],
            const SizedBox(height: 6),
            Text('Submitted ${Fmt.date(claim.submittedAt)}',
                style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

/// Board / AGM meetings and their resolutions (read-only).
class GovernanceScreen extends ConsumerWidget {
  const GovernanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(governanceMeetingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Governance')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load meetings.',
          detail: '$e',
          onRetry: () => ref.invalidate(governanceMeetingsProvider),
        ),
        data: (meetings) {
          if (meetings.isEmpty) {
            return const EmptyState(
              icon: Icons.groups_outlined,
              message: 'No meetings on record.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(governanceMeetingsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: meetings.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _MeetingCard(meetings[i]),
            ),
          );
        },
      ),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  const _MeetingCard(this.meeting);
  final GovernanceMeeting meeting;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
          title: Text(meeting.title,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
                '${meeting.typeLabel} · ${Fmt.dateTime(meeting.scheduledAt)}',
                style: TextStyle(fontSize: 12.5, color: scheme.outline)),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusChip(meeting.status),
              if (meeting.openResolutions > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('${meeting.openResolutions} open',
                      style: TextStyle(
                          fontSize: 11, color: scheme.outline)),
                ),
            ],
          ),
          children: [
            if (meeting.resolutions.isEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Text('No resolutions recorded.',
                    style: TextStyle(fontSize: 12.5, color: scheme.outline)),
              )
            else
              ...meeting.resolutions.map((r) => _ResolutionRow(r)),
            if ((meeting.minutes ?? '').isNotEmpty) ...[
              const Divider(height: 20),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Minutes',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: scheme.outline)),
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(meeting.minutes!,
                    style: const TextStyle(fontSize: 12.5)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ResolutionRow extends StatelessWidget {
  const _ResolutionRow(this.resolution);
  final GovernanceResolution resolution;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final owner = resolution.ownerName ?? resolution.ownerTitle;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Icon(Icons.task_alt_outlined,
                size: 16, color: scheme.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(resolution.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 13.5)),
                if ((resolution.decision ?? '').isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(resolution.decision!,
                        style: const TextStyle(fontSize: 12.5)),
                  ),
                Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Text(
                    [
                      if (owner != null && owner.isNotEmpty) 'Owner: $owner',
                      if ((resolution.dueDate ?? '').isNotEmpty)
                        'Due ${Fmt.date(resolution.dueDate)}',
                    ].join(' · '),
                    style: TextStyle(fontSize: 11.5, color: scheme.outline),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StatusChip(resolution.status),
        ],
      ),
    );
  }
}

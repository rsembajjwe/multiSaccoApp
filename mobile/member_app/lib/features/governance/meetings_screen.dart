import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/error_retry.dart';

/// General meetings (and the AGM) the member is allowed to see, with minutes.
/// Board and committee meetings stay staff-only and never reach this list.
class MeetingsScreen extends ConsumerWidget {
  const MeetingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(meetingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Meetings')),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
          message: 'Could not load meetings.',
          detail: '$e',
          onRetry: () => ref.invalidate(meetingsProvider),
        ),
        data: (meetings) {
          if (meetings.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'No general meetings have been shared yet.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(meetingsProvider),
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
  final Meeting meeting;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final when = meeting.scheduledAt == null
        ? ''
        : DateFormat('EEE, d MMM y').format(meeting.scheduledAt!);
    final hasMinutes = meeting.minutes.trim().isNotEmpty;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          title: Text(meeting.title,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              [
                meeting.typeLabel,
                if (when.isNotEmpty) when,
              ].join(' · '),
              style: TextStyle(fontSize: 12.5, color: scheme.outline),
            ),
          ),
          children: [
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
              child: Text(
                hasMinutes
                    ? meeting.minutes
                    : 'Minutes have not been published yet.',
                style: TextStyle(
                    fontSize: 13,
                    height: 1.35,
                    color: hasMinutes ? null : scheme.outline),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

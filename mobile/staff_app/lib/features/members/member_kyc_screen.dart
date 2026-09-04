import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'document_viewer_screen.dart';

/// A member's KYC context: next of kin, beneficiaries and documents.
class MemberKycScreen extends ConsumerWidget {
  const MemberKycScreen({super.key, required this.memberId, required this.memberName});
  final String memberId;
  final String memberName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Details')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(memberNextOfKinProvider(memberId));
          ref.invalidate(memberBeneficiariesProvider(memberId));
          ref.invalidate(memberDocumentsProvider(memberId));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (memberName.isNotEmpty) ...[
              Text(memberName,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
            ],
            _NextOfKinSection(memberId: memberId),
            const SizedBox(height: 16),
            _BeneficiariesSection(memberId: memberId),
            const SizedBox(height: 16),
            _DocumentsSection(memberId: memberId),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _AsyncSection<T> extends StatelessWidget {
  const _AsyncSection({
    required this.title,
    required this.async,
    required this.empty,
    required this.itemBuilder,
  });
  final String title;
  final AsyncValue<List<T>> async;
  final String empty;
  final Widget Function(T) itemBuilder;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: title,
      child: async.when(
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Shimmer(child: SkeletonBox(height: 44, radius: 12)),
        ),
        error: (e, _) => Text('Could not load. $e',
            style: TextStyle(color: Theme.of(context).colorScheme.error)),
        data: (items) => items.isEmpty
            ? Text(empty,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant))
            : Column(
                children: [
                  for (var i = 0; i < items.length; i++) ...[
                    if (i > 0) const Divider(height: 18),
                    itemBuilder(items[i]),
                  ],
                ],
              ),
      ),
    );
  }
}

class _NextOfKinSection extends ConsumerWidget {
  const _NextOfKinSection({required this.memberId});
  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _AsyncSection<NextOfKin>(
      title: 'Next of kin',
      async: ref.watch(memberNextOfKinProvider(memberId)),
      empty: 'No next of kin on record.',
      itemBuilder: (n) => _person(
        context,
        name: n.fullName,
        relationship: n.relationship,
        phone: n.phone,
        trailing: n.primaryContact ? const StatusChip('primary') : null,
        extra: n.address,
      ),
    );
  }
}

class _BeneficiariesSection extends ConsumerWidget {
  const _BeneficiariesSection({required this.memberId});
  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _AsyncSection<Beneficiary>(
      title: 'Beneficiaries',
      async: ref.watch(memberBeneficiariesProvider(memberId)),
      empty: 'No beneficiaries on record.',
      itemBuilder: (b) => _person(
        context,
        name: b.fullName,
        relationship: b.relationship,
        phone: b.phone,
        trailing: b.allocationPercent > 0
            ? Text('${b.allocationPercent.toStringAsFixed(0)}%',
                style: const TextStyle(fontWeight: FontWeight.w800))
            : null,
      ),
    );
  }
}

class _DocumentsSection extends ConsumerWidget {
  const _DocumentsSection({required this.memberId});
  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _AsyncSection<MemberDocument>(
      title: 'Documents',
      async: ref.watch(memberDocumentsProvider(memberId)),
      empty: 'No documents uploaded.',
      itemBuilder: (d) => InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => DocumentViewerScreen(
                memberId: memberId, documentId: d.id, title: d.documentType))),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Icon(d.isPdf ? Icons.picture_as_pdf_outlined : Icons.image_outlined,
                  size: 20,
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(Fmt.label(d.documentType),
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text('Uploaded ${Fmt.date(d.createdAt)}',
                        style: TextStyle(
                            fontSize: 11,
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
              StatusChip(d.verificationStatus.isEmpty
                  ? d.retentionStatus
                  : d.verificationStatus),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right,
                  size: 18,
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _person(
  BuildContext context, {
  required String name,
  required String relationship,
  required String phone,
  Widget? trailing,
  String extra = '',
}) {
  final scheme = Theme.of(context).colorScheme;
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name.isEmpty ? '—' : name,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(
                [Fmt.label(relationship), phone]
                    .where((s) => s.isNotEmpty && s != '—')
                    .join(' · '),
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
            if (extra.isNotEmpty)
              Text(extra,
                  style:
                      TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
      if (trailing != null) ...[const SizedBox(width: 8), trailing],
    ],
  );
}

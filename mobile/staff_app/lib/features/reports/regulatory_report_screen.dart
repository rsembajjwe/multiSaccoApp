import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';

class RegulatoryReportScreen extends ConsumerWidget {
  const RegulatoryReportScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(regulatoryReportProvider);
    final body = async.when(
      loading: () => const ListSkeleton(),
      error: (error, _) => ErrorRetry(
        message: 'Could not load the regulatory report.',
        detail: '$error',
        onRetry: () => ref.invalidate(regulatoryReportProvider),
      ),
      data: (report) => _ReportBody(report: report),
    );
    if (embedded) return body;
    return Scaffold(
      appBar: AppBar(title: const Text('Regulatory report')),
      body: body,
    );
  }
}

class _ReportBody extends ConsumerWidget {
  const _ReportBody({required this.report});

  final RegulatoryReport report;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = report.report;
    final privacy = snapshot.dataProtection;
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(regulatoryReportProvider),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          SectionCard(
            title: 'Regulatory snapshot',
            trailing: StatusChip(snapshot.complianceStatus),
            child: Column(children: [
              KeyValueRow('Reporting month', report.period),
              KeyValueRow('Generated', Fmt.dateTime(report.generatedAt)),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: report.csv.isEmpty
                      ? null
                      : () => _copyCsv(context, report.csv),
                  icon: const Icon(Icons.copy_all_outlined),
                  label: const Text('Copy CSV export'),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'This is a current SACCO snapshot labelled with the reporting month.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ]),
          ),
          _MetricSection(
            title: 'Membership and member funds',
            metrics: [
              _Metric(
                  'Members', '${snapshot.memberCount}', Icons.groups_outlined),
              _Metric('Active members', '${snapshot.activeMembers}',
                  Icons.verified_user_outlined),
              _Metric('Savings', Fmt.money(snapshot.savings),
                  Icons.savings_outlined),
              _Metric('Shares', Fmt.money(snapshot.shares),
                  Icons.pie_chart_outline),
              _Metric('Welfare', Fmt.money(snapshot.welfare),
                  Icons.volunteer_activism_outlined),
            ],
          ),
          _MetricSection(
            title: 'Loan portfolio',
            metrics: [
              _Metric('Portfolio', Fmt.money(snapshot.loanPortfolio),
                  Icons.account_balance_outlined),
              _Metric('Active loans', '${snapshot.activeLoans}',
                  Icons.receipt_long_outlined),
              _Metric('Loans at risk', Fmt.money(snapshot.loansAtRisk),
                  Icons.warning_amber_outlined),
              _Metric('PAR', '${snapshot.parPercent}%',
                  Icons.trending_down_outlined),
            ],
          ),
          SectionCard(
            title: 'Operations and controls',
            child: Column(children: [
              KeyValueRow('Posted expenses', Fmt.money(snapshot.expenseTotal)),
              KeyValueRow('Asset cost', Fmt.money(snapshot.assetCost)),
              KeyValueRow('Asset net book value',
                  Fmt.money(snapshot.assetNetBookValue)),
              KeyValueRow('Journal entries', '${snapshot.journalEntries}'),
              KeyValueRow('Unbalanced journals',
                  '${snapshot.unbalancedJournalEntries}'),
              KeyValueRow('Reconciliation exceptions',
                  '${snapshot.reconciliationExceptions}',
                  emphasize: snapshot.reconciliationExceptions > 0),
              KeyValueRow('Open complaints', '${snapshot.openComplaints}'),
              KeyValueRow('Open resolutions', '${snapshot.openResolutions}'),
            ]),
          ),
          SectionCard(
            title: 'Data protection evidence',
            trailing: StatusChip(privacy.evidenceStatus),
            child: Column(children: [
              KeyValueRow('Privacy requests', '${privacy.privacyRequests}'),
              KeyValueRow(
                  'Open privacy requests', '${privacy.openPrivacyRequests}',
                  emphasize: privacy.openPrivacyRequests > 0),
              KeyValueRow('Completed privacy requests',
                  '${privacy.completedPrivacyRequests}'),
              KeyValueRow('KYC documents', '${privacy.kycDocuments}'),
              KeyValueRow('KYC reviews due', '${privacy.kycDocumentsReviewDue}',
                  emphasize: privacy.kycDocumentsReviewDue > 0),
              KeyValueRow(
                  'KYC documents disposed', '${privacy.kycDocumentsDisposed}'),
              KeyValueRow(
                  'KYC storage actions', '${privacy.kycStorageActions}'),
            ]),
          ),
        ],
      ),
    );
  }

  Future<void> _copyCsv(BuildContext context, String csv) async {
    await Clipboard.setData(ClipboardData(text: csv));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Regulatory CSV copied to the clipboard.')),
    );
  }
}

class _MetricSection extends StatelessWidget {
  const _MetricSection({required this.title, required this.metrics});

  final String title;
  final List<_Metric> metrics;

  @override
  Widget build(BuildContext context) => SectionCard(
        title: title,
        child: LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth >= 620 ? 3 : 2;
          return GridView.count(
            crossAxisCount: columns,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: columns == 3 ? 1.9 : 1.5,
            children: metrics
                .map((metric) => BalanceCard(
                      label: metric.label,
                      value: metric.value,
                      icon: metric.icon,
                      color: Theme.of(context).colorScheme.primary,
                    ))
                .toList(),
          );
        }),
      );
}

class _Metric {
  const _Metric(this.label, this.value, this.icon);

  final String label;
  final String value;
  final IconData icon;
}

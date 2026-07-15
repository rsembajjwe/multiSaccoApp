import 'package:flutter/material.dart';

import 'api_contract.dart';

void main() {
  runApp(const SaccoMemberApp());
}

class SaccoMemberApp extends StatelessWidget {
  const SaccoMemberApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SACCO Member',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0f766e)),
        useMaterial3: true,
      ),
      home: const MemberDashboardScreen(),
    );
  }
}

class MemberDashboardScreen extends StatelessWidget {
  const MemberDashboardScreen({super.key});

  static const summary = MemberDashboardSummary(
    memberName: 'Amina Nakitende',
    savings: 250000,
    shares: 0,
    welfare: 0,
    loanBalance: 2150000,
    notificationCount: 1,
    lastUpdatedAt: 'Server confirmed',
    serverConfirmed: true,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SACCO Member')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(summary.memberName, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text(SaccoApiContract.emulatorBaseUrl),
          const SizedBox(height: 16),
          _Metric(label: 'Savings', value: summary.savings),
          _Metric(label: 'Loan balance', value: summary.loanBalance),
          _Metric(label: 'Notifications', value: summary.notificationCount),
          const SizedBox(height: 16),
          FilledButton(onPressed: () {}, child: const Text('Apply for mobile loan')),
          OutlinedButton(onPressed: () {}, child: const Text('Save offline complaint draft')),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(label),
        trailing: Text('UGX $value'),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/error_retry.dart';

class ComplaintsScreen extends ConsumerWidget {
  const ComplaintsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(complaintsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Complaints')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New'),
      ),
      body: async.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorRetry(
            message: 'Could not load complaints.',
            detail: '$e',
            onRetry: () => ref.invalidate(complaintsProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                    'No complaints yet. Tap New to raise one with your SACCO leaders.',
                    textAlign: TextAlign.center),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(complaintsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _ComplaintCard(items[i]),
            ),
          );
        },
      ),
    );
  }

  void _openForm(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding:
            EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: const _ComplaintForm(),
      ),
    );
  }
}

class _ComplaintCard extends StatelessWidget {
  const _ComplaintCard(this.c);
  final Complaint c;

  Color _statusColor() {
    switch (c.status.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return Colors.green;
      case 'in_progress':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final when =
        c.createdAt == null ? '' : DateFormat('d MMM y').format(c.createdAt!);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(c.subject.isEmpty ? c.category : c.subject,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
                Chip(
                  label: Text(c.status.replaceAll('_', ' '),
                      style: const TextStyle(fontSize: 11, color: Colors.white)),
                  backgroundColor: _statusColor(),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (c.description.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(c.description),
            ],
            const SizedBox(height: 6),
            Text(
              [
                if (c.category.isNotEmpty) c.category,
                if (c.priority.isNotEmpty) '${c.priority} priority',
                if (when.isNotEmpty) when,
              ].join(' · '),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (c.resolutionNotes.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Response: ${c.resolutionNotes}',
                  style: const TextStyle(fontStyle: FontStyle.italic)),
            ],
          ],
        ),
      ),
    );
  }
}

class _ComplaintForm extends ConsumerStatefulWidget {
  const _ComplaintForm();

  @override
  ConsumerState<_ComplaintForm> createState() => _ComplaintFormState();
}

class _ComplaintFormState extends ConsumerState<_ComplaintForm> {
  final TextEditingController _subject = TextEditingController();
  final TextEditingController _description = TextEditingController();
  String _category = 'service';
  String _priority = 'normal';
  bool _busy = false;
  String? _error;

  static const _categories = [
    'service',
    'loans',
    'savings',
    'governance',
    'welfare',
    'other',
  ];
  static const _priorities = ['low', 'normal', 'high'];

  @override
  void dispose() {
    _subject.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subject.text.trim().isEmpty) {
      setState(() => _error = 'Enter a subject.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(memberRepositoryProvider).submitComplaint(
            category: _category,
            subject: _subject.text.trim(),
            description: _description.text.trim(),
            priority: _priority,
          );
      ref.invalidate(complaintsProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complaint submitted to your SACCO.')),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Raise a complaint',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: _categories
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _category = v ?? 'service'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _subject,
            decoration: const InputDecoration(labelText: 'Subject'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            maxLines: 4,
            decoration: const InputDecoration(
                labelText: 'Details', alignLabelWithHint: true),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _priority,
            decoration: const InputDecoration(labelText: 'Priority'),
            items: _priorities
                .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                .toList(),
            onChanged: (v) => setState(() => _priority = v ?? 'normal'),
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Text(_error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

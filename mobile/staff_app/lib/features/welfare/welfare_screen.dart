import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/confirm_action.dart';
import '../../core/widgets/member_picker.dart';
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
  const WelfareScreen(
      {super.key, this.canManage = false, this.canApprove = false});

  final bool canManage;
  final bool canApprove;

  @override
  ConsumerState<WelfareScreen> createState() => _WelfareScreenState();
}

class _WelfareScreenState extends ConsumerState<WelfareScreen> {
  int _filter = 0;
  int _reloadTick = 0;

  Future<void> _newClaim() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _WelfareClaimSheet(),
    );
    if (created == true && mounted) setState(() => _reloadTick++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Welfare claims')),
      floatingActionButton: widget.canManage
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: const Text('New claim'),
              onPressed: _newClaim,
            )
          : null,
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
              key: ValueKey('welfare-$_filter-$_reloadTick'),
              search: _filters[_filter].match ?? '',
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .welfareClaimsPage(status: _filters[_filter].match, page: page),
              itemBuilder: (context, c) => _ClaimTile(
                claim: c,
                canApprove: widget.canApprove,
                onChanged: () {
                  if (mounted) setState(() => _reloadTick++);
                },
              ),
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

class _ClaimTile extends ConsumerStatefulWidget {
  const _ClaimTile({required this.claim, this.canApprove = false, this.onChanged});
  final WelfareClaim claim;
  final bool canApprove;
  final VoidCallback? onChanged;

  @override
  ConsumerState<_ClaimTile> createState() => _ClaimTileState();
}

class _ClaimTileState extends ConsumerState<_ClaimTile> {
  bool _busy = false;

  Future<String?> _askReason() async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject claim'),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    controller.dispose();
    return (reason == null || reason.isEmpty) ? null : reason;
  }

  Future<void> _decide(String status) async {
    final claim = widget.claim;
    String? reason;
    if (status == 'rejected') {
      reason = await _askReason();
      if (reason == null) return;
    } else {
      final ok = await confirmAction(
        context,
        title: 'Approve claim?',
        message:
            'Approve ${Fmt.money(claim.amount)} ${Fmt.label(claim.claimType).toLowerCase()} for '
            '${claim.memberName.isEmpty ? claim.membershipNo : claim.memberName}.',
        confirmLabel: 'Approve',
        icon: Icons.check_circle_outline,
      );
      if (!ok) return;
    }
    if (!mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).decideWelfareClaim(
            id: claim.id,
            status: status,
            reason: reason,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(status == 'approved'
                  ? 'Claim approved.'
                  : 'Claim rejected.')),
        );
      }
      widget.onChanged?.call();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final claim = widget.claim;
    final canDecide = widget.canApprove && claim.status == 'submitted';
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
            if (canDecide) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.close, size: 18),
                      label: const Text('Reject'),
                      style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFB91C1C)),
                      onPressed: _busy ? null : () => _decide('rejected'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      icon: _busy
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.check, size: 18),
                      label: const Text('Approve'),
                      onPressed: _busy ? null : () => _decide('approved'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

const _claimTypes = <MapEntry<String, String>>[
  MapEntry('bereavement', 'Bereavement'),
  MapEntry('sickness', 'Sickness'),
  MapEntry('hospitalization', 'Hospitalization'),
  MapEntry('marriage', 'Marriage'),
  MapEntry('education', 'Education'),
  MapEntry('other', 'Other'),
];

class _WelfareClaimSheet extends ConsumerStatefulWidget {
  const _WelfareClaimSheet();
  @override
  ConsumerState<_WelfareClaimSheet> createState() => _WelfareClaimSheetState();
}

class _WelfareClaimSheetState extends ConsumerState<_WelfareClaimSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _description = TextEditingController();
  String _claimType = 'bereavement';
  Member? _member;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_member == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Choose a member.')));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).submitWelfareClaim(
            memberId: _member!.id,
            claimType: _claimType,
            amount: num.parse(_amount.text.trim().replaceAll(',', '')),
            description: _description.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Welfare claim submitted.')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('New welfare claim',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              InkWell(
                onTap: _busy
                    ? null
                    : () async {
                        final picked = await showMemberPicker(context);
                        if (picked != null && mounted) {
                          setState(() => _member = picked);
                        }
                      },
                borderRadius: BorderRadius.circular(8),
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Member',
                    suffixIcon: Icon(Icons.search),
                  ),
                  child: Text(
                    _member == null
                        ? 'Tap to search & select a member'
                        : '${_member!.fullName} - ${_member!.membershipNo}',
                    overflow: TextOverflow.ellipsis,
                    style: _member == null
                        ? TextStyle(color: Theme.of(context).hintColor)
                        : null,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _claimType,
                decoration: const InputDecoration(labelText: 'Claim type'),
                items: [
                  for (final e in _claimTypes)
                    DropdownMenuItem(value: e.key, child: Text(e.value)),
                ],
                onChanged:
                    _busy ? null : (v) => setState(() => _claimType = v!),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _amount,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                    labelText: 'Amount', prefixText: 'UGX '),
                validator: (v) {
                  final n = num.tryParse((v ?? '').trim().replaceAll(',', ''));
                  return n == null || n <= 0 ? 'Enter a valid amount.' : null;
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _description,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                    labelText: 'Description (optional)'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  icon: _busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save_outlined),
                  label: const Text('Submit claim'),
                  onPressed: _busy ? null : _save,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

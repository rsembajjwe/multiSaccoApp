import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/ui.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'member_detail_screen.dart';

/// Members list with search. Each row opens the member's financial profile.
class MembersScreen extends ConsumerStatefulWidget {
  const MembersScreen({super.key});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  final _controller = TextEditingController();
  String _query = '';
  int _reloadTick = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canCreate =
        ref.watch(sessionProvider).asData?.value.can('members:create') ??
            false;
    return Scaffold(
      appBar: AppBar(title: const Text('Members')),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Add member'),
              onPressed: () async {
                final created = await showModalBottomSheet<bool>(
                  context: context,
                  isScrollControlled: true,
                  showDragHandle: true,
                  builder: (_) => const _AddMemberSheet(),
                );
                if (created == true && mounted) {
                  setState(() => _reloadTick++);
                }
              },
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => setState(() => _query = v.trim()),
              onChanged: (v) {
                if (v.trim().isEmpty && _query.isNotEmpty) {
                  setState(() => _query = '');
                }
              },
              decoration: InputDecoration(
                hintText: 'Search name, number or phone',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          Expanded(
            child: PagedListView<Member>(
              search: '$_query|$_reloadTick',
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .membersPage(search: _query, page: page),
              itemBuilder: (context, m) => _MemberTile(
                member: m,
                showFinancials: ref
                        .watch(sessionProvider)
                        .asData
                        ?.value
                        .can('finance-source:view') ??
                    false,
              ),
              emptyIcon: Icons.groups_outlined,
              emptyMessage: 'No members match your search.',
              errorMessage: 'Could not load members.',
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member, required this.showFinancials});
  final Member member;
  final bool showFinancials;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initials = member.fullName.trim().isEmpty
        ? '?'
        : member.fullName
            .trim()
            .split(RegExp(r'\s+'))
            .take(2)
            .map((p) => p[0].toUpperCase())
            .join();
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => MemberDetailScreen(memberId: member.id))),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: scheme.primaryContainer,
                child: Text(initials,
                    style: TextStyle(
                        color: scheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(member.fullName.isEmpty ? '—' : member.fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                        '${member.membershipNo.isEmpty ? '—' : member.membershipNo} · ${member.phone}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusChip(member.status),
                  if (showFinancials) ...[
                    const SizedBox(height: 6),
                    Text(Fmt.money(member.totalWorth),
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w800)),
                    if (member.loanBalance > 0) ...[
                      const SizedBox(height: 2),
                      Text('Loan Balance ${Fmt.money(member.loanBalance)}',
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFB91C1C))),
                    ],
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Create a new member. Gated on members:create (secretary, chairman, admin…).
class _AddMemberSheet extends ConsumerStatefulWidget {
  const _AddMemberSheet();

  @override
  ConsumerState<_AddMemberSheet> createState() => _AddMemberSheetState();
}

class _AddMemberSheetState extends ConsumerState<_AddMemberSheet> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _nationalId = TextEditingController();
  String? _branchId;
  String _memberType = 'individual';
  bool _busy = false;

  static const _types = ['individual', 'group', 'institutional', 'corporate'];

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _email.dispose();
    _nationalId.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _branchId == null) {
      if (_branchId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Choose a branch.')));
      }
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).createMember(
            branchId: _branchId!,
            fullName: _fullName.text,
            phone: _phone.text,
            memberType: _memberType,
            email: _email.text,
            nationalId: _nationalId.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Member created.')));
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
    final branches = ref.watch(branchesProvider).asData?.value ?? const [];
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
              Text('New member',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _branchId,
                decoration: const InputDecoration(labelText: 'Branch'),
                items: branches
                    .map((b) => DropdownMenuItem(
                          value: b.id,
                          child: Text(b.name, overflow: TextOverflow.ellipsis),
                        ))
                    .toList(),
                onChanged:
                    _busy ? null : (v) => setState(() => _branchId = v),
                validator: (v) => v == null ? 'Choose a branch.' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _fullName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Enter a name.' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Enter a phone.' : null,
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _memberType,
                decoration: const InputDecoration(labelText: 'Member type'),
                items: _types
                    .map((t) => DropdownMenuItem(
                          value: t,
                          child: Text(Fmt.label(t)),
                        ))
                    .toList(),
                onChanged: _busy
                    ? null
                    : (v) => setState(() => _memberType = v ?? 'individual'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _nationalId,
                decoration: const InputDecoration(
                    labelText: 'National ID (optional)'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration:
                    const InputDecoration(labelText: 'Email (optional)'),
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
                      : const Icon(Icons.check),
                  label: const Text('Create member'),
                  onPressed: _busy ? null : _save,
                ),
              ),
              if (ref.watch(branchesProvider).isLoading) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../domain/models.dart';
import '../../providers.dart';
import 'paged_list.dart';

/// Opens a searchable, paginated member picker and returns the chosen member
/// (or null if dismissed). The optional eligibility callback keeps unavailable
/// members visible while explaining why they cannot be selected.
Future<Member?> showMemberPicker(
  BuildContext context, {
  String? title,
  String? Function(Member member)? unavailableReason,
  Future<PageResult<Member>> Function(String search, int page)? fetchPage,
  bool showLoanExposure = false,
}) {
  return showModalBottomSheet<Member>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _MemberPickerSheet(
      title: title ?? 'Select member',
      unavailableReason: unavailableReason,
      fetchPage: fetchPage,
      showLoanExposure: showLoanExposure,
    ),
  );
}

String? postingUnavailableReason(Member member) {
  return member.status.trim().toLowerCase() == 'active'
      ? null
      : 'Unavailable for financial posting: ${Fmt.label(member.status)}';
}

class _MemberPickerSheet extends ConsumerStatefulWidget {
  const _MemberPickerSheet({
    required this.title,
    required this.unavailableReason,
    required this.fetchPage,
    required this.showLoanExposure,
  });

  final String title;
  final String? Function(Member member)? unavailableReason;
  final Future<PageResult<Member>> Function(String search, int page)? fetchPage;
  final bool showLoanExposure;

  @override
  ConsumerState<_MemberPickerSheet> createState() => _MemberPickerSheetState();
}

class _MemberPickerSheetState extends ConsumerState<_MemberPickerSheet> {
  final _controller = TextEditingController();
  String _query = '';
  Timer? _searchDebounce;

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _scheduleSearch(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.85,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              widget.title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _controller,
              autofocus: true,
              textInputAction: TextInputAction.search,
              onSubmitted: (value) {
                _searchDebounce?.cancel();
                setState(() => _query = value.trim());
              },
              onChanged: _scheduleSearch,
              decoration: InputDecoration(
                hintText: 'Search name, number or phone',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchDebounce?.cancel();
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          Expanded(
            child: PagedListView<Member>(
              search: _query,
              fetch: (page) =>
                  widget.fetchPage?.call(_query, page) ??
                  ref
                      .read(adminRepositoryProvider)
                      .membersPage(search: _query, page: page),
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
              emptyIcon: Icons.groups_outlined,
              emptyMessage: 'No members match your search.',
              errorMessage: 'Could not load members.',
              itemBuilder: (context, member) {
                final scheme = Theme.of(context).colorScheme;
                final unavailable = widget.unavailableReason?.call(member);
                return ListTile(
                  enabled: unavailable == null,
                  leading: CircleAvatar(
                    backgroundColor: scheme.primaryContainer,
                    child: Text(
                      member.fullName.trim().isEmpty
                          ? '?'
                          : member.fullName.trim()[0].toUpperCase(),
                      style: TextStyle(color: scheme.onPrimaryContainer),
                    ),
                  ),
                  title: Text(
                    member.fullName.isEmpty ? '—' : member.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: widget.showLoanExposure && unavailable == null
                      ? Text(
                          '${member.membershipNo.isEmpty ? '—' : member.membershipNo}\n'
                          'Savings ${Fmt.money(member.savings)} · Loan ${Fmt.money(member.loanBalance)}\n'
                          'Guaranteed ${Fmt.money(member.guaranteedLoanBalance)} · Available cover ${Fmt.money(member.guaranteeCapacity)}',
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        )
                      : Text(
                          unavailable ??
                              '${member.membershipNo.isEmpty ? '—' : member.membershipNo} · ${member.phone}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                  trailing: unavailable == null
                      ? const Icon(Icons.chevron_right)
                      : const Icon(Icons.block_outlined),
                  onTap: unavailable == null
                      ? () => Navigator.of(context).pop(member)
                      : null,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

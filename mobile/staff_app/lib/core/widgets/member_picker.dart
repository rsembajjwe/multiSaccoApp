import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models.dart';
import '../../providers.dart';
import 'paged_list.dart';

/// Opens a searchable, paginated member picker and returns the chosen member
/// (or null if dismissed). Scales to large SACCOs — it queries the backend a
/// page at a time via membersPage, never loading the whole member list.
Future<Member?> showMemberPicker(BuildContext context, {String? title}) {
  return showModalBottomSheet<Member>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _MemberPickerSheet(title: title ?? 'Select member'),
  );
}

class _MemberPickerSheet extends ConsumerStatefulWidget {
  const _MemberPickerSheet({required this.title});
  final String title;

  @override
  ConsumerState<_MemberPickerSheet> createState() => _MemberPickerSheetState();
}

class _MemberPickerSheetState extends ConsumerState<_MemberPickerSheet> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.85,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(widget.title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _controller,
              autofocus: true,
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
              search: _query,
              fetch: (page) => ref
                  .read(adminRepositoryProvider)
                  .membersPage(search: _query, page: page),
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
              emptyIcon: Icons.groups_outlined,
              emptyMessage: 'No members match your search.',
              errorMessage: 'Could not load members.',
              itemBuilder: (context, m) {
                final scheme = Theme.of(context).colorScheme;
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: scheme.primaryContainer,
                    child: Text(
                      m.fullName.trim().isEmpty
                          ? '?'
                          : m.fullName.trim()[0].toUpperCase(),
                      style: TextStyle(color: scheme.onPrimaryContainer),
                    ),
                  ),
                  title: Text(m.fullName.isEmpty ? '—' : m.fullName,
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                      '${m.membershipNo.isEmpty ? '—' : m.membershipNo} · ${m.phone}',
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  onTap: () => Navigator.of(context).pop(m),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

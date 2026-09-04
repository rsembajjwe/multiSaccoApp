import 'package:flutter/material.dart';

import '../../domain/models.dart';
import 'error_retry.dart';
import 'skeleton.dart';
import 'ui.dart';

/// A scroll-paginated list. Loads page 0 on mount (and whenever [search]
/// changes), then fetches more as the user nears the bottom.
class PagedListView<T> extends StatefulWidget {
  const PagedListView({
    super.key,
    required this.search,
    required this.fetch,
    required this.itemBuilder,
    required this.emptyIcon,
    required this.emptyMessage,
    required this.errorMessage,
    this.padding = const EdgeInsets.fromLTRB(16, 4, 16, 24),
  });

  final String search;
  final Future<PageResult<T>> Function(int page) fetch;
  final Widget Function(BuildContext, T) itemBuilder;
  final IconData emptyIcon;
  final String emptyMessage;
  final String errorMessage;
  final EdgeInsets padding;

  @override
  State<PagedListView<T>> createState() => _PagedListViewState<T>();
}

class _PagedListViewState<T> extends State<PagedListView<T>> {
  final _scroll = ScrollController();
  final List<T> _items = [];
  int _page = 0;
  bool _hasMore = true;
  bool _loading = false;
  bool _firstDone = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _reset();
  }

  @override
  void didUpdateWidget(covariant PagedListView<T> old) {
    super.didUpdateWidget(old);
    if (old.search != widget.search) _reset();
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >=
        _scroll.position.maxScrollExtent - 400) {
      _loadMore();
    }
  }

  Future<void> _reset() async {
    setState(() {
      _items.clear();
      _page = 0;
      _hasMore = true;
      _firstDone = false;
      _error = null;
    });
    await _loadMore();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore) return;
    setState(() => _loading = true);
    try {
      final result = await widget.fetch(_page);
      if (!mounted) return;
      setState(() {
        _items.addAll(result.items);
        _hasMore = result.hasMore;
        _page += 1;
        _error = null;
        _firstDone = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _firstDone = true;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_firstDone && _loading) return const ListSkeleton();
    if (_error != null && _items.isEmpty) {
      return ErrorRetry(
        message: widget.errorMessage,
        detail: '$_error',
        onRetry: _reset,
      );
    }
    if (_items.isEmpty) {
      return EmptyState(icon: widget.emptyIcon, message: widget.emptyMessage);
    }
    return RefreshIndicator(
      onRefresh: _reset,
      child: ListView.separated(
        controller: _scroll,
        padding: widget.padding,
        itemCount: _items.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          if (i == _items.length) {
            if (_loading) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                    child: SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2))),
              );
            }
            if (!_hasMore && _items.isNotEmpty) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text('${_items.length} total',
                      style: Theme.of(context).textTheme.bodySmall),
                ),
              );
            }
            return const SizedBox(height: 4);
          }
          return widget.itemBuilder(context, _items[i]);
        },
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/core/widgets/paged_list.dart';
import 'package:sacco_staff_app/domain/models.dart';

void main() {
  testWidgets('new search results ignore an older request that finishes late',
      (tester) async {
    final oldRequest = Completer<PageResult<String>>();
    final newRequest = Completer<PageResult<String>>();

    Widget app(String search) {
      return MaterialApp(
        home: Scaffold(
          body: PagedListView<String>(
            search: search,
            fetch: (_) =>
                search == 'old' ? oldRequest.future : newRequest.future,
            itemBuilder: (_, item) => Text(item),
            emptyIcon: Icons.search_off,
            emptyMessage: 'Empty',
            errorMessage: 'Failed',
          ),
        ),
      );
    }

    await tester.pumpWidget(app('old'));
    await tester.pumpWidget(app('new'));

    newRequest.complete(const PageResult(['New member'], 0, 1, 1));
    await tester.pump();
    expect(find.text('New member'), findsOneWidget);

    oldRequest.complete(const PageResult(['Old member'], 0, 1, 1));
    await tester.pump();
    expect(find.text('New member'), findsOneWidget);
    expect(find.text('Old member'), findsNothing);
  });
}

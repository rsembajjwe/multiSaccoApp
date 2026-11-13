import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_member_app/features/auth/login_screen.dart';

void main() {
  const channel =
      MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'readAll') return <String, String>{};
      return null; // read/write/delete -> no stored session
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  testWidgets('login screen renders its fields', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: LoginScreen())),
    );
    await tester.pump();
    expect(find.text('SACCO Member'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Register an organization'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(3));
  });
}

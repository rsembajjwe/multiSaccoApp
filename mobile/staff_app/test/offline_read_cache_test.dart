import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/core/offline_state.dart';
import 'package:sacco_staff_app/core/widgets/offline_read_banner.dart';
import 'package:sacco_staff_app/data/api_client.dart';
import 'package:sacco_staff_app/data/offline_read_cache.dart';
import 'package:sacco_staff_app/data/push_service.dart';
import 'package:sacco_staff_app/data/session_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  late Map<String, String> secureStorage;

  setUp(() {
    secureStorage = <String, String>{};
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      final args = Map<Object?, Object?>.from(
        (call.arguments as Map?) ?? const {},
      );
      final key = args['key'] as String?;
      switch (call.method) {
        case 'read':
          return key == null ? null : secureStorage[key];
        case 'write':
          if (key != null) secureStorage[key] = '${args['value'] ?? ''}';
          return null;
        case 'delete':
          if (key != null) secureStorage.remove(key);
          return null;
        case 'readAll':
          return Map<String, String>.from(secureStorage);
        default:
          return null;
      }
    });
    offlineReadNotifier.value = null;
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
    offlineReadNotifier.value = null;
  });

  test('GET falls back to encrypted tenant cache when offline', () async {
    final session = SessionStore();
    await session.writeSacco('GREE');
    final adapter = _ToggleAdapter();
    final dio = Dio()..httpClientAdapter = adapter;
    final api = ApiClient(session, _NoopPushTopics(), dio: dio);

    final online = await api.getList('/branches');
    adapter.online = false;
    final offline = await api.getList('/branches');

    expect(online.single['name'], 'Main Branch');
    expect(offline, online);
    expect(offlineReadNotifier.value?.path, '/branches');
    expect(secureStorage.keys.any((key) => key.contains('GREE')), isTrue);
  });

  test('cached reads never cross SACCO boundaries', () async {
    final session = SessionStore();
    await session.writeSacco('GREE');
    final adapter = _ToggleAdapter();
    final dio = Dio()..httpClientAdapter = adapter;
    final api = ApiClient(session, _NoopPushTopics(), dio: dio);
    await api.getList('/branches');

    await session.writeSacco('LAKE');
    adapter.online = false;

    await expectLater(
      api.getList('/branches'),
      throwsA(isA<ApiException>()),
    );
  });

  test('expired cache entries are rejected', () async {
    final session = SessionStore();
    await session.writeSacco('GREE');
    final cache = StaffReadCache(session, maxAge: Duration.zero);
    await cache.write('/branches', null, const {'data': []});

    expect(await cache.read('/branches', null), isNull);
  });

  testWidgets('offline banner explains saved read-only data', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OfflineReadBanner(
            state: OfflineReadState(
              path: '/branches',
              cachedAt: DateTime(2026, 11, 17, 9, 30),
            ),
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.cloud_off_outlined), findsOneWidget);
    expect(find.textContaining('showing encrypted data'), findsOneWidget);
    expect(
        find.textContaining('Posting requires a connection'), findsOneWidget);
  });
}

class _ToggleAdapter implements HttpClientAdapter {
  bool online = true;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (!online) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'offline',
      );
    }
    return ResponseBody.fromString(
      '{"data":[{"id":"branch-main","name":"Main Branch"}]}',
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _NoopPushTopics implements StaffPushTopics {
  @override
  Future<String?> deviceToken() async => null;

  @override
  String get platform => 'test';

  @override
  Stream<String> get tokenRefresh => const Stream.empty();

  @override
  Future<void> requestPermission() async {}

  @override
  Future<void> subscribeStaff(String saccoCode) async {}

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {}
}

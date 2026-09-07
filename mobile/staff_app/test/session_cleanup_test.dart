import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/core/auth_events.dart';
import 'package:sacco_staff_app/data/api_client.dart';
import 'package:sacco_staff_app/data/auth_repository.dart';
import 'package:sacco_staff_app/data/push_service.dart';
import 'package:sacco_staff_app/data/session_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('staff session cleanup', () {
    const channel =
        MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
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
            if (key != null) {
              secureStorage[key] = '${args['value'] ?? ''}';
            }
            return null;
          case 'delete':
            if (key != null) secureStorage.remove(key);
            return null;
          case 'readAll':
            return secureStorage;
          case 'deleteAll':
            secureStorage.clear();
            return null;
          default:
            return null;
        }
      });
      sessionExpiredNotifier.value = false;
    });

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
      sessionExpiredNotifier.value = false;
    });

    test('clear removes the stored SACCO code', () async {
      final store = SessionStore();

      await store.writeToken('token');
      await store.writeSacco('GREE');
      await store.clear();

      expect(await store.readToken(), isNull);
      expect(await store.readSacco(), isNull);
    });

    test('logout unsubscribes from the stored SACCO topic', () async {
      final store = SessionStore();
      final push = _RecordingPushTopics();
      final api = _LogoutApiClient(store, push);
      final auth = AuthRepository(api, store, push);

      await store.writeToken('token');
      await store.writeSacco('GREE');
      await auth.logout();

      expect(api.postedPaths, contains('/auth/logout'));
      expect(push.unsubscribed, ['GREE']);
      expect(await store.readSacco(), isNull);
    });

    test('401 responses unsubscribe and mark the session expired', () async {
      final store = SessionStore();
      final push = _RecordingPushTopics();
      final dio = Dio()..httpClientAdapter = _StatusAdapter(401);
      final api = ApiClient(store, push, dio: dio);

      await store.writeToken('token');
      await store.writeSacco('GREE');

      await expectLater(api.get('/secure'), throwsA(isA<ApiException>()));

      expect(push.unsubscribed, ['GREE']);
      expect(await store.readSacco(), isNull);
      expect(sessionExpiredNotifier.value, isTrue);
    });
  });
}

class _RecordingPushTopics implements StaffPushTopics {
  final subscribed = <String>[];
  final unsubscribed = <String>[];

  @override
  Future<void> subscribeStaff(String saccoCode) async {
    subscribed.add(saccoCode);
  }

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {
    unsubscribed.add(saccoCode);
  }
}

class _LogoutApiClient extends ApiClient {
  // ignore: use_super_parameters
  _LogoutApiClient(SessionStore store, StaffPushTopics push)
      : super(store, push, dio: Dio());

  final postedPaths = <String>[];

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    postedPaths.add(path);
    return <String, dynamic>{};
  }
}

class _StatusAdapter implements HttpClientAdapter {
  _StatusAdapter(this.statusCode);

  final int statusCode;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      '{"error":{"message":"Session expired"}}',
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

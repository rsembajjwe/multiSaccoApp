import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/data/api_client.dart';
import 'package:sacco_staff_app/data/app_version_service.dart';
import 'package:sacco_staff_app/data/push_service.dart';
import 'package:sacco_staff_app/data/session_store.dart';

void main() {
  test('version service sends installed build and parses policy', () async {
    final api = _PolicyApiClient();
    final service = AppVersionService(
      api,
      buildNumberLoader: () async => 26,
    );

    final policy = await service.check();

    expect(api.path, '/mobile-app-policy');
    expect(api.query, {
      'app': 'staff',
      'platform': 'android',
      'versionCode': 26,
    });
    expect(policy?.currentVersionCode, 26);
    expect(policy?.minimumVersionCode, 25);
    expect(policy?.latestVersionCode, 27);
    expect(policy?.upgradeRequired, isFalse);
    expect(policy?.updateAvailable, isTrue);
  });

  test('version service fails open when policy is unavailable', () async {
    final service = AppVersionService(
      _PolicyApiClient(fail: true),
      buildNumberLoader: () async => 26,
    );

    expect(await service.check(), isNull);
  });
}

class _PolicyApiClient extends ApiClient {
  _PolicyApiClient({this.fail = false})
      : super(SessionStore(), _NoopPushTopics(), dio: Dio());

  final bool fail;
  String? path;
  Map<String, dynamic>? query;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    if (fail) throw ApiException('offline');
    this.path = path;
    this.query = query;
    return {
      'currentVersionCode': 26,
      'minimumVersionCode': 25,
      'latestVersionCode': 27,
      'upgradeRequired': false,
      'updateAvailable': true,
      'updateUrl': 'https://example.test/staff.apk',
      'message': 'Update available.',
    };
  }
}

class _NoopPushTopics implements StaffPushTopics {
  @override
  Future<String?> deviceToken() async => null;

  @override
  String get platform => 'android';

  @override
  Stream<String> get tokenRefresh => const Stream.empty();

  @override
  Future<void> requestPermission() async {}

  @override
  Future<void> subscribeStaff(String saccoCode) async {}

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {}
}

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/data/api_client.dart';
import 'package:sacco_staff_app/data/auth_repository.dart';
import 'package:sacco_staff_app/data/push_service.dart';
import 'package:sacco_staff_app/data/session_store.dart';

void main() {
  test('email password reset includes the legacy email field', () async {
    final store = SessionStore();
    final push = _NoopPushTopics();
    final api = _RecordingApiClient(store, push);
    final repository = AuthRepository(api, store, push);

    final destination = await repository.requestPasswordReset(
      saccoCode: ' GREE ',
      identifier: '  staff@example.com  ',
      channel: 'email',
    );

    expect(api.lastPath, '/auth/password-reset/request');
    expect(api.lastBody, {
      'saccoCode': 'GREE',
      'identifier': 'staff@example.com',
      'email': 'staff@example.com',
      'channel': 'email',
    });
    expect(destination, 's***@example.com');
  });

  test('SMS password reset does not send a phone number as email', () async {
    final store = SessionStore();
    final push = _NoopPushTopics();
    final api = _RecordingApiClient(store, push);
    final repository = AuthRepository(api, store, push);

    final destination = await repository.requestPasswordReset(
      saccoCode: 'GREE',
      identifier: '0700123456',
      channel: 'sms',
    );

    expect(api.lastBody, {
      'saccoCode': 'GREE',
      'identifier': '0700123456',
      'channel': 'sms',
    });
    expect(destination, 's***@example.com');
  });

  test('contact update sends email and telephone number', () async {
    final store = SessionStore();
    final push = _NoopPushTopics();
    final api = _RecordingApiClient(store, push);
    final repository = AuthRepository(api, store, push);

    final session = await repository.updateContact(
      email: ' staff@example.com ',
      phone: ' +256700123456 ',
    );

    expect(api.lastPath, '/auth/me/contact');
    expect(api.lastBody, {
      'email': 'staff@example.com',
      'phone': '+256700123456',
    });
    expect(session.phone, '+256700123456');
  });
}

class _RecordingApiClient extends ApiClient {
  _RecordingApiClient(super.store, super.push) : super(dio: Dio());

  String? lastPath;
  Map<String, dynamic>? lastBody;

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    lastPath = path;
    lastBody = body;
    return const {'destination': 's***@example.com'};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    lastPath = path;
    lastBody = body;
    return {
      'user': {
        'id': 'staff',
        'tenantId': 'tenant_green',
        'fullName': 'Staff User',
        'email': body['email'],
        'phone': body['phone'],
      },
      'roleNames': const ['Staff'],
      'permissionIds': const <String>[],
    };
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

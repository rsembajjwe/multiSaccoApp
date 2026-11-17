import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tereka_proprietor_app/src/api_client.dart';
import 'package:tereka_proprietor_app/src/auth_repository.dart';
import 'package:tereka_proprietor_app/src/session_store.dart';

void main() {
  test('email password reset includes the legacy email field', () async {
    final api = _RecordingApiClient();
    final repository = AuthRepository(api, SessionStore());

    final destination = await repository.requestPasswordReset(
      identifier: '  owner@example.com  ',
      channel: 'email',
    );

    expect(api.lastPath, '/auth/password-reset/request');
    expect(api.lastBody, {
      'saccoCode': 'PLATFORM',
      'identifier': 'owner@example.com',
      'email': 'owner@example.com',
      'channel': 'email',
    });
    expect(destination, '+256 ***3456');
  });

  test('SMS password reset does not send a phone number as email', () async {
    final api = _RecordingApiClient();
    final repository = AuthRepository(api, SessionStore());

    final destination = await repository.requestPasswordReset(
      identifier: '+256700123456',
      channel: 'sms',
    );

    expect(api.lastBody, {
      'saccoCode': 'PLATFORM',
      'identifier': '+256700123456',
      'channel': 'sms',
    });
    expect(destination, '+256 ***3456');
  });

  test('contact update sends email and telephone number', () async {
    final api = _RecordingApiClient();
    final repository = AuthRepository(api, SessionStore());

    final session = await repository.updateContact(
      email: ' owner@example.com ',
      phone: ' +256700123456 ',
    );

    expect(api.lastPath, '/auth/me/contact');
    expect(api.lastBody, {
      'email': 'owner@example.com',
      'phone': '+256700123456',
    });
    expect(session.phone, '+256700123456');
  });
}

class _RecordingApiClient extends ApiClient {
  _RecordingApiClient() : super(SessionStore(), dio: Dio());

  String? lastPath;
  Map<String, dynamic>? lastBody;

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    lastPath = path;
    lastBody = body;
    return const {'destination': '+256 ***3456'};
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
        'id': 'owner',
        'tenantId': 'tenant_platform',
        'fullName': 'Owner',
        'email': body['email'],
        'phone': body['phone'],
      },
      'roleNames': const ['Platform Administrator'],
      'permissionIds': const <String>[],
    };
  }
}

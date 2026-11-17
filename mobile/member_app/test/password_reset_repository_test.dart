import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_member_app/api_contract.dart';
import 'package:sacco_member_app/data/api_client.dart';
import 'package:sacco_member_app/data/member_repository.dart';
import 'package:sacco_member_app/data/push_service.dart';
import 'package:sacco_member_app/data/session_store.dart';

void main() {
  test('member email password reset sends the tenant-scoped identifier',
      () async {
    final store = SessionStore();
    final api = _RecordingApiClient(store);
    final repository = MemberRepository(api, store, PushService());

    final destination = await repository.requestPasswordReset(
      saccoCode: ' AZCG ',
      identifier: ' member@example.com ',
      channel: 'email',
    );

    expect(api.lastPath, ApiPaths.passwordResetRequest);
    expect(api.lastBody, {
      'saccoCode': 'AZCG',
      'identifier': 'member@example.com',
      'channel': 'email',
    });
    expect(destination, '+256 ***3456');
  });

  test('member password confirmation trims the reset code', () async {
    final store = SessionStore();
    final api = _RecordingApiClient(store);
    final repository = MemberRepository(api, store, PushService());

    await repository.confirmPasswordReset(
      token: ' 123456 ',
      newPassword: 'MemberPass@123',
    );

    expect(api.lastPath, ApiPaths.passwordResetConfirm);
    expect(api.lastBody, {
      'token': '123456',
      'newPassword': 'MemberPass@123',
    });
  });
}

class _RecordingApiClient extends ApiClient {
  _RecordingApiClient(SessionStore store) : super(store, dio: Dio());

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
}

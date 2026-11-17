import '../core/format.dart';
import '../domain/models.dart';
import 'api_client.dart';
import 'offline_read_cache.dart';
import 'push_service.dart';
import 'session_store.dart';

class AuthRepository {
  AuthRepository(this._api, this._session, this._push,
      [StaffReadCache? readCache])
      : _readCache = readCache;
  final ApiClient _api;
  final SessionStore _session;
  final StaffPushTopics _push;
  final StaffReadCache? _readCache;

  Future<LoginOutcome> login({
    required String saccoCode,
    required String username,
    required String password,
  }) async {
    final data = await _api.post('/auth/login', {
      'saccoCode': saccoCode,
      'username': username,
      'password': password,
    });
    if (data['mfaRequired'] == true ||
        (data['challengeId'] != null && data['token'] == null)) {
      return LoginOutcome(mfa: MfaChallenge.fromJson(data));
    }
    if (data['passwordChangeRequired'] == true) {
      return LoginOutcome(firstLogin: FirstLoginRequirement.fromJson(data));
    }
    final session = StaffSession.fromLogin(data);
    await _persist(session, saccoCode);
    return LoginOutcome(session: session);
  }

  Future<void> completeFirstLogin({
    required String saccoCode,
    required String username,
    required String temporaryPassword,
    required String newPassword,
  }) async {
    await _api.post('/auth/first-login-password', {
      'saccoCode': saccoCode,
      'username': username,
      'temporaryPassword': temporaryPassword,
      'newPassword': newPassword,
    });
  }

  Future<String?> requestPasswordReset({
    required String saccoCode,
    required String identifier,
    required String channel,
  }) async {
    final normalizedIdentifier = identifier.trim();
    final data = await _api.post('/auth/password-reset/request', {
      'saccoCode': saccoCode.trim(),
      'identifier': normalizedIdentifier,
      if (channel == 'email' && normalizedIdentifier.contains('@'))
        'email': normalizedIdentifier,
      'channel': channel,
    });
    final destination = '${data['destination'] ?? ''}'.trim();
    return destination.isEmpty ? null : destination;
  }

  Future<void> confirmPasswordReset({
    required String token,
    required String newPassword,
  }) async {
    await _api.post('/auth/password-reset/confirm', {
      'token': token.trim(),
      'newPassword': newPassword,
    });
  }

  Future<StaffSession> verifyMfa({
    required String challengeId,
    required String code,
    required String saccoCode,
  }) async {
    final data = await _api.post('/auth/mfa/verify', {
      'challengeId': challengeId,
      'code': code,
    });
    final session = StaffSession.fromLogin(data);
    await _persist(session, saccoCode);
    return session;
  }

  Future<StaffSession> me() async {
    final data = await _api.get('/auth/me');
    final session = StaffSession.fromLogin(data);
    Fmt.setCurrency(session.currency, session.currencyDigits);
    // keep permissions fresh
    await _session.writePermissions(session.permissions);
    if (session.userName.isNotEmpty) await _session.writeName(session.userName);
    return session;
  }

  Future<StaffSession> updateContact({
    required String email,
    required String phone,
  }) async {
    final data = await _api.patch('/auth/me/contact', {
      'email': email.trim(),
      'phone': phone.trim(),
    });
    return StaffSession.fromLogin(data);
  }

  Future<void> logout() async {
    final saccoCode = await _session.readSacco();
    await unregisterPushDevice();
    try {
      await _api.post('/auth/logout', const {});
    } catch (_) {}
    if (saccoCode != null && saccoCode.isNotEmpty) {
      await _push.unsubscribeStaff(saccoCode);
      await _readCache?.clearTenant(saccoCode);
    }
    await _session.clear();
  }

  Future<bool> hasSession() async => (await _session.readToken()) != null;

  Future<void> registerPushDevice({String? token}) async {
    final deviceToken = token ?? await _push.deviceToken();
    if (deviceToken == null || deviceToken.isEmpty) return;
    try {
      await _api.post('/auth/push-devices', {
        'token': deviceToken,
        'platform': _push.platform,
      });
    } catch (_) {}
  }

  Future<void> unregisterPushDevice() async {
    final deviceToken = await _push.deviceToken();
    if (deviceToken == null || deviceToken.isEmpty) return;
    try {
      await _api.delete('/auth/push-devices', {
        'token': deviceToken,
        'platform': _push.platform,
      });
    } catch (_) {}
  }

  Future<void> _persist(StaffSession s, String saccoCode) async {
    if (s.token.isNotEmpty) await _session.writeToken(s.token);
    await _session.writePermissions(s.permissions);
    if (s.userName.isNotEmpty) await _session.writeName(s.userName);
    if (saccoCode.isNotEmpty) {
      await _session.writeSacco(saccoCode);
      await _push.subscribeStaff(saccoCode);
    }
    await registerPushDevice();
  }
}

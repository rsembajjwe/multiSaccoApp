import '../core/format.dart';
import '../domain/models.dart';
import 'api_client.dart';
import 'push_service.dart';
import 'session_store.dart';

class AuthRepository {
  AuthRepository(this._api, this._session, this._push);
  final ApiClient _api;
  final SessionStore _session;
  final StaffPushTopics _push;

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
    final session = StaffSession.fromLogin(data);
    await _persist(session, saccoCode);
    return LoginOutcome(session: session);
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

  Future<void> logout() async {
    final saccoCode = await _session.readSacco();
    try {
      await _api.post('/auth/logout', const {});
    } catch (_) {}
    if (saccoCode != null && saccoCode.isNotEmpty) {
      await _push.unsubscribeStaff(saccoCode);
    }
    await _session.clear();
  }

  Future<bool> hasSession() async => (await _session.readToken()) != null;

  Future<void> _persist(StaffSession s, String saccoCode) async {
    if (s.token.isNotEmpty) await _session.writeToken(s.token);
    await _session.writePermissions(s.permissions);
    if (s.userName.isNotEmpty) await _session.writeName(s.userName);
    if (saccoCode.isNotEmpty) {
      await _session.writeSacco(saccoCode);
      await _push.subscribeStaff(saccoCode);
    }
  }
}

import 'api_client.dart';
import 'models.dart';
import 'session_store.dart';

class AuthRepository {
  const AuthRepository(this._api, this._store);
  final ApiClient _api;
  final SessionStore _store;

  Future<LoginResult> login({
    required String username,
    required String password,
  }) async {
    final data = await _api.post('/auth/login', {
      'saccoCode': 'PLATFORM',
      'username': username.trim(),
      'password': password,
    });
    if (data['passwordChangeRequired'] == true) {
      return const LoginResult(passwordChange: true);
    }
    final challengeId = stringValue(data['challengeId']);
    if (data['mfaRequired'] == true ||
        (challengeId.isNotEmpty && stringValue(data['token']).isEmpty)) {
      return LoginResult(challengeId: challengeId);
    }
    return LoginResult(session: await _persist(data));
  }

  Future<void> changeTemporaryPassword({
    required String username,
    required String temporaryPassword,
    required String newPassword,
  }) async {
    await _api.post('/auth/first-login-password', {
      'saccoCode': 'PLATFORM',
      'username': username.trim(),
      'temporaryPassword': temporaryPassword,
      'newPassword': newPassword,
    });
  }

  Future<PlatformSession> verifyMfa({
    required String challengeId,
    required String code,
  }) async {
    final data = await _api.post('/auth/mfa/verify', {
      'challengeId': challengeId,
      'code': code.trim(),
    });
    return _persist(data);
  }

  Future<PlatformSession> me() async {
    final data = await _api.get('/auth/me');
    final session = PlatformSession.fromJson(data);
    if (!session.isPlatform) {
      await _store.clear();
      throw const ApiException(
        'This app is restricted to authorised Tereka platform staff.',
      );
    }
    return session;
  }

  Future<bool> hasSession() async =>
      (await _store.readToken())?.isNotEmpty == true;

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout', const {});
    } catch (_) {}
    await _store.clear();
  }

  Future<PlatformSession> _persist(Map<String, dynamic> data) async {
    final session = PlatformSession.fromJson(data);
    if (!session.isPlatform) {
      throw const ApiException(
        'This app is restricted to authorised Tereka platform staff.',
      );
    }
    if (session.token.isNotEmpty) await _store.writeToken(session.token);
    return session;
  }
}

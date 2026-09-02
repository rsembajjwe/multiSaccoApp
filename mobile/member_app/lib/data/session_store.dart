import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the opaque member bearer token in the OS keystore
/// (Keychain on iOS, Keystore on Android) — never in plain shared prefs.
class SessionStore {
  SessionStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _tokenKey = 'member_token';
  static const _memberIdKey = 'member_id';

  Future<String?> readToken() => _storage.read(key: _tokenKey);
  Future<void> writeToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> readMemberId() => _storage.read(key: _memberIdKey);
  Future<void> writeMemberId(String id) =>
      _storage.write(key: _memberIdKey, value: id);

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _memberIdKey);
  }

  static const _lockKey = 'biometric_lock';

  Future<bool> biometricLockEnabled() async =>
      (await _storage.read(key: _lockKey)) == 'true';

  Future<void> setBiometricLock(bool enabled) =>
      _storage.write(key: _lockKey, value: enabled ? 'true' : 'false');
}

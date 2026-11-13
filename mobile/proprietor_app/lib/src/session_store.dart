import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  SessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _tokenKey = 'proprietor_session_token';
  static const _biometricKey = 'proprietor_biometric_lock';

  Future<String?> readToken() => _storage.read(key: _tokenKey);
  Future<void> writeToken(String token) =>
      _storage.write(key: _tokenKey, value: token);
  Future<void> clear() => _storage.deleteAll();
  Future<bool> biometricEnabled() async =>
      await _storage.read(key: _biometricKey) == 'true';
  Future<void> setBiometricEnabled(bool enabled) =>
      _storage.write(key: _biometricKey, value: '$enabled');
}

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the staff bearer token and the user's permission set in the OS
/// keystore. Permissions gate which admin features are shown.
class SessionStore {
  SessionStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _tokenKey = 'staff_token';
  static const _permsKey = 'staff_permissions';
  static const _nameKey = 'staff_name';
  static const _saccoKey = 'staff_sacco';
  static const _lockKey = 'biometric_lock';

  Future<String?> readToken() => _storage.read(key: _tokenKey);
  Future<void> writeToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> writePermissions(List<String> perms) =>
      _storage.write(key: _permsKey, value: perms.join(','));
  Future<List<String>> readPermissions() async {
    final raw = await _storage.read(key: _permsKey);
    if (raw == null || raw.isEmpty) return const [];
    return raw.split(',');
  }

  Future<void> writeName(String name) => _storage.write(key: _nameKey, value: name);
  Future<String?> readName() => _storage.read(key: _nameKey);

  Future<void> writeSacco(String code) => _storage.write(key: _saccoKey, value: code);
  Future<String?> readSacco() => _storage.read(key: _saccoKey);

  Future<bool> biometricLockEnabled() async =>
      (await _storage.read(key: _lockKey)) == 'true';
  Future<void> setBiometricLock(bool enabled) =>
      _storage.write(key: _lockKey, value: enabled ? 'true' : 'false');

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _permsKey);
    await _storage.delete(key: _nameKey);
  }
}

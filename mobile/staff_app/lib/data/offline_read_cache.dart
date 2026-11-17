import 'dart:convert';
import 'dart:collection';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'session_store.dart';

class CachedRead {
  const CachedRead({required this.data, required this.cachedAt});

  final dynamic data;
  final DateTime cachedAt;
}

class StaffReadCache {
  StaffReadCache(
    this._session, {
    FlutterSecureStorage? storage,
    this.maxAge = const Duration(hours: 24),
  }) : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions:
                  IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const _prefix = 'staff_read_cache_v1_';
  static const _maxEncodedLength = 500000;

  final SessionStore _session;
  final FlutterSecureStorage _storage;
  final Duration maxAge;

  Future<void> write(
    String path,
    Map<String, dynamic>? query,
    dynamic data,
  ) async {
    final saccoCode = await _session.readSacco();
    if (saccoCode == null || saccoCode.isEmpty) return;
    try {
      final encoded = jsonEncode({
        'cachedAt': DateTime.now().toUtc().toIso8601String(),
        'data': data,
      });
      if (encoded.length > _maxEncodedLength) return;
      await _storage.write(
        key: _key(saccoCode, path, query),
        value: encoded,
      );
    } catch (_) {
      // Cache writes must never break a successful online request.
    }
  }

  Future<CachedRead?> read(
    String path,
    Map<String, dynamic>? query,
  ) async {
    final saccoCode = await _session.readSacco();
    if (saccoCode == null || saccoCode.isEmpty) return null;
    final key = _key(saccoCode, path, query);
    try {
      final encoded = await _storage.read(key: key);
      if (encoded == null || encoded.isEmpty) return null;
      final entry = jsonDecode(encoded);
      if (entry is! Map) return null;
      final cachedAt = DateTime.tryParse('${entry['cachedAt'] ?? ''}');
      if (cachedAt == null ||
          DateTime.now().toUtc().difference(cachedAt.toUtc()) > maxAge) {
        await _storage.delete(key: key);
        return null;
      }
      return CachedRead(data: entry['data'], cachedAt: cachedAt);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearTenant(String saccoCode) async {
    final normalized = _tenantPrefix(saccoCode);
    try {
      final entries = await _storage.readAll();
      for (final key
          in entries.keys.where((key) => key.startsWith(normalized))) {
        await _storage.delete(key: key);
      }
    } catch (_) {
      // Session cleanup should continue even if secure storage is unavailable.
    }
  }

  String _key(
    String saccoCode,
    String path,
    Map<String, dynamic>? query,
  ) {
    final sortedQuery = SplayTreeMap<String, dynamic>.from(query ?? const {});
    final resource = '$path|${jsonEncode(sortedQuery)}';
    return '${_tenantPrefix(saccoCode)}${base64Url.encode(utf8.encode(resource))}';
  }

  String _tenantPrefix(String saccoCode) {
    final tenant =
        saccoCode.trim().toUpperCase().replaceAll(RegExp(r'[^A-Z0-9_-]'), '_');
    return '$_prefix${tenant}_';
  }
}

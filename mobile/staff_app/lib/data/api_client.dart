import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../domain/models.dart';

import '../core/auth_events.dart';
import '../core/config.dart';
import '../core/offline_state.dart';
import 'offline_read_cache.dart';
import 'push_service.dart';
import 'session_store.dart';

/// Thin Dio wrapper: injects the bearer token, clears a stale session on 401,
/// and maps transport failures to readable [ApiException]s.
class ApiClient {
  static const _requestTokenKey = 'staffSessionToken';

  ApiClient(this._session, this._push, {Dio? dio, StaffReadCache? readCache})
      : _dio = dio ?? Dio(),
        _readCache = readCache ?? StaffReadCache(_session) {
    _dio.options
      ..baseUrl = AppConfig.baseUrl
      ..connectTimeout = const Duration(seconds: 15)
      ..receiveTimeout = const Duration(seconds: 20)
      ..headers['Content-Type'] = 'application/json';
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _session.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
            options.extra[_requestTokenKey] = token;
          }
          if (_isMutating(options.method) &&
              !_isAuthPath(options.path) &&
              !options.headers.containsKey('Idempotency-Key')) {
            options.headers['Idempotency-Key'] =
                _idempotencyKey(options.method, options.path);
          }
          handler.next(options);
        },
        onError: (e, handler) async {
          if (e.response?.statusCode == 401 &&
              !_isAuthPath(e.requestOptions.path)) {
            final rejectedToken =
                e.requestOptions.extra[_requestTokenKey] as String?;
            final currentToken = await _session.readToken();
            if (rejectedToken != null && rejectedToken == currentToken) {
              final saccoCode = await _session.readSacco();
              if (saccoCode != null && saccoCode.isNotEmpty) {
                await _push.unsubscribeStaff(saccoCode);
                await _readCache.clearTenant(saccoCode);
              }
              await _session.clear();
              sessionExpiredNotifier.value = true;
            }
          }
          handler.next(e);
        },
      ),
    );
  }

  final Dio _dio;
  final SessionStore _session;
  final StaffPushTopics _push;
  final StaffReadCache _readCache;
  int _idempotencySequence = 0;

  Future<Map<String, dynamic>> post(
      String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.post<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> get(String path,
      {Map<String, dynamic>? query}) async {
    final data = await _getData(path, query: query);
    return _envelope(data);
  }

  /// Fetches raw bytes (e.g. a document/image) with its content type.
  Future<DocumentBytes> getBytes(String path) async {
    final r = await _guard(() => _dio.get<List<int>>(path,
        options: Options(responseType: ResponseType.bytes)));
    final ct = r.headers.value('content-type') ?? 'application/octet-stream';
    return DocumentBytes(Uint8List.fromList(r.data ?? const <int>[]), ct);
  }

  Future<List<Map<String, dynamic>>> getList(String path,
      {Map<String, dynamic>? query}) async {
    final d = await _getData(path, query: query);
    final list = d is Map<String, dynamic> ? d['data'] : d;
    return list is List
        ? list.whereType<Map<String, dynamic>>().toList()
        : const [];
  }

  /// Fetches a page of results, reading the PagedResponse `{data, page}` envelope.
  Future<PageResult<Map<String, dynamic>>> getPage(String path,
      {int page = 0, int size = 20, Map<String, dynamic>? query}) async {
    final q = <String, dynamic>{'page': page, 'size': size, ...?query};
    final d = await _getData(path, query: q);
    final rows = (d is Map && d['data'] is List)
        ? (d['data'] as List).whereType<Map<String, dynamic>>().toList()
        : <Map<String, dynamic>>[];
    final meta = (d is Map && d['page'] is Map) ? d['page'] as Map : const {};
    final number = (meta['number'] as num?)?.toInt() ?? page;
    final totalPages = (meta['totalPages'] as num?)?.toInt() ??
        (rows.isEmpty ? number : number + 1);
    final total = (meta['totalElements'] as num?)?.toInt() ?? rows.length;
    return PageResult<Map<String, dynamic>>(rows, number, totalPages, total);
  }

  Future<Map<String, dynamic>> patch(
      String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.patch<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> put(
      String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.put<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> delete(
      String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.delete<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Response<dynamic>> _guard(
      Future<Response<dynamic>> Function() call) async {
    try {
      return await call();
    } on DioException catch (e) {
      throw _translate(e);
    }
  }

  Future<dynamic> _getData(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get<dynamic>(path, queryParameters: query);
      await _readCache.write(path, query, response.data);
      offlineReadNotifier.value = null;
      return response.data;
    } on DioException catch (error) {
      if (_isOfflineFailure(error)) {
        final cached = await _readCache.read(path, query);
        if (cached != null) {
          offlineReadNotifier.value = OfflineReadState(
            path: path,
            cachedAt: cached.cachedAt,
          );
          return cached.data;
        }
      }
      throw _translate(error);
    }
  }

  ApiException _translate(DioException e) {
    final code = e.response?.statusCode;
    final data = e.response?.data;
    String? serverMsg;
    if (data is Map) {
      final err = data['error'];
      if (err is Map && err['message'] is String) serverMsg = err['message'];
      serverMsg ??= data['message'] as String?;
    }
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return ApiException(
          'Cannot reach the server at ${AppConfig.baseUrl}. Check that the backend is running and reachable.');
    }
    if (code == 401) {
      return ApiException(
          serverMsg ?? 'Session expired. Please sign in again.');
    }
    if (code == 403) {
      return ApiException(
          serverMsg ?? 'You do not have permission to do that.');
    }
    return ApiException(serverMsg ?? 'Request failed (${code ?? 'network'}).');
  }

  Map<String, dynamic> _envelope(dynamic data) {
    if (data is Map<String, dynamic>) {
      final inner = data['data'];
      if (inner is Map<String, dynamic>) return inner;
      return data;
    }
    return <String, dynamic>{};
  }

  bool _isMutating(String method) =>
      method == 'POST' ||
      method == 'PATCH' ||
      method == 'PUT' ||
      method == 'DELETE';

  bool _isOfflineFailure(DioException error) =>
      error.response == null &&
      (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.unknown);

  bool _isAuthPath(String path) =>
      path.contains('/auth/login') || path.contains('/auth/mfa/');

  String _idempotencyKey(String method, String path) {
    final safePath = path
        .replaceAll(RegExp(r'[^A-Za-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    return [
      'staff',
      method.toLowerCase(),
      safePath,
      DateTime.now().microsecondsSinceEpoch,
      _idempotencySequence++,
    ].join('-');
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

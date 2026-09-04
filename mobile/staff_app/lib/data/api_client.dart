import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../domain/models.dart';

import '../core/auth_events.dart';
import '../core/config.dart';
import 'session_store.dart';

/// Thin Dio wrapper: injects the bearer token, clears a stale session on 401,
/// and maps transport failures to readable [ApiException]s.
class ApiClient {
  ApiClient(this._session, {Dio? dio}) : _dio = dio ?? Dio() {
    _dio.options
      ..baseUrl = AppConfig.baseUrl
      ..connectTimeout = const Duration(seconds: 15)
      ..receiveTimeout = const Duration(seconds: 20)
      ..headers['Content-Type'] = 'application/json';
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _session.readToken();
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onError: (e, handler) async {
          if (e.response?.statusCode == 401) {
            await _session.clear();
            sessionExpiredNotifier.value = true;
          }
          handler.next(e);
        },
      ),
    );
  }

  final Dio _dio;
  final SessionStore _session;

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.post<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final r = await _guard(() => _dio.get<dynamic>(path));
    return _envelope(r.data);
  }

  /// Fetches raw bytes (e.g. a document/image) with its content type.
  Future<DocumentBytes> getBytes(String path) async {
    final r = await _guard(() => _dio.get<List<int>>(path,
        options: Options(responseType: ResponseType.bytes)));
    final ct = r.headers.value('content-type') ?? 'application/octet-stream';
    return DocumentBytes(
        Uint8List.fromList(r.data ?? const <int>[]), ct);
  }

  Future<List<Map<String, dynamic>>> getList(String path,
      {Map<String, dynamic>? query}) async {
    final r = await _guard(
        () => _dio.get<dynamic>(path, queryParameters: query));
    final d = r.data;
    final list = d is Map<String, dynamic> ? d['data'] : d;
    return list is List
        ? list.whereType<Map<String, dynamic>>().toList()
        : const [];
  }

  /// Fetches a page of results, reading the PagedResponse `{data, page}` envelope.
  Future<PageResult<Map<String, dynamic>>> getPage(String path,
      {int page = 0, int size = 20, Map<String, dynamic>? query}) async {
    final q = <String, dynamic>{'page': page, 'size': size, ...?query};
    final r = await _guard(() => _dio.get<dynamic>(path, queryParameters: q));
    final d = r.data;
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

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.patch<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.put<dynamic>(path, data: body));
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
    if (code == 401) return ApiException(serverMsg ?? 'Session expired. Please sign in again.');
    if (code == 403) return ApiException(serverMsg ?? 'You do not have permission to do that.');
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
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

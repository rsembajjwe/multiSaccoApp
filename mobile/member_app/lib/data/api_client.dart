import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../core/auth_events.dart';
import '../core/config.dart';
import 'session_store.dart';

/// Thin Dio wrapper. Injects the bearer token, clears a stale session on 401,
/// and translates transport failures into readable [ApiException]s so the UI
/// can tell "can't reach the server" apart from "wrong credentials".
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
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
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

  Future<Map<String, dynamic>> uploadFile(String path, String filePath,
      {String field = 'file'}) async {
    final form = FormData.fromMap({
      field: await MultipartFile.fromFile(filePath),
    });
    final r = await _guard(() => _dio.post<dynamic>(
          path,
          data: form,
          options: Options(contentType: 'multipart/form-data'),
        ));
    return _envelope(r.data);
  }

  Future<Uint8List?> getBytes(String path) async {
    try {
      final r = await _dio.get<List<int>>(
        path,
        options: Options(responseType: ResponseType.bytes),
      );
      final d = r.data;
      return d == null ? null : Uint8List.fromList(d);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _translate(e);
    }
  }

  Future<Map<String, dynamic>> get(String path) async {
    final r = await _guard(() => _dio.get<dynamic>(path));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.put<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final r = await _guard(() => _dio.patch<dynamic>(path, data: body));
    return _envelope(r.data);
  }

  Future<List<Map<String, dynamic>>> getList(String path) async {
    final r = await _guard(() => _dio.get<dynamic>(path));
    final d = r.data;
    final list = d is Map<String, dynamic> ? d['data'] : d;
    return list is List ? list.whereType<Map<String, dynamic>>().toList() : const [];
  }

  Future<Response<dynamic>> _guard(Future<Response<dynamic>> Function() call) async {
    try {
      return await call();
    } on DioException catch (e) {
      throw _translate(e);
    }
  }

  ApiException _translate(DioException e) {
    final code = e.response?.statusCode;
    if (code == 401) {
      return ApiException('Invalid SACCO code, member ID, or password.');
    }
    if (code == 400) {
      return ApiException('The server rejected the request (400).');
    }
    if (code != null) {
      final data = e.response?.data;
      final msg = data is Map && data['error'] is Map
          ? '${(data['error'] as Map)['message'] ?? ''}'
          : '';
      return ApiException('Server error $code${msg.isNotEmpty ? ': $msg' : ''}.');
    }
    return ApiException(
        'Cannot reach the server at ${AppConfig.baseUrl}. '
        'Check that the backend is running and reachable from this device.');
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

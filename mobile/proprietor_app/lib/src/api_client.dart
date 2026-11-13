import 'package:dio/dio.dart';

import 'config.dart';
import 'models.dart';
import 'session_store.dart';

class ApiClient {
  ApiClient(this._sessionStore, {Dio? dio}) : _dio = dio ?? Dio() {
    _dio.options
      ..baseUrl = AppConfig.apiBaseUrl
      ..connectTimeout = const Duration(seconds: 15)
      ..receiveTimeout = const Duration(seconds: 25)
      ..headers['Content-Type'] = 'application/json';
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _sessionStore.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (_isMutation(options.method) &&
              !options.path.contains('/auth/') &&
              !options.headers.containsKey('Idempotency-Key')) {
            options.headers['Idempotency-Key'] =
                'proprietor-${DateTime.now().microsecondsSinceEpoch}';
          }
          handler.next(options);
        },
      ),
    );
  }

  final SessionStore _sessionStore;
  final Dio _dio;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final response = await _guard(
      () => _dio.get<dynamic>(path, queryParameters: query),
    );
    return _mapEnvelope(response.data);
  }

  Future<List<Map<String, dynamic>>> getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final response = await _guard(
      () => _dio.get<dynamic>(path, queryParameters: query),
    );
    final data = response.data is Map ? response.data['data'] : response.data;
    return data is List
        ? data.whereType<Map<String, dynamic>>().toList()
        : const [];
  }

  Future<PageResult<Map<String, dynamic>>> getPage(
    String path, {
    int page = 0,
    int size = 30,
    Map<String, dynamic>? query,
  }) async {
    final response = await _guard(
      () => _dio.get<dynamic>(
        path,
        queryParameters: {'page': page, 'size': size, ...?query},
      ),
    );
    final body = response.data;
    final rows = body is Map && body['data'] is List
        ? (body['data'] as List).whereType<Map<String, dynamic>>().toList()
        : <Map<String, dynamic>>[];
    final meta = body is Map && body['page'] is Map
        ? body['page'] as Map
        : const {};
    return PageResult(
      rows,
      numberValue(meta['number']).toInt(),
      numberValue(meta['totalPages']).toInt(),
      numberValue(meta['totalElements']).toInt(),
    );
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) =>
      _mutate('POST', path, body);
  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) =>
      _mutate('PATCH', path, body);
  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) =>
      _mutate('PUT', path, body);

  Future<Map<String, dynamic>> _mutate(
    String method,
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await _guard(
      () => _dio.request<dynamic>(
        path,
        data: body,
        options: Options(method: method),
      ),
    );
    return _mapEnvelope(response.data);
  }

  Future<Response<dynamic>> _guard(
    Future<Response<dynamic>> Function() operation,
  ) async {
    try {
      return await operation();
    } on DioException catch (error) {
      final data = error.response?.data;
      String? message;
      if (data is Map) {
        final apiError = data['error'];
        if (apiError is Map) message = apiError['message'] as String?;
        message ??= data['message'] as String?;
      }
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        throw ApiException(
          'Cannot reach ${AppConfig.apiBaseUrl}. Check your connection.',
        );
      }
      throw ApiException(
        message ??
            (error.response?.statusCode == 403
                ? 'You do not have permission for this action.'
                : 'Request failed (${error.response?.statusCode ?? 'network'}).'),
      );
    }
  }

  Map<String, dynamic> _mapEnvelope(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value['data'] is Map<String, dynamic>
          ? value['data'] as Map<String, dynamic>
          : value;
    }
    return <String, dynamic>{};
  }

  bool _isMutation(String method) =>
      const {'POST', 'PUT', 'PATCH', 'DELETE'}.contains(method.toUpperCase());
}

class ApiException implements Exception {
  const ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

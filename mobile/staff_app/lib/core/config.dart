/// Environment configuration. Pick with
/// `--dart-define=SACCO_ENV=local|staging|prod` (defaults to prod).
class AppConfig {
  const AppConfig._();

  static const _env = String.fromEnvironment('SACCO_ENV', defaultValue: 'prod');
  static const _apiBaseOverride = String.fromEnvironment('SACCO_API_BASE_URL');

  static String get baseUrl {
    if (_apiBaseOverride.isNotEmpty) {
      return _apiBaseOverride.replaceFirst(RegExp(r'/+$'), '');
    }

    switch (_env) {
      case 'prod':
        return 'https://globalntereka.com/api/v1';
      case 'staging':
        return 'https://staging.tereka.online/api/v1';
      case 'local':
      default:
        return 'http://10.0.2.2:18084/api/v1';
    }
  }

  static bool get isProduction => _env == 'prod';
}

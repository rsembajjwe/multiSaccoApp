/// Environment configuration. Pick with
/// `--dart-define=SACCO_ENV=local|staging|prod` (defaults to local).
class AppConfig {
  const AppConfig._();

  static const _env = String.fromEnvironment('SACCO_ENV', defaultValue: 'local');
  static const _localOverride = String.fromEnvironment('SACCO_LOCAL_URL');

  static String get baseUrl {
    switch (_env) {
      case 'prod':
        return 'https://tereka.online/api/v1';
      case 'staging':
        return 'https://staging.tereka.online/api/v1';
      case 'local':
      default:
        return _localOverride.isNotEmpty
            ? _localOverride
            : 'http://10.0.2.2:18084/api/v1';
    }
  }

  static bool get isProduction => _env == 'prod';
}

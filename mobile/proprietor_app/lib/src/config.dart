class AppConfig {
  const AppConfig._();

  static const _environment = String.fromEnvironment(
    'SACCO_ENV',
    defaultValue: 'prod',
  );
  static const _override = String.fromEnvironment('SACCO_API_BASE_URL');

  static String get apiBaseUrl {
    if (_override.isNotEmpty) {
      return _override.replaceFirst(RegExp(r'/+$'), '');
    }
    return switch (_environment) {
      'local' => 'http://10.0.2.2:18084/api/v1',
      'staging' => 'https://staging.tereka.online/api/v1',
      _ => 'https://globalntereka.com/api/v1',
    };
  }
}

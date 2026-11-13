import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/core/config.dart';

void main() {
  test('default build targets the deployed production API', () {
    expect(AppConfig.baseUrl, 'https://globalntereka.com/api/v1');
    expect(AppConfig.isProduction, isTrue);
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/core/theme.dart';

void main() {
  test('AppTheme builds Material 3 light and dark themes', () {
    expect(AppTheme.light().useMaterial3, isTrue);
    expect(AppTheme.light().brightness, Brightness.light);
    expect(AppTheme.dark().brightness, Brightness.dark);
  });
}

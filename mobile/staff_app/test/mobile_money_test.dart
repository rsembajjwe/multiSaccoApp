import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/core/mobile_money.dart';

void main() {
  group('normalizeUgandanMobileNumber', () {
    test('accepts local, international, and formatted Uganda numbers', () {
      expect(normalizeUgandanMobileNumber('0772 123 456'), '+256772123456');
      expect(normalizeUgandanMobileNumber('256772123456'), '+256772123456');
      expect(normalizeUgandanMobileNumber('+256 (772) 123-456'),
          '+256772123456');
    });

    test('rejects incomplete and non-Ugandan numbers', () {
      expect(normalizeUgandanMobileNumber('077212345'), isNull);
      expect(normalizeUgandanMobileNumber('+254712345678'), isNull);
    });
  });

  group('validateMobileMoneyNetwork', () {
    test('detects known MTN and Airtel mismatches', () {
      expect(validateMobileMoneyNetwork('+256772123456', 'airtel'),
          contains('MTN'));
      expect(validateMobileMoneyNetwork('+256752123456', 'mtn'),
          contains('Airtel'));
    });

    test('allows matching and unclassified Uganda prefixes', () {
      expect(validateMobileMoneyNetwork('+256772123456', 'mtn'), isNull);
      expect(validateMobileMoneyNetwork('+256792123456', 'mtn'), isNull);
    });
  });
}

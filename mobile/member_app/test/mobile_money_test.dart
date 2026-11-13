import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_member_app/core/mobile_money.dart';
import 'package:sacco_member_app/api_contract.dart';
import 'package:sacco_member_app/domain/models.dart';
import 'package:sacco_member_app/features/payments/payments_screen.dart';

void main() {
  group('normalizeUgandanMobileNumber', () {
    test('normalizes supported Ugandan formats', () {
      expect(normalizeUgandanMobileNumber('0772 123 456'), '+256772123456');
      expect(normalizeUgandanMobileNumber('256772123456'), '+256772123456');
      expect(normalizeUgandanMobileNumber('+256772123456'), '+256772123456');
    });

    test('rejects invalid phone numbers', () {
      expect(normalizeUgandanMobileNumber('077212345'), isNull);
      expect(normalizeUgandanMobileNumber('+254712345678'), isNull);
      expect(normalizeUgandanMobileNumber('not a phone'), isNull);
    });
  });

  group('validateMobileMoneyNetwork', () {
    test('rejects an Airtel prefix when MTN is selected', () {
      expect(
        validateMobileMoneyNetwork(
          '+256750123456',
          MobileMoneyNetwork.mtn,
        ),
        contains('Airtel'),
      );
    });

    test('rejects an MTN prefix when Airtel is selected', () {
      expect(
        validateMobileMoneyNetwork(
          '+256770123456',
          MobileMoneyNetwork.airtel,
        ),
        contains('MTN'),
      );
    });

    test('accepts matching and unknown prefixes', () {
      expect(
        validateMobileMoneyNetwork(
          '+256780123456',
          MobileMoneyNetwork.mtn,
        ),
        isNull,
      );
      expect(
        validateMobileMoneyNetwork(
          '+256790123456',
          MobileMoneyNetwork.airtel,
        ),
        isNull,
      );
    });
  });

  test('payment purpose values match the backend API contract', () {
    expect(PaymentPurpose.savings.value, 'savings_deposit');
    expect(PaymentPurpose.shares.value, 'share_purchase');
    expect(PaymentPurpose.welfare.value, 'welfare_contribution');
  });

  test('provider status path targets a single payment request', () {
    expect(
      ApiPaths.mobileMoneyProviderStatus('request-123'),
      '/integrations/mobile-money/payment-requests/request-123/provider-status',
    );
  });

  test('payment history uses member-friendly purpose and status labels', () {
    expect(paymentPurposeLabel('savings_deposit'), 'Deposit to savings');
    expect(
      paymentStatusLabel(
        'pending_provider_confirmation',
        provider: 'mtn_momo',
      ),
      'Waiting for MTN',
    );
    expect(paymentStatusLabel('posted'), 'Completed');
    expect(
      paymentStatusLabel('paid_pending_callback', provider: 'mtn_momo'),
      'MTN confirmed - credit pending',
    );
    expect(paymentStatusLabel('manual_review'), 'Manual review');
  });

  test('pending payment wording reflects elapsed confirmation time', () {
    final createdAt = DateTime(2026, 9, 23, 7);

    expect(
      paymentStatusLabel(
        'pending_provider_confirmation',
        provider: 'mtn_momo',
        createdAt: createdAt,
        now: createdAt.add(const Duration(minutes: 3)),
      ),
      'Still waiting for MTN',
    );
    expect(
      paymentStatusLabel(
        'pending_provider_confirmation',
        provider: 'mtn_momo',
        createdAt: createdAt,
        now: createdAt.add(const Duration(minutes: 10)),
      ),
      'MTN confirmation delayed',
    );
    expect(
      paymentConfirmationIsDelayed(
        'pending_provider_confirmation',
        createdAt: createdAt,
        now: createdAt.add(const Duration(minutes: 10)),
      ),
      isTrue,
    );
    expect(paymentNeedsStatusCheck('paid_pending_callback'), isTrue);
    expect(paymentNeedsStatusCheck('posted'), isFalse);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/domain/models.dart';

void main() {
  test('overdue loan is eligible for savings recovery', () {
    final loan = _loan(status: 'overdue');

    expect(loan.isRecoveryEligible, isTrue);
  });

  test('loan with arrears is eligible even before status normalization', () {
    final loan = _loan(status: 'active', arrearsAmount: 1000);

    expect(loan.isRecoveryEligible, isTrue);
  });

  test('current active loan is not eligible for savings recovery', () {
    final loan = _loan(status: 'active');

    expect(loan.isRecoveryEligible, isFalse);
  });
}

Loan _loan({required String status, num arrearsAmount = 0}) => Loan.fromJson({
      'id': 'loan_1',
      'memberId': 'member_1',
      'product': 'Development Loan',
      'amount': 100000,
      'balance': 75000,
      'interestRate': 10,
      'interestAmount': 10000,
      'chargeFee': 0,
      'totalPayable': 110000,
      'monthlyInstallment': 11000,
      'status': status,
      'stage': 'disbursed',
      'repayments': 1,
      'repaymentTotal': 35000,
      'scheduledInstallments': 10,
      'paidInstallments': 1,
      'arrearsInstallments': arrearsAmount > 0 ? 1 : 0,
      'arrearsAmount': arrearsAmount,
      'nextDueDate': '2026-09-01',
      'repaymentMonths': 10,
      'disbursedAt': '2026-01-01T00:00:00Z',
      'createdAt': '2025-12-20T00:00:00Z',
      'purpose': 'Business',
    });

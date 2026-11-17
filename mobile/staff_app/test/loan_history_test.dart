import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/domain/models.dart';
import 'package:sacco_staff_app/features/loans/loan_detail_screen.dart';

void main() {
  test('pending loan history starts with the application', () {
    final loan = _loan(status: 'submitted', disbursedAt: '');

    expect(loanHasBeenDisbursed(loan), isFalse);
    expect(
      loanHistoryOriginLabel(loan),
      'Loan application recorded - Awaiting disbursement',
    );
    expect(
      loanEmptyHistoryMessage(loan),
      'Repayments begin after loan disbursement.',
    );
  });

  test('active loan history starts with disbursement', () {
    final loan = _loan(
      status: 'active',
      disbursedAt: '2026-11-17T08:00:00Z',
    );

    expect(loanHasBeenDisbursed(loan), isTrue);
    expect(loanHistoryOriginLabel(loan), contains('Loan disbursed'));
    expect(
      loanEmptyHistoryMessage(loan),
      'No repayments recorded after disbursement.',
    );
  });
}

Loan _loan({required String status, required String disbursedAt}) =>
    Loan.fromJson({
      'id': 'loan_1',
      'memberId': 'member_1',
      'product': 'Development Loan',
      'amount': 150000,
      'balance': status == 'active' ? 166500 : 0,
      'interestRate': 1.5,
      'interestAmount': 4500,
      'chargeFee': 12000,
      'totalPayable': 166500,
      'monthlyInstallment': 83250,
      'status': status,
      'stage': status == 'active' ? 'disbursed' : 'submitted',
      'repayments': 0,
      'repaymentTotal': 0,
      'scheduledInstallments': 2,
      'paidInstallments': 0,
      'arrearsInstallments': 0,
      'arrearsAmount': 0,
      'nextDueDate': '2026-12-17',
      'repaymentMonths': 2,
      'disbursedAt': disbursedAt,
      'createdAt': '2026-11-17T08:00:00Z',
      'purpose': 'Business',
    });

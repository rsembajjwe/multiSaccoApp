import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/domain/models.dart';
import 'package:sacco_staff_app/features/transactions/loan_repayment_sheet.dart';

void main() {
  test('repayment includes active and overdue loans with balances', () {
    final loans = repaymentEligibleLoans([
      _loan(id: 'active', status: 'active', balance: 75000),
      _loan(id: 'overdue', status: 'overdue', balance: 25000),
    ]);

    expect(loans.map((loan) => loan.id), ['active', 'overdue']);
  });

  test('repayment excludes closed loans and zero balances', () {
    final loans = repaymentEligibleLoans([
      _loan(id: 'paid', status: 'paid', balance: 0),
      _loan(id: 'rejected', status: 'rejected', balance: 75000),
      _loan(id: 'zero', status: 'active', balance: 0),
    ]);

    expect(loans, isEmpty);
  });
}

Loan _loan({
  required String id,
  required String status,
  required num balance,
}) =>
    Loan.fromJson({
      'id': id,
      'memberId': 'member_1',
      'product': 'Development Loan',
      'amount': 100000,
      'balance': balance,
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
      'arrearsInstallments': 0,
      'arrearsAmount': 0,
      'nextDueDate': '2026-09-01',
      'repaymentMonths': 10,
      'disbursedAt': '2026-01-01T00:00:00Z',
      'createdAt': '2025-12-20T00:00:00Z',
      'purpose': 'Business',
    });

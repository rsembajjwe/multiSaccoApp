import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/domain/models.dart';

void main() {
  test('member maps savings, loan balance, and loan status', () {
    final member = Member.fromJson({
      'id': 'member-1',
      'fullName': 'Test Member',
      'savingsBalance': 450000,
      'sharesBalance': 50000,
      'welfareBalance': 10000,
      'loanBalance': 125000,
      'loanStatus': 'overdue',
    });

    expect(member.savings, 450000);
    expect(member.loanBalance, 125000);
    expect(member.loanStatus, 'overdue');
  });

  test('member infers an active loan for older API responses', () {
    final member = Member.fromJson({
      'id': 'member-1',
      'loanBalance': 125000,
    });

    expect(member.loanStatus, 'active');
  });

  test('loan selection accepts normalized and legacy member statuses', () {
    expect(memberStatusAllowsLoanSelection('active'), isTrue);
    expect(memberStatusAllowsLoanSelection(' ACTIVE '), isTrue);
    expect(memberStatusAllowsLoanSelection(''), isTrue);
    expect(memberStatusAllowsLoanSelection('suspended'), isFalse);
  });

  test('member maps loan candidate balances and guarantee liabilities', () {
    final member = Member.fromJson({
      'memberId': 'member-1',
      'membershipNo': 'M-001',
      'fullName': 'Active Member',
      'status': 'active',
      'savingsBalance': 300000,
      'openLoanBalance': 125000,
      'guaranteedLoanBalance': 50000,
      'guaranteeCapacity': 250000,
    });

    expect(member.loanBalance, 125000);
    expect(member.guaranteedLoanBalance, 50000);
    expect(member.guaranteeCapacity, 250000);
  });

  test('member loan exposure totals own debt and guaranteed liabilities', () {
    final exposure = MemberLoanExposure.fromJson({
      'memberId': 'member-1',
      'status': 'active',
      'openLoanBalance': 125000,
      'guaranteedLoanBalance': 50000,
    });

    expect(exposure.totalLoanExposure, 175000);
  });
}

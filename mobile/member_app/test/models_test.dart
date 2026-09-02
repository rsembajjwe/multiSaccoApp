import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_member_app/domain/models.dart';

void main() {
  group('DashboardSummary.fromJson', () {
    test('parses balances, loans total, notifications and statement lines', () {
      final s = DashboardSummary.fromJson({
        'member': {'fullName': 'Amina Green'},
        'balances': {'savings': 100000, 'shares': 5000, 'welfare': 2500},
        'loans': [
          {'balance': 30000},
          {'outstanding': 20000},
        ],
        'notifications': [
          {'id': 'n1'},
          {'id': 'n2'},
        ],
        'statementLines': [
          {
            'transactionId': 't1',
            'type': 'savings_deposit',
            'amount': 100000,
            'credit': 100000,
            'runningBalance': 100000,
          }
        ],
      });
      expect(s.memberName, 'Amina Green');
      expect(s.savings, 100000);
      expect(s.shares, 5000);
      expect(s.welfare, 2500);
      expect(s.loanBalance, 50000); // summed from loans
      expect(s.notificationCount, 2);
      expect(s.transactions.length, 1);
      expect(s.transactions.first.id, 't1');
      expect(s.transactions.first.isDebit, isFalse);
    });

    test('is defensive against missing fields', () {
      final s = DashboardSummary.fromJson({});
      expect(s.memberName, '');
      expect(s.savings, 0);
      expect(s.loanBalance, 0);
      expect(s.transactions, isEmpty);
      expect(s.notificationCount, 0);
    });
  });

  test('StatementLine parses debit and string amounts', () {
    final l = StatementLine.fromJson({
      'id': 'x',
      'type': 'withdrawal',
      'amount': '4000',
      'debit': '4000',
      'runningBalance': '96000',
      'narration': 'Cash out',
    });
    expect(l.id, 'x');
    expect(l.amount, 4000);
    expect(l.debit, 4000);
    expect(l.isDebit, isTrue);
    expect(l.description, 'Cash out');
  });

  test('FundBalance parses code and balance', () {
    final f = FundBalance.fromJson(
        {'fundCode': 'education', 'balance': 12000, 'updatedAt': null});
    expect(f.fundCode, 'education');
    expect(f.balance, 12000);
  });

  test('Loan parses alternate field names', () {
    final loan = Loan.fromJson({
      'id': 'loan_1',
      'productName': 'Emergency Loan',
      'amount': 500000,
      'outstanding': 250000,
      'status': 'approved',
    });
    expect(loan.id, 'loan_1');
    expect(loan.product, 'Emergency Loan');
    expect(loan.principal, 500000);
    expect(loan.balance, 250000);
  });

  test('MemberSubscription parses dues', () {
    final sub = MemberSubscription.fromJson({
      'id': 's1',
      'planName': 'Growth',
      'amount': 100000,
      'paid': 60000,
      'balanceDue': 40000,
      'status': 'active',
      'daysToExpiry': 12,
    });
    expect(sub.balanceDue, 40000);
    expect(sub.daysToExpiry, 12);
  });

  test('Complaint defaults status to open', () {
    final c = Complaint.fromJson({'id': 'c1', 'subject': 'Late posting'});
    expect(c.subject, 'Late posting');
    expect(c.status, 'open');
  });

  test('MobileMoneyPayment parses status', () {
    final p = MobileMoneyPayment.fromJson(
        {'id': 'p1', 'purpose': 'loan_repayment', 'amount': 50000, 'status': 'posted'});
    expect(p.status, 'posted');
    expect(p.amount, 50000);
  });

  test('MemberProfile reads nested member and whatsapp', () {
    final m = MemberProfile.fromJson({
      'member': {
        'fullName': 'Amina Green',
        'phone': '+256700000001',
        'whatsapp': '+256700000002',
        'email': 'amina@example.com',
      }
    });
    expect(m.fullName, 'Amina Green');
    expect(m.phone, '+256700000001');
    expect(m.whatsapp, '+256700000002');
    expect(m.email, 'amina@example.com');
  });

  test('MemberNotification infers read flag', () {
    final unread = MemberNotification.fromJson({'id': 'n1', 'title': 'Hi'});
    final read = MemberNotification.fromJson(
        {'id': 'n2', 'title': 'Hi', 'acknowledgedAt': '2026-01-01T00:00:00Z'});
    expect(unread.read, isFalse);
    expect(read.read, isTrue);
  });
}

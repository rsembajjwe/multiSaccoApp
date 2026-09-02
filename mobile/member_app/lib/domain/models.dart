// Domain entities. Kept free of Flutter and transport concerns.

num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? 0}') ?? 0;

class MemberSession {
  const MemberSession({
    required this.token,
    required this.memberName,
    this.expiresAt,
  });

  final String token;
  final String memberName;
  final DateTime? expiresAt;
}

class DashboardSummary {
  const DashboardSummary({
    required this.memberName,
    required this.savings,
    required this.shares,
    required this.welfare,
    required this.loanBalance,
    required this.notificationCount,
    required this.transactions,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    final balances = (json['balances'] as Map<String, dynamic>?) ?? json;
    final member = json['member'] as Map<String, dynamic>?;
    final loansJson = (json['loans'] as List<dynamic>?) ?? const [];
    final derivedLoanBalance = loansJson.whereType<Map<String, dynamic>>().fold<num>(
        0,
        (sum, l) =>
            sum + _num(l['balance'] ?? l['outstanding'] ?? l['loanBalance']));
    final explicitLoanBalance = _num(json['loanBalance'] ?? balances['loanBalance']);
    final lines =
        ((json['statementLines'] ?? json['transactions']) as List<dynamic>?) ??
            const [];
    final notifications = (json['notifications'] as List<dynamic>?);
    return DashboardSummary(
      memberName: (json['memberName'] ?? member?['fullName'] ?? '') as String,
      savings: _num(balances['savings']),
      shares: _num(balances['shares']),
      welfare: _num(balances['welfare']),
      loanBalance:
          explicitLoanBalance > 0 ? explicitLoanBalance : derivedLoanBalance,
      notificationCount:
          notifications?.length ?? _num(json['notificationCount']).toInt(),
      transactions: lines
          .whereType<Map<String, dynamic>>()
          .map(StatementLine.fromJson)
          .toList(),
    );
  }

  final String memberName;
  final num savings;
  final num shares;
  final num welfare;
  final num loanBalance;
  final int notificationCount;
  final List<StatementLine> transactions;
}

class StatementLine {
  const StatementLine({
    required this.id,
    required this.reference,
    required this.type,
    required this.channel,
    required this.amount,
    required this.debit,
    required this.credit,
    required this.runningBalance,
    required this.description,
    required this.postedAt,
  });

  factory StatementLine.fromJson(Map<String, dynamic> j) => StatementLine(
        id: '${j['transactionId'] ?? j['id'] ?? ''}',
        reference: '${j['reference'] ?? ''}',
        type: '${j['type'] ?? ''}',
        channel: '${j['channel'] ?? ''}',
        amount: _num(j['amount']),
        debit: _num(j['debit']),
        credit: _num(j['credit']),
        runningBalance: _num(j['runningBalance']),
        description: '${j['description'] ?? j['narration'] ?? ''}',
        postedAt: DateTime.tryParse('${j['postedAt'] ?? j['createdAt'] ?? ''}'),
      );

  final String id;
  final String reference;
  final String type;
  final String channel;
  final num amount;
  final num debit;
  final num credit;
  final num runningBalance;
  final String description;
  final DateTime? postedAt;

  bool get isDebit => debit > 0;
}

class FundBalance {
  const FundBalance({
    required this.fundCode,
    required this.balance,
    required this.updatedAt,
  });

  factory FundBalance.fromJson(Map<String, dynamic> j) => FundBalance(
        fundCode: '${j['fundCode'] ?? ''}',
        balance: _num(j['balance']),
        updatedAt: DateTime.tryParse('${j['updatedAt'] ?? ''}'),
      );

  final String fundCode;
  final num balance;
  final DateTime? updatedAt;
}

class Loan {
  const Loan({
    required this.id,
    required this.product,
    required this.principal,
    required this.balance,
    required this.status,
    this.stage,
    this.interestRate,
    this.totalPayable,
    this.monthlyInstallment,
  });

  factory Loan.fromJson(Map<String, dynamic> j) => Loan(
        id: '${j['id'] ?? ''}',
        product: '${j['product'] ?? j['productName'] ?? j['loanProduct'] ?? 'Loan'}',
        principal: _num(j['principal'] ?? j['amount']),
        balance: _num(j['balance'] ?? j['outstanding'] ?? j['loanBalance']),
        status: '${j['status'] ?? ''}',
        stage: j['stage'] as String?,
        interestRate: j['interestRate'] == null ? null : _num(j['interestRate']),
        totalPayable: j['totalPayable'] == null ? null : _num(j['totalPayable']),
        monthlyInstallment:
            j['monthlyInstallment'] == null ? null : _num(j['monthlyInstallment']),
      );

  final String id;
  final String product;
  final num principal;
  final num balance;
  final String status;
  final String? stage;
  final num? interestRate;
  final num? totalPayable;
  final num? monthlyInstallment;
}

class LoanProduct {
  const LoanProduct({
    required this.id,
    required this.name,
    this.interestRate,
    this.maxTermMonths,
  });

  factory LoanProduct.fromJson(Map<String, dynamic> j) => LoanProduct(
        id: '${j['id'] ?? j['loanProductId'] ?? ''}',
        name: '${j['name'] ?? j['productName'] ?? j['product'] ?? 'Loan product'}',
        interestRate: j['interestRate'] == null ? null : _num(j['interestRate']),
        maxTermMonths: j['maxTermMonths'] == null && j['termMonths'] == null
            ? null
            : _num(j['maxTermMonths'] ?? j['termMonths']).toInt(),
      );

  final String id;
  final String name;
  final num? interestRate;
  final int? maxTermMonths;
}

/// A mobile-money payment request (deposit / repayment / dues), modelled on the
/// MobileMoneyPaymentRequest payload; parsed defensively.
class MobileMoneyPayment {
  const MobileMoneyPayment({
    required this.id,
    required this.purpose,
    required this.amount,
    required this.status,
    this.provider,
    this.createdAt,
  });

  factory MobileMoneyPayment.fromJson(Map<String, dynamic> j) => MobileMoneyPayment(
        id: '${j['id'] ?? ''}',
        purpose: '${j['purpose'] ?? ''}',
        amount: _num(j['amount']),
        status: '${j['status'] ?? ''}',
        provider: (j['provider'] ?? j['network']) as String?,
        createdAt: j['createdAt'] != null
            ? DateTime.tryParse('${j['createdAt']}')
            : null,
      );

  final String id;
  final String purpose;
  final num amount;
  final String status;
  final String? provider;
  final DateTime? createdAt;
}

/// Payment purposes the API accepts (fund contributions + fixed purposes).
/// NOTE: the exact accepted strings should be confirmed against the backend
/// (MobileMoneyPaymentRules) during the verify pass.
enum PaymentPurpose {
  savings('savings', 'Deposit to savings'),
  shares('shares', 'Buy shares'),
  welfare('welfare', 'Welfare contribution'),
  membershipDues('membership_dues', 'Membership dues'),
  loanRepayment('loan_repayment', 'Loan repayment');

  const PaymentPurpose(this.value, this.label);
  final String value;
  final String label;
}

/// A member notification / SACCO notice. Parsed defensively against the
/// NotificationResponse payload.
class MemberNotification {
  const MemberNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.read,
    this.createdAt,
  });

  factory MemberNotification.fromJson(Map<String, dynamic> j) {
    final ack = j['acknowledgedAt'] ?? j['readAt'] ?? j['acknowledged'] ?? j['read'];
    final isRead = ack is bool ? ack : ack != null;
    return MemberNotification(
      id: '${j['id'] ?? ''}',
      title: '${j['title'] ?? j['subject'] ?? j['type'] ?? 'Notice'}',
      body: '${j['body'] ?? j['message'] ?? j['content'] ?? ''}',
      read: isRead,
      createdAt: j['createdAt'] != null ? DateTime.tryParse('${j['createdAt']}') : null,
    );
  }

  final String id;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;
}

class MemberProfile {
  const MemberProfile({
    required this.fullName,
    this.membershipNo,
    this.phone,
    this.whatsapp,
    this.email,
    this.status,
  });

  factory MemberProfile.fromJson(Map<String, dynamic> j) {
    final m = (j['member'] as Map<String, dynamic>?) ?? j;
    return MemberProfile(
      fullName: '${m['fullName'] ?? ''}',
      membershipNo: m['membershipNo'] as String?,
      phone: m['phone'] as String?,
      whatsapp: m['whatsapp'] as String?,
      email: m['email'] as String?,
      status: m['status'] as String?,
    );
  }

  final String fullName;
  final String? membershipNo;
  final String? phone;
  final String? whatsapp;
  final String? email;
  final String? status;
}

class LoanRepayment {
  const LoanRepayment({
    required this.id,
    required this.reference,
    required this.amount,
    required this.channel,
    required this.narration,
    required this.paidAt,
  });

  factory LoanRepayment.fromJson(Map<String, dynamic> j) => LoanRepayment(
        id: '${j['id'] ?? ''}',
        reference: '${j['reference'] ?? ''}',
        amount: _num(j['amount']),
        channel: '${j['channel'] ?? ''}',
        narration: '${j['narration'] ?? ''}',
        paidAt: DateTime.tryParse('${j['paidAt'] ?? j['receivedAt'] ?? ''}'),
      );

  final String id;
  final String reference;
  final num amount;
  final String channel;
  final String narration;
  final DateTime? paidAt;
}

class Complaint {
  const Complaint({
    required this.id,
    required this.category,
    required this.subject,
    required this.description,
    required this.priority,
    required this.status,
    required this.resolutionNotes,
    required this.createdAt,
  });

  factory Complaint.fromJson(Map<String, dynamic> j) => Complaint(
        id: '${j['id'] ?? ''}',
        category: '${j['category'] ?? ''}',
        subject: '${j['subject'] ?? ''}',
        description: '${j['description'] ?? ''}',
        priority: '${j['priority'] ?? ''}',
        status: '${j['status'] ?? 'open'}',
        resolutionNotes: '${j['resolutionNotes'] ?? ''}',
        createdAt: DateTime.tryParse('${j['createdAt'] ?? ''}'),
      );

  final String id;
  final String category;
  final String subject;
  final String description;
  final String priority;
  final String status;
  final String resolutionNotes;
  final DateTime? createdAt;
}

class MemberSubscription {
  const MemberSubscription({
    required this.id,
    required this.planName,
    required this.amount,
    required this.paid,
    required this.balanceDue,
    required this.status,
    required this.billingPeriod,
    required this.expiry,
    required this.daysToExpiry,
    required this.lifecycleState,
  });

  factory MemberSubscription.fromJson(Map<String, dynamic> j) => MemberSubscription(
        id: '${j['id'] ?? ''}',
        planName: '${j['planName'] ?? 'Subscription'}',
        amount: _num(j['amount']),
        paid: _num(j['paid']),
        balanceDue: _num(j['balanceDue']),
        status: '${j['status'] ?? ''}',
        billingPeriod: '${j['billingPeriod'] ?? ''}',
        expiry: DateTime.tryParse('${j['expiry'] ?? ''}'),
        daysToExpiry: j['daysToExpiry'] == null ? null : _num(j['daysToExpiry']).toInt(),
        lifecycleState: '${j['lifecycleState'] ?? ''}',
      );

  final String id;
  final String planName;
  final num amount;
  final num paid;
  final num balanceDue;
  final String status;
  final String billingPeriod;
  final DateTime? expiry;
  final int? daysToExpiry;
  final String lifecycleState;
}

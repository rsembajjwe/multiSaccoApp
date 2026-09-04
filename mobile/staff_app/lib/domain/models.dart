num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? 0}') ?? 0;
int _int(dynamic v) => _num(v).toInt();

class StaffSession {
  const StaffSession({
    required this.token,
    required this.userName,
    required this.email,
    required this.roleNames,
    required this.permissions,
    required this.saccoName,
    this.expiresAt,
  });

  final String token;
  final String userName;
  final String email;
  final List<String> roleNames;
  final List<String> permissions;
  final String saccoName;
  final DateTime? expiresAt;

  bool can(String permission) => permissions.contains(permission);
  bool canAny(List<String> perms) => perms.any(permissions.contains);

  static List<String> _strList(dynamic v) => v is List
      ? v.map((e) => '$e').where((e) => e.isNotEmpty).toList()
      : const [];

  factory StaffSession.fromLogin(Map<String, dynamic> j) {
    final user = j['user'] as Map<String, dynamic>?;
    final tenant = j['tenant'] as Map<String, dynamic>?;
    return StaffSession(
      token: '${j['token'] ?? ''}',
      userName: '${user?['fullName'] ?? user?['name'] ?? user?['username'] ?? ''}',
      email: '${user?['email'] ?? ''}',
      roleNames: _strList(j['roleNames']),
      permissions: _strList(j['permissionIds']),
      saccoName: '${tenant?['name'] ?? tenant?['saccoName'] ?? ''}',
      expiresAt: DateTime.tryParse('${j['expiresAt'] ?? ''}'),
    );
  }
}

class MfaChallenge {
  const MfaChallenge({
    required this.challengeId,
    required this.deliveryChannel,
    required this.demoCode,
    this.expiresAt,
  });

  final String challengeId;
  final String deliveryChannel;
  final String demoCode;
  final DateTime? expiresAt;

  factory MfaChallenge.fromJson(Map<String, dynamic> j) => MfaChallenge(
        challengeId: '${j['challengeId'] ?? ''}',
        deliveryChannel: '${j['deliveryChannel'] ?? ''}',
        demoCode: '${j['demoCode'] ?? ''}',
        expiresAt: DateTime.tryParse('${j['expiresAt'] ?? ''}'),
      );
}

/// Result of a login attempt: either an established session or an MFA challenge.
class LoginOutcome {
  const LoginOutcome({this.session, this.mfa});
  final StaffSession? session;
  final MfaChallenge? mfa;
  bool get needsMfa => mfa != null;
}

class SaccoStatus {
  const SaccoStatus({
    required this.members,
    required this.activeMembers,
    required this.pendingApprovals,
    required this.openLoans,
    required this.openComplaints,
    required this.totalSavings,
    required this.totalShares,
    required this.totalWelfare,
    required this.loanPortfolio,
  });

  final int members;
  final int activeMembers;
  final int pendingApprovals;
  final int openLoans;
  final int openComplaints;
  final num totalSavings;
  final num totalShares;
  final num totalWelfare;
  final num loanPortfolio;

  factory SaccoStatus.fromJson(Map<String, dynamic> j) {
    final c = (j['counts'] as Map?) ?? const {};
    final f = (j['financials'] as Map?) ?? const {};
    return SaccoStatus(
      members: _int(c['members']),
      activeMembers: _int(c['activeMembers']),
      pendingApprovals: _int(c['pendingFinancialTransactions']),
      openLoans: _int(c['openLoans']),
      openComplaints: _int(c['openComplaints']),
      totalSavings: _num(f['totalSavings']),
      totalShares: _num(f['totalShares']),
      totalWelfare: _num(f['totalWelfare']),
      loanPortfolio: _num(f['loanPortfolio']),
    );
  }
}

String _str(dynamic v) => v == null ? '' : '$v';

List<String> _strListTop(dynamic v) => v is List
    ? v.map((e) => '$e').where((e) => e.isNotEmpty).toList()
    : const <String>[];

/// A member with their financial balances (from GET /members[/{id}]).
class Member {
  const Member({
    required this.id,
    required this.membershipNo,
    required this.fullName,
    required this.memberType,
    required this.phone,
    required this.whatsapp,
    required this.email,
    required this.status,
    required this.kycStatus,
    required this.joiningDate,
    required this.savings,
    required this.shares,
    required this.welfare,
  });

  final String id;
  final String membershipNo;
  final String fullName;
  final String memberType;
  final String phone;
  final String whatsapp;
  final String email;
  final String status;
  final String kycStatus;
  final String joiningDate;
  final num savings;
  final num shares;
  final num welfare;

  num get totalWorth => savings + shares + welfare;

  factory Member.fromJson(Map<String, dynamic> j) => Member(
        id: _str(j['id']),
        membershipNo: _str(j['membershipNo']),
        fullName: _str(j['fullName']),
        memberType: _str(j['memberType']),
        phone: _str(j['phone']),
        whatsapp: _str(j['whatsapp']),
        email: _str(j['email']),
        status: _str(j['status']),
        kycStatus: _str(j['kycStatus']),
        joiningDate: _str(j['joiningDate']),
        savings: _num(j['savingsBalance']),
        shares: _num(j['sharesBalance']),
        welfare: _num(j['welfareBalance']),
      );
}

/// A loan (from GET /loans).
class Loan {
  const Loan({
    required this.id,
    required this.memberId,
    required this.product,
    required this.amount,
    required this.balance,
    required this.interestRate,
    required this.interestAmount,
    required this.totalPayable,
    required this.monthlyInstallment,
    required this.status,
    required this.stage,
    required this.repayments,
    required this.repaymentTotal,
    required this.scheduledInstallments,
    required this.paidInstallments,
    required this.arrearsInstallments,
    required this.arrearsAmount,
    required this.nextDueDate,
    required this.disbursedAt,
    required this.createdAt,
    required this.purpose,
  });

  final String id;
  final String memberId;
  final String product;
  final num amount;
  final num balance;
  final num interestRate;
  final num interestAmount;
  final num totalPayable;
  final num monthlyInstallment;
  final String status;
  final String stage;
  final int repayments;
  final num repaymentTotal;
  final int scheduledInstallments;
  final int paidInstallments;
  final int arrearsInstallments;
  final num arrearsAmount;
  final String nextDueDate;
  final String disbursedAt;
  final String createdAt;
  final String purpose;

  bool get isOpen =>
      status != 'closed' && status != 'rejected' && status != 'cancelled';
  bool get inArrears => arrearsAmount > 0 || arrearsInstallments > 0;

  factory Loan.fromJson(Map<String, dynamic> j) => Loan(
        id: _str(j['id']),
        memberId: _str(j['memberId']),
        product: _str(j['product']),
        amount: _num(j['amount']),
        balance: _num(j['balance']),
        interestRate: _num(j['interestRate']),
        interestAmount: _num(j['interestAmount']),
        totalPayable: _num(j['totalPayable']),
        monthlyInstallment: _num(j['monthlyInstallment']),
        status: _str(j['status']),
        stage: _str(j['stage']),
        repayments: _int(j['repayments']),
        repaymentTotal: _num(j['repaymentTotal']),
        scheduledInstallments: _int(j['scheduledInstallments']),
        paidInstallments: _int(j['paidInstallments']),
        arrearsInstallments: _int(j['arrearsInstallments']),
        arrearsAmount: _num(j['arrearsAmount']),
        nextDueDate: _str(j['nextDueDate']),
        disbursedAt: _str(j['disbursedAt']),
        createdAt: _str(j['createdAt']),
        purpose: _str(j['purpose']),
      );
}

/// A single loan repayment (from GET /loans/{id}/repayments).
class LoanRepayment {
  const LoanRepayment({
    required this.id,
    required this.loanId,
    required this.memberId,
    required this.amount,
    required this.channel,
    required this.reference,
    required this.narration,
    required this.status,
    required this.receivedAt,
    required this.approvedAt,
  });

  final String id;
  final String loanId;
  final String memberId;
  final num amount;
  final String channel;
  final String reference;
  final String narration;
  final String status;
  final String receivedAt;
  final String approvedAt;

  factory LoanRepayment.fromJson(Map<String, dynamic> j) => LoanRepayment(
        id: _str(j['id']),
        loanId: _str(j['loanId']),
        memberId: _str(j['memberId']),
        amount: _num(j['amount']),
        channel: _str(j['channel']),
        reference: _str(j['reference']),
        narration: _str(j['narration']),
        status: _str(j['status']),
        receivedAt: _str(j['receivedAt']),
        approvedAt: _str(j['approvedAt']),
      );
}

/// The SACCO's platform subscription (from GET /api/v1/subscriptions).
class Subscription {
  const Subscription({
    required this.id,
    required this.packageId,
    required this.status,
    required this.lifecycleState,
    required this.invoice,
    required this.amount,
    required this.paid,
    required this.memberCount,
    required this.billableMembers,
    required this.paidMemberCapacity,
    required this.inactiveMemberOverflow,
    required this.unitPrice,
    required this.tierLabel,
    required this.billingDescription,
    required this.expiry,
    required this.daysToExpiry,
  });

  final String id;
  final String packageId;
  final String status;
  final String lifecycleState;
  final String invoice;
  final num amount;
  final num paid;
  final int memberCount;
  final int billableMembers;
  final int paidMemberCapacity;
  final int inactiveMemberOverflow;
  final num unitPrice;
  final String tierLabel;
  final String billingDescription;
  final String expiry;
  final int? daysToExpiry;

  num get balanceDue => (amount - paid) < 0 ? 0 : (amount - paid);
  int get uncoveredMembers =>
      memberCount - paidMemberCapacity < 0 ? 0 : memberCount - paidMemberCapacity;

  factory Subscription.fromJson(Map<String, dynamic> j) => Subscription(
        id: _str(j['id']),
        packageId: _str(j['packageId']),
        status: _str(j['status']),
        lifecycleState: _str(j['lifecycleState']),
        invoice: _str(j['invoice']),
        amount: _num(j['amount']),
        paid: _num(j['paid']),
        memberCount: _int(j['memberCount']),
        billableMembers: _int(j['billableMembers']),
        paidMemberCapacity: _int(j['paidMemberCapacity']),
        inactiveMemberOverflow: _int(j['inactiveMemberOverflow']),
        unitPrice: _num(j['unitPrice']),
        tierLabel: _str(j['tierLabel']),
        billingDescription: _str(j['billingDescription']),
        expiry: _str(j['expiry']),
        daysToExpiry: j['daysToExpiry'] == null ? null : _int(j['daysToExpiry']),
      );
}

/// A subscription package/tier (from GET /api/v1/subscription-packages).
class SubscriptionPackage {
  const SubscriptionPackage({
    required this.id,
    required this.name,
    required this.price,
    required this.billingPeriod,
    required this.minMembers,
    required this.memberLimit,
    required this.tierLabel,
  });

  final String id;
  final String name;
  final num price;
  final String billingPeriod;
  final int minMembers;
  final int memberLimit;
  final String tierLabel;

  factory SubscriptionPackage.fromJson(Map<String, dynamic> j) =>
      SubscriptionPackage(
        id: _str(j['id']),
        name: _str(j['name']),
        price: _num(j['price']),
        billingPeriod: _str(j['billingPeriod']),
        minMembers: _int(j['minMembers']),
        memberLimit: _int(j['memberLimit']),
        tierLabel: _str(j['tierLabel']),
      );
}

/// Interest booked in a given year, derived from loans on the client.
class InterestYear {
  const InterestYear({
    required this.year,
    required this.interest,
    required this.principal,
    required this.loanCount,
  });

  final int year;
  final num interest;
  final num principal;
  final int loanCount;
}

/// A single line in a member statement (from GET /members/{id}/statement).
class StatementLine {
  const StatementLine({
    required this.type,
    required this.channel,
    required this.reference,
    required this.narration,
    required this.amount,
    required this.savingsMovement,
    required this.sharesMovement,
    required this.welfareMovement,
    required this.savingsBalance,
    required this.sharesBalance,
    required this.welfareBalance,
    required this.postedAt,
  });

  final String type;
  final String channel;
  final String reference;
  final String narration;
  final num amount;
  final num savingsMovement;
  final num sharesMovement;
  final num welfareMovement;
  final num savingsBalance;
  final num sharesBalance;
  final num welfareBalance;
  final String postedAt;

  num movementFor(String fund) => fund == 'savings'
      ? savingsMovement
      : fund == 'shares'
          ? sharesMovement
          : welfareMovement;

  num balanceFor(String fund) => fund == 'savings'
      ? savingsBalance
      : fund == 'shares'
          ? sharesBalance
          : welfareBalance;

  factory StatementLine.fromJson(Map<String, dynamic> j) => StatementLine(
        type: _str(j['type']),
        channel: _str(j['channel']),
        reference: _str(j['reference']),
        narration: _str(j['narration']),
        amount: _num(j['amount']),
        savingsMovement: _num(j['savingsMovement']),
        sharesMovement: _num(j['sharesMovement']),
        welfareMovement: _num(j['welfareMovement']),
        savingsBalance: _num(j['savingsBalance']),
        sharesBalance: _num(j['sharesBalance']),
        welfareBalance: _num(j['welfareBalance']),
        postedAt: _str(j['postedAt']),
      );
}

/// A member statement over a date range, with opening/closing fund balances.
class MemberStatement {
  const MemberStatement({
    required this.openSavings,
    required this.openShares,
    required this.openWelfare,
    required this.closeSavings,
    required this.closeShares,
    required this.closeWelfare,
    required this.lines,
    required this.csv,
  });

  final num openSavings;
  final num openShares;
  final num openWelfare;
  final num closeSavings;
  final num closeShares;
  final num closeWelfare;
  final List<StatementLine> lines;
  final String csv;

  num openingFor(String fund) => fund == 'savings'
      ? openSavings
      : fund == 'shares'
          ? openShares
          : openWelfare;
  num closingFor(String fund) => fund == 'savings'
      ? closeSavings
      : fund == 'shares'
          ? closeShares
          : closeWelfare;

  /// Lines that moved the given fund, newest first.
  List<StatementLine> forFund(String fund) {
    final rows =
        lines.where((l) => l.movementFor(fund) != 0).toList();
    rows.sort((a, b) => b.postedAt.compareTo(a.postedAt));
    return rows;
  }

  factory MemberStatement.fromJson(Map<String, dynamic> j) {
    final open = (j['openingBalances'] as Map?) ?? const {};
    final close = (j['closingBalances'] as Map?) ?? const {};
    final rawLines = (j['lines'] as List?) ?? const [];
    return MemberStatement(
      openSavings: _num(open['savings']),
      openShares: _num(open['shares']),
      openWelfare: _num(open['welfare']),
      closeSavings: _num(close['savings']),
      closeShares: _num(close['shares']),
      closeWelfare: _num(close['welfare']),
      lines: rawLines
          .whereType<Map<String, dynamic>>()
          .map(StatementLine.fromJson)
          .toList(),
      csv: _str(j['csv']),
    );
  }
}

/// A single entry in a member's loan ledger (disbursement or repayment).
class LoanLedgerEntry {
  const LoanLedgerEntry({
    required this.date,
    required this.kind,
    required this.product,
    required this.amount,
    required this.reference,
    required this.status,
  });

  final String date;
  final String kind; // 'disbursement' | 'repayment'
  final String product;
  final num amount;
  final String reference;
  final String status;

  bool get isDisbursement => kind == 'disbursement';
}

/// A SACCO financial transaction (from GET /financial-transactions).
class FinancialTxn {
  const FinancialTxn({
    required this.id,
    required this.memberId,
    required this.type,
    required this.channel,
    required this.amount,
    required this.status,
    required this.reference,
    required this.narration,
    required this.postedAt,
    required this.createdAt,
  });

  final String id;
  final String memberId;
  final String type;
  final String channel;
  final num amount;
  final String status;
  final String reference;
  final String narration;
  final String postedAt;
  final String createdAt;

  /// Whether this transaction reduces a member's funds (outflow).
  bool get isOutflow =>
      type.contains('withdrawal') || type.contains('claim') || type.contains('disburse');

  /// The date to display/sort by (posted, else created).
  String get date => postedAt.isNotEmpty ? postedAt : createdAt;

  factory FinancialTxn.fromJson(Map<String, dynamic> j) => FinancialTxn(
        id: _str(j['id']),
        memberId: _str(j['memberId']),
        type: _str(j['type']),
        channel: _str(j['channel']),
        amount: _num(j['amount']),
        status: _str(j['status']),
        reference: _str(j['reference']),
        narration: _str(j['narration']),
        postedAt: _str(j['postedAt']),
        createdAt: _str(j['createdAt']),
      );
}

/// A welfare claim (from GET /welfare-claims).
class WelfareClaim {
  const WelfareClaim({
    required this.id,
    required this.memberName,
    required this.membershipNo,
    required this.claimType,
    required this.amount,
    required this.channel,
    required this.reference,
    required this.description,
    required this.status,
    required this.submittedAt,
    required this.decidedAt,
    required this.paidAt,
  });

  final String id;
  final String memberName;
  final String membershipNo;
  final String claimType;
  final num amount;
  final String channel;
  final String reference;
  final String description;
  final String status;
  final String submittedAt;
  final String decidedAt;
  final String paidAt;

  factory WelfareClaim.fromJson(Map<String, dynamic> j) => WelfareClaim(
        id: _str(j['id']),
        memberName: _str(j['memberName']),
        membershipNo: _str(j['membershipNo']),
        claimType: _str(j['claimType']),
        amount: _num(j['amount']),
        channel: _str(j['channel']),
        reference: _str(j['reference']),
        description: _str(j['description']),
        status: _str(j['status']),
        submittedAt: _str(j['submittedAt']),
        decidedAt: _str(j['decidedAt']),
        paidAt: _str(j['paidAt']),
      );
}

/// An audit event (from GET /audit-events).
class AuditEvent {
  const AuditEvent({
    required this.id,
    required this.actorName,
    required this.action,
    required this.resourceType,
    required this.resourceId,
    required this.ipAddress,
    required this.createdAt,
  });

  final String id;
  final String actorName;
  final String action;
  final String resourceType;
  final String resourceId;
  final String ipAddress;
  final String createdAt;

  factory AuditEvent.fromJson(Map<String, dynamic> j) => AuditEvent(
        id: _str(j['id']),
        actorName: _str(j['actorName']),
        action: _str(j['action']),
        resourceType: _str(j['resourceType']),
        resourceId: _str(j['resourceId']),
        ipAddress: _str(j['ipAddress']),
        createdAt: _str(j['createdAt']),
      );
}

/// A staff user (from GET /users).
class AppUser {
  const AppUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.status,
    required this.mfaEnabled,
    required this.passwordResetRequired,
  });

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String status;
  final bool mfaEnabled;
  final bool passwordResetRequired;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: _str(j['id']),
        fullName: _str(j['fullName']),
        email: _str(j['email']),
        phone: _str(j['phone']),
        status: _str(j['status']),
        mfaEnabled: j['mfaEnabled'] == true,
        passwordResetRequired: j['passwordResetRequired'] == true,
      );
}

/// A role with its permissions (from GET /roles).
class AppRole {
  const AppRole({
    required this.id,
    required this.name,
    required this.protectedRole,
    required this.permissionIds,
  });

  final String id;
  final String name;
  final bool protectedRole;
  final List<String> permissionIds;

  factory AppRole.fromJson(Map<String, dynamic> j) => AppRole(
        id: _str(j['id']),
        name: _str(j['name']),
        protectedRole: j['protectedRole'] == true,
        permissionIds: _strListTop(j['permissionIds']),
      );
}

/// One installment in a loan's repayment schedule (GET /loans/{id}/schedule).
class LoanScheduleRow {
  const LoanScheduleRow({
    required this.installmentNo,
    required this.dueDate,
    required this.principalDue,
    required this.interestDue,
    required this.totalDue,
    required this.paidAmount,
    required this.balanceDue,
    required this.daysPastDue,
    required this.agingBucket,
    required this.status,
  });

  final int installmentNo;
  final String dueDate;
  final num principalDue;
  final num interestDue;
  final num totalDue;
  final num paidAmount;
  final num balanceDue;
  final int daysPastDue;
  final String agingBucket;
  final String status;

  bool get isPaid => status.contains('paid') || balanceDue <= 0;
  bool get isOverdue => daysPastDue > 0 && balanceDue > 0;

  factory LoanScheduleRow.fromJson(Map<String, dynamic> j) => LoanScheduleRow(
        installmentNo: _int(j['installmentNo']),
        dueDate: _str(j['dueDate']),
        principalDue: _num(j['principalDue']),
        interestDue: _num(j['interestDue']),
        totalDue: _num(j['totalDue']),
        paidAmount: _num(j['paidAmount']),
        balanceDue: _num(j['balanceDue']),
        daysPastDue: _int(j['daysPastDue']),
        agingBucket: _str(j['agingBucket']),
        status: _str(j['status']),
      );
}

/// A member's next of kin (GET /members/{id}/next-of-kin).
class NextOfKin {
  const NextOfKin({
    required this.fullName,
    required this.relationship,
    required this.phone,
    required this.address,
    required this.primaryContact,
  });
  final String fullName;
  final String relationship;
  final String phone;
  final String address;
  final bool primaryContact;

  factory NextOfKin.fromJson(Map<String, dynamic> j) => NextOfKin(
        fullName: _str(j['fullName']),
        relationship: _str(j['relationship']),
        phone: _str(j['phone']),
        address: _str(j['address']),
        primaryContact: j['primaryContact'] == true,
      );
}

/// A member's beneficiary (GET /members/{id}/beneficiaries).
class Beneficiary {
  const Beneficiary({
    required this.fullName,
    required this.relationship,
    required this.phone,
    required this.allocationPercent,
  });
  final String fullName;
  final String relationship;
  final String phone;
  final num allocationPercent;

  factory Beneficiary.fromJson(Map<String, dynamic> j) => Beneficiary(
        fullName: _str(j['fullName']),
        relationship: _str(j['relationship']),
        phone: _str(j['phone']),
        allocationPercent: _num(j['allocationPercent']),
      );
}

/// A member KYC document (GET /members/{id}/documents).
class MemberDocument {
  const MemberDocument({
    required this.documentType,
    required this.verificationStatus,
    required this.retentionStatus,
    required this.createdAt,
  });
  final String documentType;
  final String verificationStatus;
  final String retentionStatus;
  final String createdAt;

  factory MemberDocument.fromJson(Map<String, dynamic> j) => MemberDocument(
        documentType: _str(j['documentType']),
        verificationStatus: _str(j['verificationStatus']),
        retentionStatus: _str(j['retentionStatus']),
        createdAt: _str(j['createdAt']),
      );
}

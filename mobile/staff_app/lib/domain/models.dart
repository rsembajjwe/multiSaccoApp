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
    required this.tenantId,
    this.expiresAt,
    this.currency = 'UGX',
    this.currencyDigits = 0,
  });

  final String token;
  final String userName;
  final String email;
  final List<String> roleNames;
  final List<String> permissions;
  final String saccoName;
  final String tenantId;
  final DateTime? expiresAt;
  final String currency;
  final int currencyDigits;

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
      tenantId: '${user?['tenantId'] ?? tenant?['id'] ?? ''}',
      expiresAt: DateTime.tryParse('${j['expiresAt'] ?? ''}'),
      currency: '${tenant?['currencyCode'] ?? 'UGX'}'.isEmpty
          ? 'UGX'
          : '${tenant?['currencyCode'] ?? 'UGX'}',
      currencyDigits: _int(tenant?['currencyDigits'] ?? 0),
    );
  }
}

class SaccoProfile {
  const SaccoProfile({
    required this.id,
    required this.tenantId,
    required this.legalName,
    required this.email,
    required this.phone,
    required this.website,
    required this.loanInterestRate,
    required this.logoDataUrl,
    required this.membershipSubscriptionAmount,
  });

  final String id;
  final String tenantId;
  final String legalName;
  final String email;
  final String phone;
  final String website;
  final num loanInterestRate;
  final String logoDataUrl;
  final num membershipSubscriptionAmount;

  factory SaccoProfile.fromJson(Map<String, dynamic> j) => SaccoProfile(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        legalName: _str(j['legalName']),
        email: _str(j['email']),
        phone: _str(j['phone']),
        website: _str(j['website']),
        loanInterestRate: _num(j['loanInterestRate']),
        logoDataUrl: _str(j['logoDataUrl']),
        membershipSubscriptionAmount: _num(j['membershipSubscriptionAmount']),
      );
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
    required this.pendingPostings,
    required this.openLoans,
    required this.openComplaints,
    required this.totalSavings,
    required this.totalShares,
    required this.totalWelfare,
    required this.loanPortfolio,
    required this.memberFunds,
    required this.smsBalance,
    required this.smsRate,
  });

  final int members;
  final int activeMembers;
  final int pendingPostings;
  final int openLoans;
  final int openComplaints;
  final num totalSavings;
  final num totalShares;
  final num totalWelfare;
  final num loanPortfolio;
  final List<FundBalanceSummary> memberFunds;
  final int smsBalance;
  final num smsRate;

  factory SaccoStatus.fromJson(Map<String, dynamic> j) {
    final c = (j['counts'] as Map?) ?? const {};
    final f = (j['financials'] as Map?) ?? const {};
    return SaccoStatus(
      members: _int(c['members']),
      activeMembers: _int(c['activeMembers']),
      pendingPostings: _int(c['pendingFinancialTransactions']),
      openLoans: _int(c['openLoans']),
      openComplaints: _int(c['openComplaints']),
      totalSavings: _num(f['totalSavings']),
      totalShares: _num(f['totalShares']),
      totalWelfare: _num(f['totalWelfare']),
      loanPortfolio: _num(f['loanPortfolio']),
      memberFunds: (f['memberFunds'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(FundBalanceSummary.fromJson)
          .toList(),
      smsBalance: _int(f['smsBalance']),
      smsRate: _num(f['smsRate']),
    );
  }
}

class FundBalanceSummary {
  const FundBalanceSummary({
    required this.code,
    required this.name,
    required this.basis,
    required this.system,
    required this.balance,
  });

  final String code;
  final String name;
  final String basis;
  final bool system;
  final num balance;

  factory FundBalanceSummary.fromJson(Map<String, dynamic> j) =>
      FundBalanceSummary(
        code: _str(j['code']),
        name: _str(j['name']),
        basis: _str(j['basis']),
        system: j['system'] == true,
        balance: _num(j['balance']),
      );
}

String _str(dynamic v) => v == null ? '' : '$v';
String? _strn(dynamic v) {
  if (v == null) return null;
  final t = '$v';
  return t.isEmpty ? null : t;
}

List<String> _strListTop(dynamic v) => v is List
    ? v.map((e) => '$e').where((e) => e.isNotEmpty).toList()
    : const <String>[];

/// A member with their financial balances (from GET /members[/{id}]).
class Member {
  const Member({
    required this.id,
    required this.branchId,
    required this.nationalId,
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
  final String branchId;
  final String nationalId;
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
        branchId: _str(j['branchId']),
        nationalId: _str(j['nationalId']),
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

class MemberFundBalance {
  const MemberFundBalance({
    required this.memberId,
    required this.fundCode,
    required this.balance,
    required this.updatedAt,
  });

  final String memberId;
  final String fundCode;
  final num balance;
  final String updatedAt;

  factory MemberFundBalance.fromJson(Map<String, dynamic> j) =>
      MemberFundBalance(
        memberId: _str(j['memberId']),
        fundCode: _str(j['fundCode']),
        balance: _num(j['balance']),
        updatedAt: _str(j['updatedAt']),
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
    required this.chargeFee,
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
    required this.repaymentMonths,
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
  final num chargeFee;
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
  final int repaymentMonths;
  final String disbursedAt;
  final String createdAt;
  final String purpose;

  bool get isOpen => status == 'active' || status == 'overdue';
  bool get inArrears => arrearsAmount > 0 || arrearsInstallments > 0;

  factory Loan.fromJson(Map<String, dynamic> j) => Loan(
        id: _str(j['id']),
        memberId: _str(j['memberId']),
        product: _str(j['product']),
        amount: _num(j['amount']),
        balance: _num(j['balance']),
        interestRate: _num(j['interestRate']),
        interestAmount: _num(j['interestAmount']),
        chargeFee: _num(j['chargeFee']),
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
        repaymentMonths: _int(j['repaymentMonths']),
        disbursedAt: _str(j['disbursedAt']),
        createdAt: _str(j['createdAt']),
        purpose: _str(j['purpose']),
      );
}

class FundType {
  const FundType({
    required this.id,
    required this.code,
    required this.name,
    required this.basis,
    required this.description,
    required this.system,
    required this.active,
    required this.displayOrder,
  });

  final String id;
  final String code;
  final String name;
  final String basis;
  final String description;
  final bool system;
  final bool active;
  final int displayOrder;

  factory FundType.fromJson(Map<String, dynamic> j) => FundType(
        id: _str(j['id']),
        code: _str(j['code']),
        name: _str(j['name']),
        basis: _str(j['basis']),
        description: _str(j['description']),
        system: j['system'] == true,
        active: j['active'] != false,
        displayOrder: _int(j['displayOrder']),
      );
}

class LoanGuarantor {
  const LoanGuarantor({
    required this.id,
    required this.loanId,
    required this.memberId,
    required this.guaranteedAmount,
    required this.status,
    required this.loan,
    required this.capacity,
    required this.guaranteeCeiling,
    required this.committedGuarantees,
  });

  final String id;
  final String loanId;
  final String memberId;
  final num guaranteedAmount;
  final String status;
  final Loan? loan;
  final num capacity;
  final num guaranteeCeiling;
  final num committedGuarantees;

  num get guaranteedLoanBalance => loan?.balance ?? guaranteedAmount;

  bool get activeCommitment =>
      status != 'rejected' && status != 'released' && status != 'cancelled';

  factory LoanGuarantor.fromJson(Map<String, dynamic> j) => LoanGuarantor(
        id: _str(j['id']),
        loanId: _str(j['loanId']),
        memberId: _str(j['memberId']),
        guaranteedAmount: _num(j['guaranteedAmount']),
        status: _str(j['status']),
        loan: j['loan'] is Map<String, dynamic>
            ? Loan.fromJson(j['loan'] as Map<String, dynamic>)
            : null,
        capacity: _num(j['capacity']),
        guaranteeCeiling: _num(j['guaranteeCeiling']),
        committedGuarantees: _num(j['committedGuarantees']),
      );
}

class LoanExtension {
  const LoanExtension({
    required this.id,
    required this.tenantId,
    required this.loanId,
    required this.additionalMonths,
    required this.chargeFee,
    required this.reason,
    required this.requestedByMember,
    required this.recordedByUserId,
    required this.createdAt,
  });

  final String id;
  final String tenantId;
  final String loanId;
  final int additionalMonths;
  final num chargeFee;
  final String reason;
  final bool requestedByMember;
  final String recordedByUserId;
  final String createdAt;

  factory LoanExtension.fromJson(Map<String, dynamic> j) => LoanExtension(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        loanId: _str(j['loanId']),
        additionalMonths: _int(j['additionalMonths']),
        chargeFee: _num(j['chargeFee']),
        reason: _str(j['reason']),
        requestedByMember: j['requestedByMember'] != false,
        recordedByUserId: _str(j['recordedByUserId']),
        createdAt: _str(j['createdAt']),
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

class MemberSubscription {
  const MemberSubscription({
    required this.id,
    required this.tenantId,
    required this.memberId,
    required this.planName,
    required this.amount,
    required this.paid,
    required this.balanceDue,
    required this.status,
    required this.billingPeriod,
    required this.expiry,
    required this.lifecycleState,
  });

  final String id;
  final String tenantId;
  final String memberId;
  final String planName;
  final num amount;
  final num paid;
  final num balanceDue;
  final String status;
  final String billingPeriod;
  final String expiry;
  final String lifecycleState;

  bool get isPaid => balanceDue <= 0 && status == 'active';

  factory MemberSubscription.fromJson(Map<String, dynamic> j) =>
      MemberSubscription(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        memberId: _str(j['memberId']),
        planName: _str(j['planName']),
        amount: _num(j['amount']),
        paid: _num(j['paid']),
        balanceDue: _num(j['balanceDue']),
        status: _str(j['status']),
        billingPeriod: _str(j['billingPeriod']),
        expiry: _str(j['expiry']),
        lifecycleState: _str(j['lifecycleState']),
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
    required this.makerUserId,
    required this.checkerUserId,
    required this.rejectionReason,
    required this.reversalReason,
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
  final String makerUserId;
  final String checkerUserId;
  final String rejectionReason;
  final String reversalReason;

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
        makerUserId: _str(j['makerUserId']),
        checkerUserId: _str(j['checkerUserId']),
        rejectionReason: _str(j['rejectionReason']),
        reversalReason: _str(j['reversalReason']),
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
    required this.id,
    required this.documentType,
    required this.verificationStatus,
    required this.retentionStatus,
    required this.createdAt,
  });
  final String id;
  final String documentType;
  final String verificationStatus;
  final String retentionStatus;
  final String createdAt;

  bool get isPdf => documentType.toLowerCase().contains('pdf');

  factory MemberDocument.fromJson(Map<String, dynamic> j) => MemberDocument(
        id: _str(j['id']),
        documentType: _str(j['documentType']),
        verificationStatus: _str(j['verificationStatus']),
        retentionStatus: _str(j['retentionStatus']),
        createdAt: _str(j['createdAt']),
      );
}

/// A member complaint (GET /complaints).
class Complaint {
  const Complaint({
    required this.id,
    required this.memberId,
    required this.category,
    required this.subject,
    required this.description,
    required this.channel,
    required this.priority,
    required this.status,
    required this.resolutionNotes,
    required this.resolvedAt,
    required this.createdAt,
  });

  final String id;
  final String memberId;
  final String category;
  final String subject;
  final String description;
  final String channel;
  final String priority;
  final String status;
  final String resolutionNotes;
  final String resolvedAt;
  final String createdAt;

  factory Complaint.fromJson(Map<String, dynamic> j) => Complaint(
        id: _str(j['id']),
        memberId: _str(j['memberId']),
        category: _str(j['category']),
        subject: _str(j['subject']),
        description: _str(j['description']),
        channel: _str(j['channel']),
        priority: _str(j['priority']),
        status: _str(j['status']),
        resolutionNotes: _str(j['resolutionNotes']),
        resolvedAt: _str(j['resolvedAt']),
        createdAt: _str(j['createdAt']),
      );
}

/// Raw bytes of a fetched document plus its content type.
class DocumentBytes {
  const DocumentBytes(this.bytes, this.contentType);
  final List<int> bytes;
  final String contentType;
  bool get isImage => contentType.startsWith('image/');
  bool get isPdf => contentType.contains('pdf');
}

/// A SACCO notification message (GET /notifications/messages).
class AppNotification {
  const AppNotification({
    required this.id,
    required this.memberId,
    required this.category,
    required this.eventType,
    required this.title,
    required this.body,
    required this.status,
    required this.createdAt,
    this.readAt,
    this.resourceType,
    this.resourceId,
  });

  final String id;
  final String memberId;
  final String category;
  final String eventType;
  final String title;
  final String body;
  final String status;
  final String createdAt;
  final String? readAt;
  final String? resourceType;
  final String? resourceId;

  bool get isRead => readAt != null && readAt!.isNotEmpty;

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: _str(j['id']),
        memberId: _str(j['memberId']),
        category: _str(j['category']),
        eventType: _str(j['eventType']),
        title: _str(j['title']),
        body: _str(j['body']),
        status: _str(j['status']),
        createdAt: _str(j['createdAt']),
        readAt: _strn(j['readAt']),
        resourceType: _strn(j['resourceType']),
        resourceId: _strn(j['resourceId']),
      );
}

class MobileMoneyBalance {
  const MobileMoneyBalance({
    required this.providerId,
    required this.label,
    required this.available,
    this.balance,
    this.currency,
    this.message,
    this.checkedAt,
  });

  final String providerId;
  final String label;
  final bool available;
  final num? balance;
  final String? currency;
  final String? message;
  final String? checkedAt;

  factory MobileMoneyBalance.fromJson(Map<String, dynamic> j) =>
      MobileMoneyBalance(
        providerId: _str(j['providerId']),
        label: _str(j['label']),
        available: j['available'] == true,
        balance: j['balance'] == null ? null : _num(j['balance']),
        currency: _strn(j['currency']),
        message: _strn(j['message']),
        checkedAt: _strn(j['checkedAt']),
      );
}

/// A mobile-money payment request initiated by a member or staff prompt.
class MobileMoneyPaymentRequest {
  const MobileMoneyPaymentRequest({
    required this.id,
    required this.tenantId,
    required this.memberId,
    required this.loanId,
    required this.purpose,
    required this.amount,
    required this.currencyCode,
    required this.payerPhone,
    required this.externalReference,
    required this.provider,
    required this.providerReference,
    required this.status,
    required this.statusMessage,
    required this.checkoutPrompt,
    required this.callbackPosting,
    required this.requestedAt,
    required this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String tenantId;
  final String memberId;
  final String loanId;
  final String purpose;
  final num amount;
  final String currencyCode;
  final String payerPhone;
  final String externalReference;
  final String provider;
  final String providerReference;
  final String status;
  final String statusMessage;
  final String checkoutPrompt;
  final bool callbackPosting;
  final String requestedAt;
  final String completedAt;
  final String createdAt;
  final String updatedAt;

  bool get canRefresh =>
      status != 'posted' &&
      status != 'failed' &&
      status != 'expired' &&
      status != 'cancelled';

  bool get canCloseManually => canRefresh;

  factory MobileMoneyPaymentRequest.fromJson(Map<String, dynamic> j) =>
      MobileMoneyPaymentRequest(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        memberId: _str(j['memberId']),
        loanId: _str(j['loanId']),
        purpose: _str(j['purpose']),
        amount: _num(j['amount']),
        currencyCode: _str(j['currencyCode']),
        payerPhone: _str(j['payerPhone']),
        externalReference: _str(j['externalReference']),
        provider: _str(j['provider']),
        providerReference: _str(j['providerReference']),
        status: _str(j['status']),
        statusMessage: _str(j['statusMessage']),
        checkoutPrompt: _str(j['checkoutPrompt']),
        callbackPosting: j['callbackPosting'] == true,
        requestedAt: _str(j['requestedAt']),
        completedAt: _str(j['completedAt']),
        createdAt: _str(j['createdAt']),
        updatedAt: _str(j['updatedAt']),
      );
}

/// A provider callback received for a mobile-money payment.
class MobileMoneyCallback {
  const MobileMoneyCallback({
    required this.id,
    required this.tenantId,
    required this.memberId,
    required this.purpose,
    required this.amount,
    required this.externalReference,
    required this.provider,
    required this.status,
    required this.resourceType,
    required this.resourceId,
    required this.receivedAt,
    required this.createdAt,
    required this.duplicate,
    required this.suggestedCollectionAccountId,
    required this.suggestedCollectionAccount,
    required this.collectionAccountId,
    required this.collectionAccount,
  });

  final String id;
  final String tenantId;
  final String memberId;
  final String purpose;
  final num amount;
  final String externalReference;
  final String provider;
  final String status;
  final String resourceType;
  final String resourceId;
  final String receivedAt;
  final String createdAt;
  final bool duplicate;
  final String suggestedCollectionAccountId;
  final String suggestedCollectionAccount;
  final String collectionAccountId;
  final String collectionAccount;

  String get accountLabel => collectionAccount.isNotEmpty
      ? collectionAccount
      : suggestedCollectionAccount;

  factory MobileMoneyCallback.fromJson(Map<String, dynamic> j) =>
      MobileMoneyCallback(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        memberId: _str(j['memberId']),
        purpose: _str(j['purpose']),
        amount: _num(j['amount']),
        externalReference: _str(j['externalReference']),
        provider: _str(j['provider']),
        status: _str(j['status']),
        resourceType: _str(j['resourceType']),
        resourceId: _str(j['resourceId']),
        receivedAt: _str(j['receivedAt']),
        createdAt: _str(j['createdAt']),
        duplicate: j['duplicate'] == true,
        suggestedCollectionAccountId: _str(j['suggestedCollectionAccountId']),
        suggestedCollectionAccount: _str(j['suggestedCollectionAccount']),
        collectionAccountId: _str(j['collectionAccountId']),
        collectionAccount: _str(j['collectionAccount']),
      );
}

class ReconciliationReport {
  const ReconciliationReport({
    required this.summary,
    required this.matches,
    required this.unmatchedStatementLines,
    required this.unmatchedLedgerLines,
  });

  final ReconciliationSummary summary;
  final List<ReconciliationMatch> matches;
  final List<ReconciliationStatementLine> unmatchedStatementLines;
  final List<ReconciliationLedgerLine> unmatchedLedgerLines;

  factory ReconciliationReport.fromJson(Map<String, dynamic> j) =>
      ReconciliationReport(
        summary: ReconciliationSummary.fromJson(
          (j['summary'] as Map<String, dynamic>?) ?? const {},
        ),
        matches: ((j['matches'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(ReconciliationMatch.fromJson)
            .toList(),
        unmatchedStatementLines:
            ((j['unmatchedStatementLines'] as List?) ?? const [])
                .whereType<Map<String, dynamic>>()
                .map(ReconciliationStatementLine.fromJson)
                .toList(),
        unmatchedLedgerLines: ((j['unmatchedLedgerLines'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(ReconciliationLedgerLine.fromJson)
            .toList(),
      );
}

class ReconciliationSummary {
  const ReconciliationSummary({
    required this.statementLines,
    required this.ledgerLines,
    required this.matched,
    required this.unmatchedStatementLines,
    required this.unmatchedLedgerLines,
    required this.matchedAmount,
    required this.unmatchedStatementAmount,
    required this.unmatchedLedgerAmount,
  });

  final int statementLines;
  final int ledgerLines;
  final int matched;
  final int unmatchedStatementLines;
  final int unmatchedLedgerLines;
  final num matchedAmount;
  final num unmatchedStatementAmount;
  final num unmatchedLedgerAmount;

  int get exceptionCount => unmatchedStatementLines + unmatchedLedgerLines;

  factory ReconciliationSummary.fromJson(Map<String, dynamic> j) =>
      ReconciliationSummary(
        statementLines: _int(j['statementLines']),
        ledgerLines: _int(j['ledgerLines']),
        matched: _int(j['matched']),
        unmatchedStatementLines: _int(j['unmatchedStatementLines']),
        unmatchedLedgerLines: _int(j['unmatchedLedgerLines']),
        matchedAmount: _num(j['matchedAmount']),
        unmatchedStatementAmount: _num(j['unmatchedStatementAmount']),
        unmatchedLedgerAmount: _num(j['unmatchedLedgerAmount']),
      );
}

class ReconciliationMatch {
  const ReconciliationMatch({
    required this.statementLine,
    required this.ledgerLine,
  });

  final ReconciliationStatementLine statementLine;
  final ReconciliationLedgerLine ledgerLine;

  factory ReconciliationMatch.fromJson(Map<String, dynamic> j) =>
      ReconciliationMatch(
        statementLine: ReconciliationStatementLine.fromJson(
          (j['statementLine'] as Map<String, dynamic>?) ?? const {},
        ),
        ledgerLine: ReconciliationLedgerLine.fromJson(
          (j['ledgerLine'] as Map<String, dynamic>?) ?? const {},
        ),
      );
}

class ReconciliationStatementLine {
  const ReconciliationStatementLine({
    required this.id,
    required this.tenantId,
    required this.accountCode,
    required this.channel,
    required this.amount,
    required this.externalReference,
    required this.description,
    required this.statementDate,
    required this.suggestedCollectionAccount,
    required this.collectionAccount,
  });

  final String id;
  final String tenantId;
  final String accountCode;
  final String channel;
  final num amount;
  final String externalReference;
  final String description;
  final String statementDate;
  final String suggestedCollectionAccount;
  final String collectionAccount;

  String get accountLabel =>
      collectionAccount.isNotEmpty ? collectionAccount : suggestedCollectionAccount;

  factory ReconciliationStatementLine.fromJson(Map<String, dynamic> j) =>
      ReconciliationStatementLine(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        accountCode: _str(j['accountCode']),
        channel: _str(j['channel']),
        amount: _num(j['amount']),
        externalReference: _str(j['externalReference']),
        description: _str(j['description']),
        statementDate: _str(j['statementDate']),
        suggestedCollectionAccount: _str(j['suggestedCollectionAccount']),
        collectionAccount: _str(j['collectionAccount']),
      );
}

class ReconciliationLedgerLine {
  const ReconciliationLedgerLine({
    required this.id,
    required this.tenantId,
    required this.journalEntryId,
    required this.sourceType,
    required this.sourceId,
    required this.reference,
    required this.description,
    required this.postedAt,
    required this.accountCode,
    required this.accountName,
    required this.amount,
  });

  final String id;
  final String tenantId;
  final String journalEntryId;
  final String sourceType;
  final String sourceId;
  final String reference;
  final String description;
  final String postedAt;
  final String accountCode;
  final String accountName;
  final num amount;

  factory ReconciliationLedgerLine.fromJson(Map<String, dynamic> j) =>
      ReconciliationLedgerLine(
        id: _str(j['id']),
        tenantId: _str(j['tenantId']),
        journalEntryId: _str(j['journalEntryId']),
        sourceType: _str(j['sourceType']),
        sourceId: _str(j['sourceId']),
        reference: _str(j['reference']),
        description: _str(j['description']),
        postedAt: _str(j['postedAt']),
        accountCode: _str(j['accountCode']),
        accountName: _str(j['accountName']),
        amount: _num(j['amount']),
      );
}

/// A page of results with paging metadata (from a PagedResponse envelope).
class PageResult<T> {
  const PageResult(this.items, this.page, this.totalPages, this.total);
  final List<T> items;
  final int page;
  final int totalPages;
  final int total;

  bool get hasMore => page + 1 < totalPages;

  PageResult<R> mapItems<R>(R Function(T) f) =>
      PageResult<R>(items.map(f).toList(), page, totalPages, total);
}

/// A support chat thread (GET /chat/threads).
class ChatThread {
  const ChatThread({
    required this.id,
    required this.type,
    required this.memberId,
    required this.memberName,
    required this.subject,
    required this.status,
    required this.lastMessageAt,
    required this.lastMessagePreview,
    required this.lastMessageSenderType,
  });

  final String id;
  final String type;
  final String memberId;
  final String memberName;
  final String subject;
  final String status;
  final String lastMessageAt;
  final String lastMessagePreview;
  final String lastMessageSenderType;

  /// The member spoke last, so the thread is awaiting a staff reply.
  bool get awaitingReply => lastMessageSenderType == 'member';

  factory ChatThread.fromJson(Map<String, dynamic> j) => ChatThread(
        id: _str(j['id']),
        type: _str(j['type']),
        memberId: _str(j['memberId']),
        memberName: _str(j['memberName']),
        subject: _str(j['subject']),
        status: _str(j['status']),
        lastMessageAt: _str(j['lastMessageAt']),
        lastMessagePreview: _str(j['lastMessagePreview']),
        lastMessageSenderType: _str(j['lastMessageSenderType']),
      );
}

/// A message within a chat thread (GET /chat/threads/{id}/messages).
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderType,
    required this.senderName,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String senderType;
  final String senderName;
  final String body;
  final String createdAt;

  bool get fromStaff => senderType != 'member';

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: _str(j['id']),
        senderType: _str(j['senderType']),
        senderName: _str(j['senderName']),
        body: _str(j['body']),
        createdAt: _str(j['createdAt']),
      );
}

/// A SACCO branch (GET /branches).
class Branch {
  const Branch({
    required this.id,
    required this.code,
    required this.name,
    required this.address,
    required this.managerUserId,
    required this.status,
  });

  final String id;
  final String code;
  final String name;
  final String address;
  final String managerUserId;
  final String status;

  factory Branch.fromJson(Map<String, dynamic> j) => Branch(
        id: _str(j['id']),
        code: _str(j['code']),
        name: _str(j['name']),
        address: _str(j['address']),
        managerUserId: _str(j['managerUserId']),
        status: _str(j['status']),
      );
}

/// A financial product (GET /financial-products).
class FinancialProduct {
  const FinancialProduct({
    required this.id,
    required this.productType,
    required this.code,
    required this.name,
    required this.contributionAmount,
    required this.minimumBalance,
    required this.interestRate,
    required this.status,
  });

  final String id;
  final String productType;
  final String code;
  final String name;
  final num contributionAmount;
  final num minimumBalance;
  final num interestRate;
  final String status;

  String get interestLabel {
    if (interestRate <= 0) return '—';
    final pct = interestRate <= 1 ? interestRate * 100 : interestRate;
    return '${pct.toStringAsFixed(pct % 1 == 0 ? 0 : 1)}%';
  }

  factory FinancialProduct.fromJson(Map<String, dynamic> j) => FinancialProduct(
        id: _str(j['id']),
        productType: _str(j['productType']),
        code: _str(j['code']),
        name: _str(j['name']),
        contributionAmount: _num(j['contributionAmount']),
        minimumBalance: _num(j['minimumBalance']),
        interestRate: _num(j['interestRate']),
        status: _str(j['status']),
      );
}

class SavingsTransfer {
  const SavingsTransfer({
    required this.id,
    required this.sourceMemberId,
    required this.amount,
    required this.destinationType,
    this.destinationFundCode,
    this.destinationMemberId,
    this.loanId,
    this.batchId,
    required this.reference,
    this.reason,
    this.authorizationReference,
    this.resolutionReference,
    required this.status,
    this.createdByUserId,
    this.decidedByUserId,
    this.firstApprovedByUserId,
    this.decisionReason,
    this.createdAt,
  });

  final String id;
  final String sourceMemberId;
  final num amount;
  final String destinationType;
  final String? destinationFundCode;
  final String? destinationMemberId;
  final String? loanId;
  final String? batchId;
  final String reference;
  final String? reason;
  final String? authorizationReference;
  final String? resolutionReference;
  final String status;
  final String? createdByUserId;
  final String? decidedByUserId;
  final String? firstApprovedByUserId;
  final String? decisionReason;
  final DateTime? createdAt;

  bool get isPending =>
      status == 'pending' || status == 'awaiting_second_approval';

  String get destinationLabel {
    switch (destinationType) {
      case 'own_fund':
        return 'To ${destinationFundCode ?? 'fund'}';
      case 'loan_repayment':
        return 'Loan repayment';
      case 'sacco_income':
        return 'SACCO income';
      case 'another_member':
        return 'Another member';
      default:
        return destinationType.replaceAll('_', ' ');
    }
  }

  factory SavingsTransfer.fromJson(Map<String, dynamic> j) => SavingsTransfer(
        id: _str(j['id']),
        sourceMemberId: _str(j['sourceMemberId']),
        amount: _num(j['amount']),
        destinationType: _str(j['destinationType']),
        destinationFundCode: _strn(j['destinationFundCode']),
        destinationMemberId: _strn(j['destinationMemberId']),
        loanId: _strn(j['loanId']),
        batchId: _strn(j['batchId']),
        reference: _str(j['reference']),
        reason: _strn(j['reason']),
        authorizationReference: _strn(j['authorizationReference']),
        resolutionReference: _strn(j['resolutionReference']),
        status: _str(j['status']),
        createdByUserId: _strn(j['createdByUserId']),
        decidedByUserId: _strn(j['decidedByUserId']),
        firstApprovedByUserId: _strn(j['firstApprovedByUserId']),
        decisionReason: _strn(j['decisionReason']),
        createdAt: DateTime.tryParse(_str(j['createdAt'])),
      );
}

class GovernanceResolution {
  const GovernanceResolution({
    required this.id,
    required this.title,
    this.decision,
    this.ownerName,
    this.ownerTitle,
    this.dueDate,
    required this.status,
  });

  final String id;
  final String title;
  final String? decision;
  final String? ownerName;
  final String? ownerTitle;
  final String? dueDate;
  final String status;

  factory GovernanceResolution.fromJson(Map<String, dynamic> j) =>
      GovernanceResolution(
        id: _str(j['id']),
        title: _str(j['title']),
        decision: _strn(j['decision']),
        ownerName: _strn(j['ownerName']),
        ownerTitle: _strn(j['ownerTitle']),
        dueDate: _strn(j['dueDate']),
        status: _str(j['status']),
      );
}

class GovernanceMeeting {
  const GovernanceMeeting({
    required this.id,
    required this.title,
    required this.meetingType,
    this.scheduledAt,
    required this.status,
    this.minutes,
    this.openResolutions = 0,
    this.resolutions = const [],
  });

  final String id;
  final String title;
  final String meetingType;
  final DateTime? scheduledAt;
  final String status;
  final String? minutes;
  final int openResolutions;
  final List<GovernanceResolution> resolutions;

  String get typeLabel => meetingType.replaceAll('_', ' ');

  factory GovernanceMeeting.fromJson(Map<String, dynamic> j) =>
      GovernanceMeeting(
        id: _str(j['id']),
        title: _str(j['title']),
        meetingType: _str(j['meetingType']),
        scheduledAt: DateTime.tryParse(_str(j['scheduledAt'])),
        status: _str(j['status']),
        minutes: _strn(j['minutes']),
        openResolutions: _int(j['openResolutions']),
        resolutions: (j['resolutions'] as List?)
                ?.whereType<Map<String, dynamic>>()
                .map(GovernanceResolution.fromJson)
                .toList() ??
            const [],
      );
}

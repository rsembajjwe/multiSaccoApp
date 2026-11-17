num numberValue(dynamic value) =>
    value is num ? value : num.tryParse('${value ?? 0}') ?? 0;

String stringValue(dynamic value) => value == null ? '' : '$value';

List<String> stringList(dynamic value) => value is List
    ? value.map(stringValue).where((item) => item.isNotEmpty).toList()
    : const [];

class PlatformSession {
  const PlatformSession({
    required this.token,
    required this.userId,
    required this.name,
    required this.email,
    required this.phone,
    required this.tenantId,
    required this.roles,
    required this.permissions,
  });

  final String token;
  final String userId;
  final String name;
  final String email;
  final String phone;
  final String tenantId;
  final List<String> roles;
  final List<String> permissions;

  bool can(String permission) => permissions.contains(permission);
  bool get isPlatform => tenantId == 'tenant_platform';

  factory PlatformSession.fromJson(Map<String, dynamic> json) {
    final user = (json['user'] as Map?)?.cast<String, dynamic>() ?? const {};
    final tenant =
        (json['tenant'] as Map?)?.cast<String, dynamic>() ?? const {};
    return PlatformSession(
      token: stringValue(json['token']),
      userId: stringValue(user['id']),
      name: stringValue(user['fullName'] ?? user['name']),
      email: stringValue(user['email']),
      phone: stringValue(user['phone']),
      tenantId: stringValue(user['tenantId'] ?? tenant['id']),
      roles: stringList(json['roleNames']),
      permissions: stringList(json['permissionIds']),
    );
  }
}

class LoginResult {
  const LoginResult({
    this.session,
    this.challengeId,
    this.passwordChange = false,
  });
  final PlatformSession? session;
  final String? challengeId;
  final bool passwordChange;
  bool get needsMfa => challengeId != null && challengeId!.isNotEmpty;
}

class FleetSummary {
  const FleetSummary({
    required this.total,
    required this.active,
    required this.pending,
    required this.suspended,
    required this.healthy,
    required this.critical,
    required this.renewalsDue,
    required this.expired,
    required this.revenue,
    required this.outstanding,
    required this.averageOnboarding,
    required this.slaBreached,
    required this.renewalsDue90,
    required this.projectedRenewalValue90,
    required this.renewalForecast,
  });

  final int total;
  final int active;
  final int pending;
  final int suspended;
  final int healthy;
  final int critical;
  final int renewalsDue;
  final int expired;
  final num revenue;
  final num outstanding;
  final int averageOnboarding;
  final int slaBreached;
  final int renewalsDue90;
  final num projectedRenewalValue90;
  final List<RenewalForecastItem> renewalForecast;

  factory FleetSummary.fromJson(Map<String, dynamic> json) => FleetSummary(
    total: numberValue(json['totalOrganizations']).toInt(),
    active: numberValue(json['active']).toInt(),
    pending: numberValue(json['pendingReview']).toInt(),
    suspended: numberValue(json['suspended']).toInt(),
    healthy: numberValue(json['healthy']).toInt(),
    critical: numberValue(json['critical']).toInt(),
    renewalsDue: numberValue(json['renewalsDueIn30Days']).toInt(),
    expired: numberValue(json['expiredSubscriptions']).toInt(),
    revenue: numberValue(json['totalSubscriptionRevenue']),
    outstanding: numberValue(json['outstandingSubscriptionBalance']),
    averageOnboarding: numberValue(json['averageOnboarding']).toInt(),
    slaBreached: numberValue(json['slaBreached']).toInt(),
    renewalsDue90: numberValue(json['renewalsDueIn90Days']).toInt(),
    projectedRenewalValue90: numberValue(json['projectedRenewalValue90Days']),
    renewalForecast: (json['renewalForecast'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(RenewalForecastItem.fromJson)
        .toList(),
  );
}

class RenewalForecastItem {
  const RenewalForecastItem({
    required this.period,
    required this.organizations,
    required this.projectedValue,
    required this.outstandingBalance,
  });

  final String period;
  final int organizations;
  final num projectedValue;
  final num outstandingBalance;

  factory RenewalForecastItem.fromJson(Map<String, dynamic> json) =>
      RenewalForecastItem(
        period: stringValue(json['period']),
        organizations: numberValue(json['organizations']).toInt(),
        projectedValue: numberValue(json['projectedValue']),
        outstandingBalance: numberValue(json['outstandingBalance']),
      );
}

class TenantFleetItem {
  const TenantFleetItem({
    required this.id,
    required this.code,
    required this.name,
    required this.status,
    required this.district,
    required this.health,
    required this.healthReason,
    required this.subscriptionStatus,
    required this.subscriptionExpiry,
    required this.balanceDue,
    required this.onboarding,
    required this.setupMissing,
    required this.smsBalance,
  });

  final String id;
  final String code;
  final String name;
  final String status;
  final String district;
  final String health;
  final String healthReason;
  final String subscriptionStatus;
  final DateTime? subscriptionExpiry;
  final num balanceDue;
  final int onboarding;
  final List<String> setupMissing;
  final int? smsBalance;

  factory TenantFleetItem.fromJson(Map<String, dynamic> json) =>
      TenantFleetItem(
        id: stringValue(json['id']),
        code: stringValue(json['saccoCode']),
        name: stringValue(json['name']),
        status: stringValue(json['status']),
        district: stringValue(json['district']),
        health: stringValue(json['health']),
        healthReason: stringValue(json['healthReason']),
        subscriptionStatus: stringValue(json['subscriptionStatus']),
        subscriptionExpiry: DateTime.tryParse(
          stringValue(json['subscriptionExpiry']),
        ),
        balanceDue: numberValue(json['balanceDue']),
        onboarding: numberValue(json['onboarding']).toInt(),
        setupMissing: (json['setupMissing'] as List? ?? const [])
            .map(stringValue)
            .where((item) => item.isNotEmpty)
            .toList(),
        smsBalance: json.containsKey('smsBalance')
            ? numberValue(json['smsBalance']).toInt()
            : null,
      );
}

class TenantLifecycleDetail {
  const TenantLifecycleDetail({
    required this.id,
    required this.name,
    required this.code,
    required this.status,
    required this.registrationNo,
    required this.district,
    required this.country,
    required this.packageId,
    required this.allowedCollectionMode,
    required this.mobileMoneyActive,
    required this.bankActive,
  });
  final String id;
  final String name;
  final String code;
  final String status;
  final String registrationNo;
  final String district;
  final String country;
  final String packageId;
  final String allowedCollectionMode;
  final bool mobileMoneyActive;
  final bool bankActive;

  factory TenantLifecycleDetail.fromJson(Map<String, dynamic> json) =>
      TenantLifecycleDetail(
        id: stringValue(json['id']),
        name: stringValue(json['name']),
        code: stringValue(json['abbreviation']),
        status: stringValue(json['status']),
        registrationNo: stringValue(json['registrationNo']),
        district: stringValue(json['district']),
        country: stringValue(json['country']),
        packageId: stringValue(json['packageId']),
        allowedCollectionMode: stringValue(json['allowedCollectionMode']),
        mobileMoneyActive: json['mobileMoneyCollectionActive'] == true,
        bankActive: json['bankCollectionActive'] == true,
      );
}

class SaccoOfficialItem {
  const SaccoOfficialItem({
    required this.office,
    required this.memberId,
    required this.membershipNo,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.staffAccessGranted,
    required this.validMember,
  });
  final String office;
  final String memberId;
  final String membershipNo;
  final String fullName;
  final String email;
  final String phone;
  final bool staffAccessGranted;
  final bool validMember;

  factory SaccoOfficialItem.fromJson(Map<String, dynamic> json) =>
      SaccoOfficialItem(
        office: stringValue(json['office']),
        memberId: stringValue(json['memberId']),
        membershipNo: stringValue(json['membershipNo']),
        fullName: stringValue(json['fullName']),
        email: stringValue(json['email']),
        phone: stringValue(json['phone']),
        staffAccessGranted: json['staffAccessGranted'] == true,
        validMember: json['validMember'] == true,
      );
}

class SaccoPaymentAccountItem {
  const SaccoPaymentAccountItem({
    required this.id,
    required this.channel,
    required this.network,
    required this.accountName,
    required this.accountNumber,
    required this.bankName,
    required this.branch,
    required this.swiftCode,
    required this.instructions,
    required this.active,
  });
  final String id;
  final String channel;
  final String network;
  final String accountName;
  final String accountNumber;
  final String bankName;
  final String branch;
  final String swiftCode;
  final String instructions;
  final bool active;

  factory SaccoPaymentAccountItem.fromJson(Map<String, dynamic> json) =>
      SaccoPaymentAccountItem(
        id: stringValue(json['id']),
        channel: stringValue(json['channel']),
        network: stringValue(json['network']),
        accountName: stringValue(json['accountName']),
        accountNumber: stringValue(json['accountNumber']),
        bankName: stringValue(json['bankName']),
        branch: stringValue(json['branch']),
        swiftCode: stringValue(json['swiftCode']),
        instructions: stringValue(json['instructions']),
        active: json['active'] == true,
      );

  Map<String, dynamic> toJson({bool? activeOverride}) => {
    'channel': channel,
    'network': network,
    'accountName': accountName,
    'accountNumber': accountNumber,
    'bankName': bankName,
    'branch': branch,
    'swiftCode': swiftCode,
    'instructions': instructions,
    'active': activeOverride ?? active,
  };
}

class MemberNameItem {
  const MemberNameItem({required this.id, required this.name});
  final String id;
  final String name;
  factory MemberNameItem.fromJson(Map<String, dynamic> json) => MemberNameItem(
    id: stringValue(json['id']),
    name: stringValue(json['name']),
  );
}

class SaccoLifecycleData {
  const SaccoLifecycleData({
    required this.tenant,
    required this.officials,
    required this.paymentAccounts,
    required this.members,
  });
  final TenantLifecycleDetail tenant;
  final List<SaccoOfficialItem> officials;
  final List<SaccoPaymentAccountItem> paymentAccounts;
  final List<MemberNameItem> members;
}

class PlatformSubscription {
  const PlatformSubscription({
    required this.id,
    required this.tenantId,
    required this.packageId,
    required this.status,
    required this.amount,
    required this.paid,
    required this.expiry,
    required this.invoice,
    required this.memberCount,
    required this.paidMemberCapacity,
    required this.unitPrice,
    required this.tierLabel,
    required this.billingDescription,
    required this.lifecycleState,
  });

  final String id;
  final String tenantId;
  final String packageId;
  final String status;
  final num amount;
  final num paid;
  final DateTime? expiry;
  final String invoice;
  final int memberCount;
  final int paidMemberCapacity;
  final num? unitPrice;
  final String tierLabel;
  final String billingDescription;
  final String lifecycleState;
  num get balance => (amount - paid).clamp(0, double.infinity);

  factory PlatformSubscription.fromJson(Map<String, dynamic> json) =>
      PlatformSubscription(
        id: stringValue(json['id']),
        tenantId: stringValue(json['tenantId']),
        packageId: stringValue(json['packageId']),
        status: stringValue(json['status']),
        amount: numberValue(json['amount']),
        paid: numberValue(json['paid']),
        expiry: DateTime.tryParse(stringValue(json['expiry'])),
        invoice: stringValue(json['invoice'] ?? json['id']),
        memberCount: numberValue(json['memberCount']).toInt(),
        paidMemberCapacity: numberValue(json['paidMemberCapacity']).toInt(),
        unitPrice: json['unitPrice'] == null
            ? null
            : numberValue(json['unitPrice']),
        tierLabel: stringValue(json['tierLabel']),
        billingDescription: stringValue(json['billingDescription']),
        lifecycleState: stringValue(json['lifecycleState']),
      );
}

class SubscriptionPackage {
  const SubscriptionPackage({
    required this.id,
    required this.name,
    required this.price,
    required this.billingPeriod,
    required this.minMembers,
    required this.memberLimit,
    required this.tierLabel,
    required this.modules,
    required this.userLimit,
    required this.branchLimit,
    required this.status,
  });
  final String id;
  final String name;
  final num price;
  final String billingPeriod;
  final int minMembers;
  final int memberLimit;
  final String tierLabel;
  final String modules;
  final int userLimit;
  final int branchLimit;
  final String status;

  bool get isPerMember => id == 'community';

  factory SubscriptionPackage.fromJson(Map<String, dynamic> json) =>
      SubscriptionPackage(
        id: stringValue(json['id'] ?? json['code']),
        name: stringValue(json['name'] ?? json['label']),
        price: numberValue(json['price'] ?? json['amount']),
        billingPeriod: stringValue(json['billingPeriod']),
        minMembers: numberValue(json['minMembers']).toInt(),
        memberLimit: numberValue(json['memberLimit']).toInt(),
        tierLabel: stringValue(json['tierLabel']),
        modules: stringValue(json['modules']),
        userLimit: numberValue(json['userLimit']).toInt(),
        branchLimit: numberValue(json['branchLimit']).toInt(),
        status: stringValue(json['status']).isEmpty
            ? 'active'
            : stringValue(json['status']),
      );
}

class BillingRate {
  const BillingRate({
    required this.code,
    required this.name,
    required this.category,
    required this.unitPrice,
    required this.billingPeriod,
    required this.active,
  });

  final String code;
  final String name;
  final String category;
  final num unitPrice;
  final String billingPeriod;
  final bool active;

  factory BillingRate.fromJson(Map<String, dynamic> json) => BillingRate(
    code: stringValue(json['code']),
    name: stringValue(json['name']),
    category: stringValue(json['category']),
    unitPrice: numberValue(json['unitPrice']),
    billingPeriod: stringValue(json['billingPeriod']),
    active: json['active'] == true,
  );
}

class TenantBillingItem {
  const TenantBillingItem({
    required this.id,
    required this.tenantId,
    required this.catalogCode,
    required this.name,
    required this.category,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
    required this.billingPeriod,
    required this.status,
  });
  final String id;
  final String tenantId;
  final String catalogCode;
  final String name;
  final String category;
  final int quantity;
  final num unitPrice;
  final num amount;
  final String billingPeriod;
  final String status;

  factory TenantBillingItem.fromJson(Map<String, dynamic> json) =>
      TenantBillingItem(
        id: stringValue(json['id']),
        tenantId: stringValue(json['tenantId']),
        catalogCode: stringValue(json['catalogCode']),
        name: stringValue(json['name']),
        category: stringValue(json['category']),
        quantity: numberValue(json['quantity']).toInt(),
        unitPrice: numberValue(json['unitPrice']),
        amount: numberValue(json['amount']),
        billingPeriod: stringValue(json['billingPeriod']),
        status: stringValue(json['status']),
      );
}

class BillingLineItem {
  const BillingLineItem({
    required this.category,
    required this.description,
    required this.quantity,
    required this.amount,
    required this.billingPeriod,
  });
  final String category;
  final String description;
  final int quantity;
  final num amount;
  final String billingPeriod;

  factory BillingLineItem.fromJson(Map<String, dynamic> json) =>
      BillingLineItem(
        category: stringValue(json['category']),
        description: stringValue(json['description']),
        quantity: numberValue(json['quantity']).toInt(),
        amount: numberValue(json['amount']),
        billingPeriod: stringValue(json['billingPeriod']),
      );
}

class TenantBillingSummary {
  const TenantBillingSummary({
    required this.tenantId,
    required this.lines,
    required this.annualRecurringTotal,
    required this.oneTimeTotal,
    required this.usageTotal,
    required this.total,
  });
  final String tenantId;
  final List<BillingLineItem> lines;
  final num annualRecurringTotal;
  final num oneTimeTotal;
  final num usageTotal;
  final num total;

  factory TenantBillingSummary.fromJson(Map<String, dynamic> json) =>
      TenantBillingSummary(
        tenantId: stringValue(json['tenantId']),
        lines: (json['lines'] as List? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(BillingLineItem.fromJson)
            .toList(),
        annualRecurringTotal: numberValue(json['annualRecurringTotal']),
        oneTimeTotal: numberValue(json['oneTimeTotal']),
        usageTotal: numberValue(json['usageTotal']),
        total: numberValue(json['total']),
      );
}

class SmsSaleItem {
  const SmsSaleItem({
    required this.id,
    required this.tenantId,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
    required this.reference,
    required this.description,
    required this.createdAt,
  });
  final String id;
  final String tenantId;
  final int quantity;
  final num unitPrice;
  final num amount;
  final String reference;
  final String description;
  final DateTime? createdAt;

  factory SmsSaleItem.fromJson(Map<String, dynamic> json) => SmsSaleItem(
    id: stringValue(json['id']),
    tenantId: stringValue(json['tenantId']),
    quantity: numberValue(json['quantity']).toInt(),
    unitPrice: numberValue(json['unitPrice']),
    amount: numberValue(json['amount']),
    reference: stringValue(json['reference']),
    description: stringValue(json['description']),
    createdAt: DateTime.tryParse(stringValue(json['createdAt'])),
  );
}

class SmsInventorySummary {
  const SmsInventorySummary({
    required this.provider,
    required this.providerStatus,
    required this.providerBalance,
    required this.providerUnitCost,
    required this.saccoSellingRate,
    required this.providerAvailableCredits,
    required this.saccoCreditsOutstanding,
    required this.memberCreditsOutstanding,
    required this.totalCreditsOutstanding,
    required this.reserveCredits,
    required this.lowStockThreshold,
    required this.grossMarginPerSms,
    required this.grossMarginPercent,
    required this.totalCreditsSold,
    required this.totalSalesRevenue,
    required this.suggestedTopUpAmount,
    required this.alertLevel,
    required this.alertCode,
    required this.alertMessage,
    required this.providerCheckedAt,
    required this.settingsUpdatedAt,
    required this.settingsUpdatedBy,
  });

  final String provider;
  final String providerStatus;
  final num providerBalance;
  final num providerUnitCost;
  final num saccoSellingRate;
  final int providerAvailableCredits;
  final int saccoCreditsOutstanding;
  final int memberCreditsOutstanding;
  final int totalCreditsOutstanding;
  final int reserveCredits;
  final int lowStockThreshold;
  final num grossMarginPerSms;
  final num grossMarginPercent;
  final int totalCreditsSold;
  final num totalSalesRevenue;
  final num suggestedTopUpAmount;
  final String alertLevel;
  final String alertCode;
  final String alertMessage;
  final DateTime? providerCheckedAt;
  final DateTime? settingsUpdatedAt;
  final String settingsUpdatedBy;

  bool get needsAttention => alertLevel != 'ok';

  factory SmsInventorySummary.fromJson(Map<String, dynamic> json) =>
      SmsInventorySummary(
        provider: stringValue(json['provider']),
        providerStatus: stringValue(json['providerStatus']),
        providerBalance: numberValue(json['providerBalance']),
        providerUnitCost: numberValue(json['providerUnitCost']),
        saccoSellingRate: numberValue(json['saccoSellingRate']),
        providerAvailableCredits: numberValue(
          json['providerAvailableCredits'],
        ).toInt(),
        saccoCreditsOutstanding: numberValue(
          json['saccoCreditsOutstanding'],
        ).toInt(),
        memberCreditsOutstanding: numberValue(
          json['memberCreditsOutstanding'],
        ).toInt(),
        totalCreditsOutstanding: numberValue(
          json['totalCreditsOutstanding'],
        ).toInt(),
        reserveCredits: numberValue(json['reserveCredits']).toInt(),
        lowStockThreshold: numberValue(json['lowStockThreshold']).toInt(),
        grossMarginPerSms: numberValue(json['grossMarginPerSms']),
        grossMarginPercent: numberValue(json['grossMarginPercent']),
        totalCreditsSold: numberValue(json['totalCreditsSold']).toInt(),
        totalSalesRevenue: numberValue(json['totalSalesRevenue']),
        suggestedTopUpAmount: numberValue(json['suggestedTopUpAmount']),
        alertLevel: stringValue(json['alertLevel']),
        alertCode: stringValue(json['alertCode']),
        alertMessage: stringValue(json['alertMessage']),
        providerCheckedAt: DateTime.tryParse(
          stringValue(json['providerCheckedAt']),
        ),
        settingsUpdatedAt: DateTime.tryParse(
          stringValue(json['settingsUpdatedAt']),
        ),
        settingsUpdatedBy: stringValue(json['settingsUpdatedBy']),
      );
}

class PlatformSmsBroadcastResult {
  const PlatformSmsBroadcastResult({
    required this.saccosSelected,
    required this.saccosReached,
    required this.recipients,
    required this.sent,
    required this.failed,
    required this.smsSegments,
    required this.providerSmsUnits,
  });

  final int saccosSelected;
  final int saccosReached;
  final int recipients;
  final int sent;
  final int failed;
  final int smsSegments;
  final int providerSmsUnits;

  factory PlatformSmsBroadcastResult.fromJson(Map<String, dynamic> json) =>
      PlatformSmsBroadcastResult(
        saccosSelected: numberValue(json['saccosSelected']).toInt(),
        saccosReached: numberValue(json['saccosReached']).toInt(),
        recipients: numberValue(json['recipients']).toInt(),
        sent: numberValue(json['sent']).toInt(),
        failed: numberValue(json['failed']).toInt(),
        smsSegments: numberValue(json['smsSegments']).toInt(),
        providerSmsUnits: numberValue(json['providerSmsUnits']).toInt(),
      );
}

class NotificationProviderStatus {
  const NotificationProviderStatus({
    required this.channel,
    required this.provider,
    required this.status,
    required this.balance,
    required this.message,
    required this.checkedAt,
  });

  final String channel;
  final String provider;
  final String status;
  final String balance;
  final String message;
  final DateTime? checkedAt;

  bool get isReady => status.toLowerCase() == 'ready';

  factory NotificationProviderStatus.fromJson(Map<String, dynamic> json) =>
      NotificationProviderStatus(
        channel: stringValue(json['channel']),
        provider: stringValue(json['provider']),
        status: stringValue(json['status']),
        balance: stringValue(json['balance']),
        message: stringValue(json['message']),
        checkedAt: DateTime.tryParse(stringValue(json['checkedAt'])),
      );
}

class NotificationDeliveryItem {
  const NotificationDeliveryItem({
    required this.id,
    required this.tenantId,
    required this.channel,
    required this.provider,
    required this.recipient,
    required this.status,
    required this.message,
    required this.eventType,
    required this.title,
    required this.createdAt,
  });

  final String id;
  final String tenantId;
  final String channel;
  final String provider;
  final String recipient;
  final String status;
  final String message;
  final String eventType;
  final String title;
  final DateTime? createdAt;

  bool get failed => status.toLowerCase() == 'failed';

  factory NotificationDeliveryItem.fromJson(Map<String, dynamic> json) =>
      NotificationDeliveryItem(
        id: stringValue(json['id']),
        tenantId: stringValue(json['tenantId']),
        channel: stringValue(json['channel']),
        provider: stringValue(json['provider']),
        recipient: stringValue(json['recipient']),
        status: stringValue(json['status']),
        message: stringValue(json['message']),
        eventType: stringValue(json['eventType']),
        title: stringValue(json['title']),
        createdAt: DateTime.tryParse(
          stringValue(json['createdAt'] ?? json['sentAt']),
        ),
      );
}

class MobileMoneyProviderOption {
  const MobileMoneyProviderOption({
    required this.network,
    required this.name,
    required this.providerId,
    required this.available,
  });
  final String network;
  final String name;
  final String providerId;
  final bool available;

  factory MobileMoneyProviderOption.fromJson(Map<String, dynamic> json) =>
      MobileMoneyProviderOption(
        network: stringValue(json['network']),
        name: stringValue(json['label']),
        providerId: stringValue(json['providerId']),
        available: json['available'] == true,
      );
}

class MobileMoneyReconciliationResult {
  const MobileMoneyReconciliationResult({
    required this.scanned,
    required this.updated,
    required this.failed,
    required this.status,
    required this.message,
    required this.ranAt,
  });
  final int scanned;
  final int updated;
  final int failed;
  final String status;
  final String message;
  final DateTime? ranAt;

  factory MobileMoneyReconciliationResult.fromJson(Map<String, dynamic> json) =>
      MobileMoneyReconciliationResult(
        scanned: numberValue(json['scanned']).toInt(),
        updated: numberValue(json['updated']).toInt(),
        failed: numberValue(json['failed']).toInt(),
        status: stringValue(json['status']),
        message: stringValue(json['message']),
        ranAt: DateTime.tryParse(stringValue(json['ranAt'])),
      );
}

class MobileMoneyProviderEvidence {
  const MobileMoneyProviderEvidence({
    required this.paymentRequests,
    required this.pendingPaymentRequests,
    required this.failedPaymentRequests,
    required this.postedPaymentRequests,
    required this.callbacksReceived,
    required this.callbacksPendingApproval,
    required this.callbacksPosted,
    required this.providers,
    required this.reconciliation,
    required this.status,
  });
  final int paymentRequests;
  final int pendingPaymentRequests;
  final int failedPaymentRequests;
  final int postedPaymentRequests;
  final int callbacksReceived;
  final int callbacksPendingApproval;
  final int callbacksPosted;
  final List<MobileMoneyProviderOption> providers;
  final MobileMoneyReconciliationResult reconciliation;
  final String status;

  factory MobileMoneyProviderEvidence.fromJson(
    Map<String, dynamic> json,
  ) => MobileMoneyProviderEvidence(
    paymentRequests: numberValue(json['paymentRequests']).toInt(),
    pendingPaymentRequests: numberValue(json['pendingPaymentRequests']).toInt(),
    failedPaymentRequests: numberValue(json['failedPaymentRequests']).toInt(),
    postedPaymentRequests: numberValue(json['postedPaymentRequests']).toInt(),
    callbacksReceived: numberValue(json['callbacksReceived']).toInt(),
    callbacksPendingApproval: numberValue(
      json['callbacksPendingApproval'],
    ).toInt(),
    callbacksPosted: numberValue(json['callbacksPosted']).toInt(),
    providers: (json['providerOptions'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(MobileMoneyProviderOption.fromJson)
        .toList(),
    reconciliation: MobileMoneyReconciliationResult.fromJson(
      (json['reconciliationSummary'] as Map?)?.cast<String, dynamic>() ??
          const {},
    ),
    status: stringValue(json['evidenceStatus']),
  );
}

class PaymentOperationsEvidence {
  const PaymentOperationsEvidence({
    required this.mobileMoney,
    required this.status,
    required this.checkedAt,
  });
  final MobileMoneyProviderEvidence mobileMoney;
  final String status;
  final DateTime? checkedAt;

  factory PaymentOperationsEvidence.fromJson(Map<String, dynamic> json) =>
      PaymentOperationsEvidence(
        mobileMoney: MobileMoneyProviderEvidence.fromJson(
          (json['mobileMoney'] as Map?)?.cast<String, dynamic>() ?? const {},
        ),
        status: stringValue(json['evidenceStatus']),
        checkedAt: DateTime.tryParse(stringValue(json['checkedAt'])),
      );
}

class SubscriptionPaymentItem {
  const SubscriptionPaymentItem({
    required this.id,
    required this.subscriptionId,
    required this.tenantId,
    required this.amount,
    required this.channel,
    required this.reference,
    required this.receivedAt,
  });
  final String id;
  final String subscriptionId;
  final String tenantId;
  final num amount;
  final String channel;
  final String reference;
  final DateTime? receivedAt;

  factory SubscriptionPaymentItem.fromJson(Map<String, dynamic> json) =>
      SubscriptionPaymentItem(
        id: stringValue(json['id']),
        subscriptionId: stringValue(json['subscriptionId']),
        tenantId: stringValue(json['tenantId']),
        amount: numberValue(json['amount']),
        channel: stringValue(json['channel']),
        reference: stringValue(json['externalReference']),
        receivedAt: DateTime.tryParse(
          stringValue(json['receivedAt'] ?? json['createdAt']),
        ),
      );
}

class ApprovalRequest {
  const ApprovalRequest({
    required this.id,
    required this.status,
    required this.requestedBy,
    required this.reason,
    required this.requestedCount,
    required this.requestedAt,
    required this.slaStatus,
  });

  final String id;
  final String status;
  final String requestedBy;
  final String reason;
  final int requestedCount;
  final DateTime? requestedAt;
  final String slaStatus;

  factory ApprovalRequest.fromJson(Map<String, dynamic> json) =>
      ApprovalRequest(
        id: stringValue(json['id']),
        status: stringValue(json['status']),
        requestedBy: stringValue(json['requestedByName']),
        reason: stringValue(json['requestReason'] ?? json['reason']),
        requestedCount: numberValue(json['requestedCount']).toInt(),
        requestedAt: DateTime.tryParse(stringValue(json['createdAt'])),
        slaStatus: stringValue(json['slaStatus'] ?? json['sla']),
      );
}

class FleetBulkJob {
  const FleetBulkJob({
    required this.id,
    required this.status,
    required this.requestedBy,
    required this.reason,
    required this.requestedCount,
    required this.succeededCount,
    required this.failedCount,
    required this.targetStatus,
    required this.accountManagerName,
    required this.createdAt,
  });

  final String id;
  final String status;
  final String requestedBy;
  final String reason;
  final int requestedCount;
  final int succeededCount;
  final int failedCount;
  final String targetStatus;
  final String accountManagerName;
  final DateTime? createdAt;

  factory FleetBulkJob.fromJson(Map<String, dynamic> json) => FleetBulkJob(
    id: stringValue(json['id']),
    status: stringValue(json['status']),
    requestedBy: stringValue(json['requestedByName']),
    reason: stringValue(json['requestReason']),
    requestedCount: numberValue(json['requestedCount']).toInt(),
    succeededCount: numberValue(json['succeededCount']).toInt(),
    failedCount: numberValue(json['failedCount']).toInt(),
    targetStatus: stringValue(json['targetStatus']),
    accountManagerName: stringValue(json['accountManagerName']),
    createdAt: DateTime.tryParse(stringValue(json['createdAt'])),
  );
}

class FleetBulkJobResult {
  const FleetBulkJobResult({
    required this.id,
    required this.tenantId,
    required this.tenantName,
    required this.status,
    required this.message,
  });

  final String id;
  final String tenantId;
  final String tenantName;
  final String status;
  final String message;

  factory FleetBulkJobResult.fromJson(Map<String, dynamic> json) =>
      FleetBulkJobResult(
        id: stringValue(json['id']),
        tenantId: stringValue(json['tenantId']),
        tenantName: stringValue(json['tenantName']),
        status: stringValue(json['status']),
        message: stringValue(json['message']),
      );
}

class FleetIncident {
  const FleetIncident({
    required this.incidentKey,
    required this.tenantId,
    required this.issueType,
    required this.status,
    required this.assigneeName,
    required this.resolutionNote,
    required this.updatedAt,
  });

  final String incidentKey;
  final String tenantId;
  final String issueType;
  final String status;
  final String assigneeName;
  final String resolutionNote;
  final DateTime? updatedAt;

  factory FleetIncident.fromJson(Map<String, dynamic> json) => FleetIncident(
    incidentKey: stringValue(json['incidentKey']),
    tenantId: stringValue(json['tenantId']),
    issueType: stringValue(json['issueType']),
    status: stringValue(json['workflowStatus'] ?? json['status']),
    assigneeName: stringValue(json['assigneeName']),
    resolutionNote: stringValue(json['resolutionNote']),
    updatedAt: DateTime.tryParse(stringValue(json['updatedAt'])),
  );
}

class FleetSavedView {
  const FleetSavedView({
    required this.id,
    required this.name,
    required this.search,
    required this.health,
    required this.status,
    required this.district,
    required this.accountManager,
  });

  final String id;
  final String name;
  final String search;
  final String health;
  final String status;
  final String district;
  final String accountManager;

  factory FleetSavedView.fromJson(Map<String, dynamic> json) => FleetSavedView(
    id: stringValue(json['id']),
    name: stringValue(json['name']),
    search: stringValue(json['search']),
    health: stringValue(json['health']),
    status: stringValue(json['status']),
    district: stringValue(json['district']),
    accountManager: stringValue(json['accountManager']),
  );
}

class FleetForecastScenario {
  const FleetForecastScenario({
    required this.id,
    required this.name,
    required this.renewalRate,
    required this.priceAdjustment,
  });

  final String id;
  final String name;
  final int renewalRate;
  final int priceAdjustment;

  factory FleetForecastScenario.fromJson(Map<String, dynamic> json) =>
      FleetForecastScenario(
        id: stringValue(json['id']),
        name: stringValue(json['name']),
        renewalRate: numberValue(json['renewalRate']).toInt(),
        priceAdjustment: numberValue(json['priceAdjustment']).toInt(),
      );

  num projectedValue(num baseValue) =>
      baseValue * (renewalRate / 100) * (1 + priceAdjustment / 100);
}

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.tenantId,
    required this.subject,
    required this.category,
    required this.priority,
    required this.status,
    required this.description,
  });

  final String id;
  final String tenantId;
  final String subject;
  final String category;
  final String priority;
  final String status;
  final String description;

  factory SupportTicket.fromJson(Map<String, dynamic> json) => SupportTicket(
    id: stringValue(json['id']),
    tenantId: stringValue(json['tenantId']),
    subject: stringValue(json['subject']),
    category: stringValue(json['category']),
    priority: stringValue(json['priority']),
    status: stringValue(json['status']),
    description: stringValue(json['description']),
  );
}

class PlatformUser {
  const PlatformUser({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.status,
    required this.mfaEnabled,
    required this.passwordResetRequired,
    required this.emailVerified,
    required this.phoneVerified,
    required this.activeSessionCount,
  });
  final String id;
  final String name;
  final String email;
  final String phone;
  final String status;
  final bool mfaEnabled;
  final bool passwordResetRequired;
  final bool emailVerified;
  final bool phoneVerified;
  final int activeSessionCount;

  factory PlatformUser.fromJson(Map<String, dynamic> json) => PlatformUser(
    id: stringValue(json['id']),
    name: stringValue(json['fullName']),
    email: stringValue(json['email']),
    phone: stringValue(json['phone']),
    status: stringValue(json['status']),
    mfaEnabled: json['mfaEnabled'] == true,
    passwordResetRequired: json['passwordResetRequired'] == true,
    emailVerified: json['emailVerified'] == true,
    phoneVerified: json['phoneVerified'] == true,
    activeSessionCount: numberValue(json['activeSessionCount']).toInt(),
  );
}

class PlatformSecurityPolicy {
  const PlatformSecurityPolicy({
    required this.minimumPasswordLength,
    required this.requireUppercase,
    required this.requireLowercase,
    required this.requireNumber,
    required this.requireSymbol,
    required this.passwordExpiryDays,
    required this.lockoutFailedAttempts,
    required this.lockoutMinutes,
    required this.updatedAt,
  });
  final int minimumPasswordLength;
  final bool requireUppercase;
  final bool requireLowercase;
  final bool requireNumber;
  final bool requireSymbol;
  final int passwordExpiryDays;
  final int lockoutFailedAttempts;
  final int lockoutMinutes;
  final DateTime? updatedAt;

  factory PlatformSecurityPolicy.fromJson(
    Map<String, dynamic> json,
  ) => PlatformSecurityPolicy(
    minimumPasswordLength: numberValue(json['minimumPasswordLength']).toInt(),
    requireUppercase: json['requireUppercase'] == true,
    requireLowercase: json['requireLowercase'] == true,
    requireNumber: json['requireNumber'] == true,
    requireSymbol: json['requireSymbol'] == true,
    passwordExpiryDays: numberValue(json['passwordExpiryDays']).toInt(),
    lockoutFailedAttempts: numberValue(json['lockoutFailedAttempts']).toInt(),
    lockoutMinutes: numberValue(json['lockoutMinutes']).toInt(),
    updatedAt: DateTime.tryParse(stringValue(json['updatedAt'])),
  );

  Map<String, dynamic> toJson() => {
    'minimumPasswordLength': minimumPasswordLength,
    'requireUppercase': requireUppercase,
    'requireLowercase': requireLowercase,
    'requireNumber': requireNumber,
    'requireSymbol': requireSymbol,
    'passwordExpiryDays': passwordExpiryDays,
    'lockoutFailedAttempts': lockoutFailedAttempts,
    'lockoutMinutes': lockoutMinutes,
  };
}

class PlatformAuditEvent {
  const PlatformAuditEvent({
    required this.id,
    required this.tenantId,
    required this.actorName,
    required this.action,
    required this.resourceType,
    required this.resourceId,
    required this.ipAddress,
    required this.createdAt,
  });
  final String id;
  final String tenantId;
  final String actorName;
  final String action;
  final String resourceType;
  final String resourceId;
  final String ipAddress;
  final DateTime? createdAt;

  factory PlatformAuditEvent.fromJson(Map<String, dynamic> json) =>
      PlatformAuditEvent(
        id: stringValue(json['id']),
        tenantId: stringValue(json['tenantId']),
        actorName: stringValue(json['actorName']),
        action: stringValue(json['action']),
        resourceType: stringValue(json['resourceType']),
        resourceId: stringValue(json['resourceId']),
        ipAddress: stringValue(json['ipAddress']),
        createdAt: DateTime.tryParse(stringValue(json['createdAt'])),
      );
}

class PlatformRole {
  const PlatformRole({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.description,
  });

  final String id;
  final String tenantId;
  final String name;
  final String description;

  factory PlatformRole.fromJson(Map<String, dynamic> json) => PlatformRole(
    id: stringValue(json['id']),
    tenantId: stringValue(json['tenantId']),
    name: stringValue(json['name']),
    description: stringValue(json['description']),
  );
}

class PageResult<T> {
  const PageResult(this.items, this.page, this.totalPages, this.total);
  final List<T> items;
  final int page;
  final int totalPages;
  final int total;
}

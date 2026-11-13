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
    required this.tenantId,
    required this.roles,
    required this.permissions,
  });

  final String token;
  final String userId;
  final String name;
  final String email;
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
      );
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
  });

  final String id;
  final String tenantId;
  final String packageId;
  final String status;
  final num amount;
  final num paid;
  final DateTime? expiry;
  final String invoice;
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
      );
}

class SubscriptionPackage {
  const SubscriptionPackage({
    required this.id,
    required this.name,
    required this.price,
  });
  final String id;
  final String name;
  final num price;

  factory SubscriptionPackage.fromJson(Map<String, dynamic> json) =>
      SubscriptionPackage(
        id: stringValue(json['id'] ?? json['code']),
        name: stringValue(json['name'] ?? json['label']),
        price: numberValue(json['price'] ?? json['amount']),
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
  });
  final String id;
  final String name;
  final String email;
  final String phone;
  final String status;
  final bool mfaEnabled;

  factory PlatformUser.fromJson(Map<String, dynamic> json) => PlatformUser(
    id: stringValue(json['id']),
    name: stringValue(json['fullName']),
    email: stringValue(json['email']),
    phone: stringValue(json['phone']),
    status: stringValue(json['status']),
    mfaEnabled: json['mfaEnabled'] == true,
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

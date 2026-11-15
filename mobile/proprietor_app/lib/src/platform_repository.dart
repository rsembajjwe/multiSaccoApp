import 'api_client.dart';
import 'models.dart';

class PlatformRepository {
  const PlatformRepository(this._api);
  final ApiClient _api;

  Future<FleetSummary> summary() async =>
      FleetSummary.fromJson(await _api.get('/tenants/fleet/summary'));

  Future<PageResult<TenantFleetItem>> tenants({
    String search = '',
    String status = '',
    String district = '',
    String health = '',
    String accountManager = '',
    int page = 0,
  }) async {
    final result = await _api.getPage(
      '/tenants/fleet',
      page: page,
      size: 100,
      query: {
        'search': search.isEmpty ? null : search,
        'status': status.isEmpty ? null : status,
        'district': district.isEmpty ? null : district,
        'health': health.isEmpty ? null : health,
        'accountManager': accountManager.isEmpty ? null : accountManager,
      },
    );
    return PageResult(
      result.items.map(TenantFleetItem.fromJson).toList(),
      result.page,
      result.totalPages,
      result.total,
    );
  }

  Future<List<TenantFleetItem>> fleetReportRows({
    String search = '',
    String status = '',
    String district = '',
    String health = '',
    String accountManager = '',
  }) async {
    Future<PageResult<TenantFleetItem>> load(int page) => tenants(
      search: search,
      status: status,
      district: district,
      health: health,
      accountManager: accountManager,
      page: page,
    );
    final first = await load(0);
    final rows = [...first.items];
    for (var page = 1; page < first.totalPages; page++) {
      rows.addAll((await load(page)).items);
    }
    return rows;
  }

  Future<Map<String, dynamic>> createTenant(Map<String, dynamic> body) =>
      _api.post('/tenants', body);

  Future<void> createAdministrator({
    required String tenantId,
    required String name,
    required String email,
    required String phone,
    required String deliveryChannel,
  }) async {
    final user = await _api.post('/users', {
      'tenantId': tenantId,
      'fullName': name,
      'email': email,
      'phone': phone,
      'deliveryChannel': deliveryChannel,
    });
    final roles = await _api.getList('/roles');
    final chairpersonRole = roles.cast<Map<String, dynamic>?>().firstWhere(
      (role) =>
          stringValue(role?['tenantId']) == tenantId &&
          stringValue(role?['name']).toLowerCase() == 'chairperson',
      orElse: () => null,
    );
    if (chairpersonRole != null) {
      await _api.put('/users/${stringValue(user['id'])}/roles', {
        'roleIds': [stringValue(chairpersonRole['id'])],
      });
    }
  }

  Future<void> updateTenantStatus(String tenantId, String status) async {
    await _api.patch('/tenants/$tenantId/status', {'status': status});
  }

  Future<SaccoLifecycleData> saccoLifecycle(String tenantId) async {
    final results = await Future.wait<dynamic>([
      _api.get('/tenants/$tenantId'),
      _api.getList('/tenants/$tenantId/officials'),
      _api.getList('/sacco-payment-accounts', query: {'tenantId': tenantId}),
      _api.getList('/members/names', query: {'tenantId': tenantId}),
    ]);
    return SaccoLifecycleData(
      tenant: TenantLifecycleDetail.fromJson(
        results[0] as Map<String, dynamic>,
      ),
      officials: (results[1] as List<Map<String, dynamic>>)
          .map(SaccoOfficialItem.fromJson)
          .toList(),
      paymentAccounts: (results[2] as List<Map<String, dynamic>>)
          .map(SaccoPaymentAccountItem.fromJson)
          .toList(),
      members: (results[3] as List<Map<String, dynamic>>)
          .map(MemberNameItem.fromJson)
          .toList(),
    );
  }

  Future<void> updateTenantDetails(
    String tenantId, {
    required String name,
    required String registrationNo,
    required String district,
    required String country,
  }) async {
    await _api.patch('/tenants/$tenantId/details', {
      'name': name,
      'registrationNo': registrationNo,
      'district': district,
      'country': country,
    });
  }

  Future<void> updateCollectionMode(String tenantId, String mode) async {
    await _api.patch('/tenants/$tenantId/collection-mode', {
      'allowedCollectionMode': mode,
    });
  }

  Future<void> updateCollectionSettings(
    String tenantId, {
    required bool mobileMoneyActive,
    required bool bankActive,
  }) async {
    await _api.patch('/tenants/$tenantId/collection-settings', {
      'mobileMoneyActive': mobileMoneyActive,
      'bankActive': bankActive,
    });
  }

  Future<void> assignOfficial(
    String tenantId,
    String office,
    String memberId,
  ) async {
    await _api.patch('/tenants/$tenantId/officials/$office', {
      'memberId': memberId,
    });
  }

  Future<void> addPaymentAccount(
    String tenantId,
    Map<String, dynamic> body,
  ) async {
    await _api.post('/sacco-payment-accounts?tenantId=$tenantId', body);
  }

  Future<void> updatePaymentAccount(
    String tenantId,
    SaccoPaymentAccountItem account,
    bool active,
  ) async {
    await _api.patch(
      '/sacco-payment-accounts/${account.id}?tenantId=$tenantId',
      account.toJson(activeOverride: active),
    );
  }

  Future<void> deleteTenant(String tenantId, String confirmCode) async {
    await _api.delete('/tenants/$tenantId', {'confirmCode': confirmCode});
  }

  Future<List<PlatformSubscription>> subscriptions() async =>
      (await _api.getList(
        '/subscriptions',
      )).map(PlatformSubscription.fromJson).toList();

  Future<List<SubscriptionPackage>> packages() async => (await _api.getList(
    '/subscription-packages',
  )).map(SubscriptionPackage.fromJson).toList();

  Future<List<SubscriptionPackage>> adminPackages() async =>
      (await _api.getList(
        '/subscription-packages/admin',
      )).map(SubscriptionPackage.fromJson).toList();

  Future<void> updatePackage(SubscriptionPackage package) async {
    await _api.patch('/subscription-packages/${package.id}', {
      'name': package.name,
      'price': package.price,
      'billingPeriod': package.billingPeriod,
      'minMembers': package.minMembers,
      'memberLimit': package.memberLimit,
      'tierLabel': package.tierLabel,
      'userLimit': package.userLimit,
      'branchLimit': package.branchLimit,
      'modules': package.modules,
      'status': package.status,
    });
  }

  Future<List<BillingRate>> billingCatalog() async => (await _api.getList(
    '/platform-billing/catalog',
  )).map(BillingRate.fromJson).toList();

  Future<void> updateBillingRate({
    required String code,
    required num unitPrice,
    required bool active,
  }) async {
    await _api.patch('/platform-billing/catalog/$code', {
      'unitPrice': unitPrice,
      'active': active,
    });
  }

  Future<void> recordSmsCashPayment({
    required String tenantId,
    required int smsCount,
    required String reference,
  }) async {
    await _api.post('/platform-billing/sms-wallets/$tenantId/cash-payments', {
      'smsCount': smsCount,
      'reference': reference,
    });
  }

  Future<List<SmsSaleItem>> smsSales() async => (await _api.getList(
    '/platform-billing/sms-sales',
    query: {'limit': 500},
  )).map(SmsSaleItem.fromJson).toList();

  Future<List<TenantBillingItem>> billingItems(String tenantId) async =>
      (await _api.getList(
        '/platform-billing/items',
        query: {'tenantId': tenantId},
      )).map(TenantBillingItem.fromJson).toList();

  Future<TenantBillingSummary> billingSummary(String tenantId) async =>
      TenantBillingSummary.fromJson(
        await _api.get(
          '/platform-billing/summary',
          query: {'tenantId': tenantId},
        ),
      );

  Future<void> addBillingItem({
    required String tenantId,
    required String catalogCode,
    required int quantity,
  }) async {
    await _api.post('/platform-billing/items', {
      'tenantId': tenantId,
      'catalogCode': catalogCode,
      'quantity': quantity,
    });
  }

  Future<void> cancelBillingItem(String itemId, String tenantId) async {
    await _api.delete(
      '/platform-billing/items/$itemId?tenantId=$tenantId',
      const {},
    );
  }

  Future<PlatformSmsBroadcastResult> sendPlatformSmsBroadcast({
    required bool allSaccos,
    required List<String> tenantIds,
    required String title,
    required String message,
  }) async => PlatformSmsBroadcastResult.fromJson(
    await _api.post('/notifications/platform/sms-broadcast', {
      'allSaccos': allSaccos,
      'tenantIds': tenantIds,
      'title': title,
      'body': message,
    }),
  );

  Future<List<NotificationProviderStatus>> notificationProviderStatus() async =>
      (await _api.getList(
        '/notifications/provider-status',
      )).map(NotificationProviderStatus.fromJson).toList();

  Future<PageResult<NotificationDeliveryItem>> notificationDeliveries({
    int page = 0,
    int size = 100,
  }) async {
    final result = await _api.getPage(
      '/notifications/deliveries',
      page: page,
      size: size,
      query: const {'sort': 'createdAt', 'direction': 'desc'},
    );
    return PageResult(
      result.items.map(NotificationDeliveryItem.fromJson).toList(),
      result.page,
      result.totalPages,
      result.total,
    );
  }

  Future<void> retryNotificationDelivery(String deliveryId) async {
    await _api.patch('/notifications/deliveries/$deliveryId/retry', const {});
  }

  Future<PaymentOperationsEvidence> paymentOperationsEvidence() async =>
      PaymentOperationsEvidence.fromJson(
        await _api.get('/notifications/provider-evidence'),
      );

  Future<MobileMoneyReconciliationResult>
  runMobileMoneyReconciliation() async =>
      MobileMoneyReconciliationResult.fromJson(
        await _api.post(
          '/notifications/provider-job-runs/mobile-money-reconciliation',
          const {},
        ),
      );

  Future<List<SubscriptionPaymentItem>> subscriptionPayments() async =>
      (await _api.getList(
        '/subscription-payments',
      )).map(SubscriptionPaymentItem.fromJson).toList();

  Future<void> recordPayment({
    required String subscriptionId,
    required num amount,
    required String channel,
    required String reference,
  }) async {
    await _api.post('/subscriptions/$subscriptionId/payments', {
      'amount': amount,
      'channel': channel,
      'paymentMode': 'group',
      'externalReference': reference,
    });
  }

  Future<void> extendTrial({
    required String subscriptionId,
    required int days,
    required String reason,
  }) async {
    await _api.post('/subscriptions/$subscriptionId/trial-extension', {
      'days': days,
      'reason': reason,
    });
  }

  Future<void> upgradeSubscription({
    required String subscriptionId,
    required String packageId,
  }) async {
    await _api.post('/subscriptions/$subscriptionId/upgrade', {
      'packageId': packageId,
    });
  }

  Future<List<ApprovalRequest>> approvals() async => (await _api.getPage(
    '/tenants/fleet/jobs/approval-queue',
    size: 100,
  )).items.map(ApprovalRequest.fromJson).toList();

  Future<void> decideApproval(
    String jobId,
    String decision,
    String reason,
  ) async {
    await _api.post('/tenants/fleet/jobs/$jobId/decision', {
      'decision': decision,
      'reason': reason,
    });
  }

  Future<List<FleetBulkJob>> fleetJobs() async => (await _api.getList(
    '/tenants/fleet/jobs',
  )).map(FleetBulkJob.fromJson).toList();

  Future<List<FleetBulkJobResult>> fleetJobResults(String jobId) async =>
      (await _api.getList(
        '/tenants/fleet/jobs/$jobId/results',
      )).map(FleetBulkJobResult.fromJson).toList();

  Future<void> submitFleetJob({
    required List<String> tenantIds,
    required String status,
    required String accountManagerName,
    required String reason,
  }) async {
    await _api.post('/tenants/fleet/jobs', {
      'tenantIds': tenantIds,
      if (status.isNotEmpty) 'status': status,
      if (accountManagerName.isNotEmpty)
        'accountManagerName': accountManagerName,
      'reason': reason,
    });
  }

  Future<List<FleetIncident>> fleetIncidents() async => (await _api.getList(
    '/tenants/fleet/incidents',
  )).map(FleetIncident.fromJson).toList();

  Future<void> updateFleetIncident(
    String incidentKey,
    String status, {
    String resolutionNote = '',
  }) async {
    await _api.patch('/tenants/fleet/incidents/$incidentKey', {
      'status': status,
      if (resolutionNote.isNotEmpty) 'resolutionNote': resolutionNote,
    });
  }

  Future<List<FleetSavedView>> fleetSavedViews() async => (await _api.getList(
    '/tenants/fleet/views',
  )).map(FleetSavedView.fromJson).toList();

  Future<void> saveFleetView({
    required String name,
    required String search,
    required String health,
    required String status,
    required String district,
    required String accountManager,
  }) async {
    await _api.post('/tenants/fleet/views', {
      'name': name,
      'search': search,
      'health': health,
      'status': status,
      'district': district,
      'accountManager': accountManager,
    });
  }

  Future<void> deleteFleetView(String viewId) async {
    await _api.delete('/tenants/fleet/views/$viewId', const {});
  }

  Future<List<FleetForecastScenario>> forecastScenarios() async =>
      (await _api.getList(
        '/tenants/fleet/forecast-scenarios',
      )).map(FleetForecastScenario.fromJson).toList();

  Future<void> saveForecastScenario({
    required String name,
    required int renewalRate,
    required int priceAdjustment,
  }) async {
    await _api.post('/tenants/fleet/forecast-scenarios', {
      'name': name,
      'renewalRate': renewalRate,
      'priceAdjustment': priceAdjustment,
    });
  }

  Future<void> deleteForecastScenario(String scenarioId) async {
    await _api.delete(
      '/tenants/fleet/forecast-scenarios/$scenarioId',
      const {},
    );
  }

  Future<List<SupportTicket>> tickets() async =>
      (await _api.getList('/complaints')).map(SupportTicket.fromJson).toList();

  Future<void> updateTicket(String id, String status, String notes) async {
    await _api.patch('/complaints/$id/status', {
      'status': status,
      'resolutionNotes': notes,
    });
  }

  Future<List<PlatformUser>> users() async => (await _api.getList(
    '/users',
  )).map(PlatformUser.fromJson).where((user) => user.id.isNotEmpty).toList();

  Future<List<PlatformRole>> roles() async => (await _api.getList('/roles'))
      .map(PlatformRole.fromJson)
      .where((role) => role.tenantId == 'tenant_platform')
      .toList();

  Future<void> createUser({
    required String name,
    required String email,
    required String phone,
    required String channel,
    required String roleId,
  }) async {
    final user = await _api.post('/users', {
      'tenantId': 'tenant_platform',
      'fullName': name,
      'email': email,
      'phone': phone,
      'deliveryChannel': channel,
    });
    if (roleId.isNotEmpty) {
      await _api.put('/users/${stringValue(user['id'])}/roles', {
        'roleIds': [roleId],
      });
    }
  }

  Future<void> updateUserStatus(String id, String status) async {
    await _api.patch('/users/$id/status', {'status': status});
  }

  Future<void> updateUserMfa(String id, bool enabled) async {
    await _api.patch('/users/$id/mfa', {'enabled': enabled});
  }

  Future<void> revokeUserSessions(String id) async {
    await _api.post('/users/$id/sessions/revoke', const {});
  }

  Future<void> requestUserPasswordReset(String id) async {
    await _api.post('/users/$id/password-reset', const {});
  }

  Future<PlatformSecurityPolicy> securityPolicy() async =>
      PlatformSecurityPolicy.fromJson(
        await _api.get('/platform-security-policy'),
      );

  Future<PlatformSecurityPolicy> updateSecurityPolicy(
    PlatformSecurityPolicy policy,
  ) async => PlatformSecurityPolicy.fromJson(
    await _api.put('/platform-security-policy', policy.toJson()),
  );

  Future<PageResult<PlatformAuditEvent>> auditEvents({
    String search = '',
  }) async {
    final page = await _api.getPage(
      '/audit-events',
      size: 100,
      query: {
        'search': search.isEmpty ? null : search,
        'sort': 'createdAt',
        'direction': 'desc',
      },
    );
    return PageResult(
      page.items.map(PlatformAuditEvent.fromJson).toList(),
      page.page,
      page.totalPages,
      page.total,
    );
  }
}

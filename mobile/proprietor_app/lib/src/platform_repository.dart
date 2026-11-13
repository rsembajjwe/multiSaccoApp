import 'api_client.dart';
import 'models.dart';

class PlatformRepository {
  const PlatformRepository(this._api);
  final ApiClient _api;

  Future<FleetSummary> summary() async =>
      FleetSummary.fromJson(await _api.get('/tenants/fleet/summary'));

  Future<PageResult<TenantFleetItem>> tenants({String search = ''}) async {
    final page = await _api.getPage(
      '/tenants/fleet',
      size: 100,
      query: {'search': search.isEmpty ? null : search},
    );
    return PageResult(
      page.items.map(TenantFleetItem.fromJson).toList(),
      page.page,
      page.totalPages,
      page.total,
    );
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

  Future<List<PlatformSubscription>> subscriptions() async =>
      (await _api.getList(
        '/subscriptions',
      )).map(PlatformSubscription.fromJson).toList();

  Future<List<SubscriptionPackage>> packages() async => (await _api.getList(
    '/subscription-packages',
  )).map(SubscriptionPackage.fromJson).toList();

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
}

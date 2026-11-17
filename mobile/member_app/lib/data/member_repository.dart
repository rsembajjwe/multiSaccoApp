import '../api_contract.dart';
import '../domain/models.dart';
import 'api_client.dart';
import 'push_service.dart';
import 'session_store.dart';

/// The one place that knows how member API payloads map to domain entities.
class MemberRepository {
  MemberRepository(this._api, this._session, this._push);

  final ApiClient _api;
  final SessionStore _session;
  final PushService _push;

  Future<MemberSession> login({
    required String saccoCode,
    required String identifier,
    required String password,
  }) async {
    final data = await _api.post(ApiPaths.login, {
      'saccoCode': saccoCode,
      'identifier': identifier,
      'password': password,
    });
    final token = data['token'] as String?;
    if (token == null) {
      throw ApiException('Login failed: no token returned.');
    }
    await _session.writeToken(token);
    final member = data['member'] as Map<String, dynamic>?;
    final memberId = '${member?['id'] ?? ''}';
    if (memberId.isNotEmpty) {
      await _session.writeMemberId(memberId);
      await _push.subscribeMember(memberId);
    }
    return MemberSession(
      token: token,
      memberId: memberId,
      memberName: (member?['fullName'] ?? '') as String,
      expiresAt: data['expiresAt'] != null
          ? DateTime.tryParse('${data['expiresAt']}')
          : null,
    );
  }

  Future<({String reference, String organizationCode})> registerGroup({
    required String groupName,
    required String address,
    required Map<String, String> chairman,
    required Map<String, String> secretary,
    required Map<String, String> treasurer,
  }) async {
    final data = await _api.post(ApiPaths.groupRegistrations, {
      'groupName': groupName,
      'address': address,
      'chairman': chairman,
      'secretary': secretary,
      'treasurer': treasurer,
    });
    return (
      reference: '${data['reference'] ?? ''}',
      organizationCode: '${data['organizationCode'] ?? ''}',
    );
  }

  Future<DashboardSummary> dashboard() async {
    final data = await _api.get(ApiPaths.dashboard);
    return DashboardSummary.fromJson(data);
  }

  Future<bool> hasSession() async => (await _session.readToken()) != null;

  Future<void> logout() async {
    final memberId = await _session.readMemberId();
    if (memberId != null) await _push.unsubscribeMember(memberId);
    try {
      await _api.post(ApiPaths.logout, const {});
    } catch (_) {
      // Best-effort server revoke; the local token is cleared regardless.
    }
    await _session.clear();
  }

  /// Full member statement (all posted transactions, newest first).
  Future<List<StatementLine>> statement() async {
    final rows = await _api.getList(ApiPaths.statement);
    return rows.map(StatementLine.fromJson).toList();
  }

  /// Per-fund balances by fund code (savings, shares, welfare and any custom
  /// SACCO funds the member contributes to).
  Future<List<FundBalance>> fundBalances() async {
    final rows = await _api.getList(ApiPaths.fundBalances);
    return rows.map(FundBalance.fromJson).toList();
  }

  Future<String?> requestPasswordReset({
    String? saccoCode,
    required String identifier,
    String channel = 'sms',
  }) async {
    final normalizedSaccoCode = saccoCode?.trim() ?? '';
    final data = await _api.post(ApiPaths.passwordResetRequest, {
      if (normalizedSaccoCode.isNotEmpty) 'saccoCode': normalizedSaccoCode,
      'identifier': identifier.trim(),
      'channel': channel,
    });
    final destination = '${data['destination'] ?? ''}'.trim();
    return destination.isEmpty ? null : destination;
  }

  Future<void> confirmPasswordReset({
    required String token,
    required String newPassword,
  }) async {
    await _api.post(ApiPaths.passwordResetConfirm, {
      'token': token.trim(),
      'newPassword': newPassword,
    });
  }

  Future<MemberSubscription?> membership() async {
    final data = await _api.get(ApiPaths.membership);
    if (data.isEmpty) return null;
    return MemberSubscription.fromJson(data);
  }

  Future<void> submitComplaint({
    required String category,
    required String subject,
    String? description,
    String priority = 'normal',
  }) async {
    await _api.post(ApiPaths.mobileComplaints, {
      'category': category,
      'subject': subject,
      if (description != null && description.isNotEmpty)
        'description': description,
      'priority': priority,
    });
  }

  Future<List<Complaint>> complaints() async {
    final rows = await _api.getList(ApiPaths.complaints);
    return rows.map(Complaint.fromJson).toList();
  }

  Future<List<Meeting>> meetings() async {
    final rows = await _api.getList(ApiPaths.governanceMeetings);
    return rows.map(Meeting.fromJson).toList();
  }
}

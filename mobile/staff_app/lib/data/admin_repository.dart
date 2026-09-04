import '../core/format.dart';
import '../domain/models.dart';
import 'api_client.dart';

/// Read/write access to the admin data surfaces: members, loans, repayments
/// and the SACCO's own platform subscription.
class AdminRepository {
  AdminRepository(this._api);
  final ApiClient _api;

  Future<List<Member>> members({String? search}) async {
    final rows = await _api.getList('/members',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(Member.fromJson).toList();
  }

  Future<List<NextOfKin>> memberNextOfKin(String id) async =>
      (await _api.getList('/members/$id/next-of-kin'))
          .map(NextOfKin.fromJson)
          .toList();

  Future<List<Beneficiary>> memberBeneficiaries(String id) async =>
      (await _api.getList('/members/$id/beneficiaries'))
          .map(Beneficiary.fromJson)
          .toList();

  Future<List<MemberDocument>> memberDocuments(String id) async =>
      (await _api.getList('/members/$id/documents'))
          .map(MemberDocument.fromJson)
          .toList();

  Future<Member> member(String id) async =>
      Member.fromJson(await _api.get('/members/$id'));

  Future<List<Loan>> loans({String? search}) async {
    final rows = await _api.getList('/loans',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(Loan.fromJson).toList();
  }

  /// A single member's loans (server search matches the member id).
  Future<List<Loan>> memberLoans(String memberId) async {
    final rows = await _api.getList('/loans', query: {'search': memberId});
    return rows
        .map(Loan.fromJson)
        .where((l) => l.memberId == memberId)
        .toList();
  }

  Future<List<LoanScheduleRow>> loanSchedule(String loanId) async {
    final rows = await _api.getList('/loans/$loanId/schedule');
    return rows.map(LoanScheduleRow.fromJson).toList();
  }

  Future<List<LoanRepayment>> repayments(String loanId) async {
    final rows = await _api.getList('/loans/$loanId/repayments');
    return rows.map(LoanRepayment.fromJson).toList();
  }

  Future<List<FinancialTxn>> transactions({String? search}) async {
    final rows = await _api.getList('/financial-transactions',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(FinancialTxn.fromJson).toList();
  }

  Future<List<Subscription>> subscriptions() async {
    final rows = await _api.getList('/subscriptions');
    return rows.map(Subscription.fromJson).toList();
  }

  Future<List<SubscriptionPackage>> packages() async {
    final rows = await _api.getList('/subscription-packages');
    return rows.map(SubscriptionPackage.fromJson).toList();
  }

  /// Pay the SACCO's own subscription. With [memberSlots] set it tops up that
  /// many member slots (per-member pricing); with [amount] set it pays that
  /// amount; otherwise it settles the full outstanding balance.
  Future<Subscription> paySubscription(
    String subscriptionId, {
    num? amount,
    int? memberSlots,
  }) async {
    final body = <String, dynamic>{'channel': 'mobile_money'};
    if (memberSlots != null && memberSlots > 0) {
      body['paymentMode'] = 'per_member';
      body['memberSlots'] = memberSlots;
    } else if (amount != null && amount > 0) {
      body['amount'] = amount;
    }
    final result =
        await _api.post('/subscriptions/$subscriptionId/self-payments', body);
    final sub = result['subscription'];
    if (sub is Map<String, dynamic>) return Subscription.fromJson(sub);
    throw ApiException('Payment did not return an updated subscription.');
  }

  Future<List<WelfareClaim>> welfareClaims() async {
    final rows = await _api.getList('/welfare-claims');
    return rows.map(WelfareClaim.fromJson).toList();
  }

  Future<List<AuditEvent>> auditEvents({String? search}) async {
    final rows = await _api.getList('/audit-events',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(AuditEvent.fromJson).toList();
  }

  Future<List<AppUser>> users() async {
    final rows = await _api.getList('/users');
    return rows.map(AppUser.fromJson).toList();
  }

  Future<List<AppRole>> roles() async {
    final rows = await _api.getList('/roles');
    return rows.map(AppRole.fromJson).toList();
  }

  /// The role ids assigned to a user (names resolved via [roles] in the UI).
  Future<List<String>> userRoleIds(String userId) async {
    final data = await _api.get('/users/$userId/roles');
    final ids = data['roleIds'];
    return ids is List ? ids.map((e) => '$e').toList() : const [];
  }

  /// A member statement over [from]..[to] (defaults to the start of the
  /// current year through today), used to drill into a fund's transactions.
  Future<MemberStatement> memberStatement(
    String memberId, {
    DateTime? from,
    DateTime? to,
  }) async {
    final query = <String, dynamic>{};
    if (from != null) query['from'] = _isoDate(from);
    if (to != null) query['to'] = _isoDate(to);
    final data = await _api.get(_withQuery('/members/$memberId/statement', query));
    return MemberStatement.fromJson(data);
  }

  /// A member's loan ledger: each loan's disbursement plus its repayment
  /// deposits, newest first.
  Future<List<LoanLedgerEntry>> memberLoanLedger(String memberId) async {
    final loans = await memberLoans(memberId);
    final entries = <LoanLedgerEntry>[];
    for (final loan in loans) {
      if (loan.disbursedAt.isNotEmpty) {
        entries.add(LoanLedgerEntry(
          date: loan.disbursedAt,
          kind: 'disbursement',
          product: loan.product,
          amount: loan.amount,
          reference: 'Loan disbursed',
          status: loan.status,
        ));
      }
      final repays = await repayments(loan.id);
      for (final r in repays) {
        entries.add(LoanLedgerEntry(
          date: r.receivedAt,
          kind: 'repayment',
          product: loan.product,
          amount: r.amount,
          reference: r.reference.isEmpty ? Fmt.label(r.channel) : r.reference,
          status: r.status,
        ));
      }
    }
    entries.sort((a, b) => b.date.compareTo(a.date));
    return entries;
  }

  String _isoDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _withQuery(String path, Map<String, dynamic> query) {
    if (query.isEmpty) return path;
    final qs = query.entries.map((e) => '${e.key}=${Uri.encodeQueryComponent('${e.value}')}').join('&');
    return '$path?$qs';
  }

  /// Interest booked per year, derived from the loan book. Interest is
  /// attributed to the year a loan was disbursed (falling back to created).
  Future<List<InterestYear>> interestByYear() async {
    final all = await loans();
    final byYear = <int, List<num>>{}; // year -> [interest, principal, count]
    for (final l in all) {
      if (l.status == 'rejected' || l.status == 'cancelled') continue;
      final y = _yearOf(l);
      if (y == null) continue;
      final acc = byYear.putIfAbsent(y, () => [0, 0, 0]);
      acc[0] += l.interestAmount;
      acc[1] += l.amount;
      acc[2] += 1;
    }
    final years = byYear.keys.toList()..sort((a, b) => b.compareTo(a));
    return years
        .map((y) => InterestYear(
              year: y,
              interest: byYear[y]![0],
              principal: byYear[y]![1],
              loanCount: byYear[y]![2].toInt(),
            ))
        .toList();
  }

  int? _yearOf(Loan l) {
    final d = DateTime.tryParse(l.disbursedAt) ?? DateTime.tryParse(l.createdAt);
    return d?.toLocal().year;
  }
}

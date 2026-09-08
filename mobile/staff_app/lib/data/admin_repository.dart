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

  Future<DocumentBytes> memberDocumentContent(
          String memberId, String documentId) =>
      _api.getBytes('/members/$memberId/documents/$documentId/content');

  Future<List<MemberDocument>> memberDocuments(String id) async =>
      (await _api.getList('/members/$id/documents'))
          .map(MemberDocument.fromJson)
          .toList();

  Future<PageResult<Member>> membersPage(
      {String? search, required int page, int size = 20}) async {
    final r = await _api.getPage('/members',
        page: page,
        size: size,
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return r.mapItems(Member.fromJson);
  }

  Future<PageResult<Loan>> loansPage(
      {String? search, required int page, int size = 20}) async {
    final r = await _api.getPage('/loans',
        page: page,
        size: size,
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return r.mapItems(Loan.fromJson);
  }

  /// Update a member's editable details (staff PATCH is a full update, so we
  /// resend the member's current fields with the contact overrides).
  Future<Member> updateMember(Member m,
      {String? fullName, String? phone, String? email}) async {
    final body = <String, dynamic>{
      'branchId': m.branchId,
      'fullName': (fullName ?? m.fullName).trim(),
      'memberType': m.memberType.isEmpty ? 'individual' : m.memberType,
      'phone': (phone ?? m.phone).trim(),
      'email': (email ?? m.email).trim(),
      'nationalId': m.nationalId,
      'status': m.status,
      'kycStatus': m.kycStatus,
    };
    if (m.joiningDate.isNotEmpty) body['joiningDate'] = m.joiningDate;
    final data = await _api.patch('/members/${m.id}', body);
    return Member.fromJson(data);
  }

  /// Change a member's status (members:approve). Returns the updated member.
  Future<Member> updateMemberStatus(String id, String status) async {
    final data = await _api.patch('/members/$id/status', {'status': status});
    return Member.fromJson(data);
  }

  Future<Member> member(String id) async =>
      Member.fromJson(await _api.get('/members/$id'));

  Future<List<Loan>> loans({String? search}) async {
    final rows = await _api.getList('/loans',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(Loan.fromJson).toList();
  }

  Future<Loan> createLoan({
    required String memberId,
    required String product,
    required num amount,
    num? interestRate,
    required num chargeFee,
    required int repaymentMonths,
    required String purpose,
    required String signedFormReference,
  }) async {
    final data = await _api.post('/loans', {
      'memberId': memberId,
      'product': product,
      'amount': amount,
      if (interestRate != null) 'interestRate': interestRate,
      'chargeFee': chargeFee,
      'repaymentMonths': repaymentMonths,
      'purpose': purpose.trim(),
      'applicationSource': 'staff_captured_signed_form',
      'signedFormReference': signedFormReference.trim(),
    });
    return Loan.fromJson(data);
  }

  Future<LoanGuarantor> createLoanGuarantor({
    required String loanId,
    required String memberId,
  }) async {
    final data = await _api.post('/loans/$loanId/guarantors', {
      'memberId': memberId,
    });
    return LoanGuarantor.fromJson(data);
  }

  Future<List<LoanGuarantor>> guarantorRequests() async {
    final rows = await _api.getList('/loans/guarantor-requests');
    return rows.map(LoanGuarantor.fromJson).toList();
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

  Future<List<LoanExtension>> loanExtensions(String loanId) async {
    final rows = await _api.getList('/loans/$loanId/extensions');
    return rows.map(LoanExtension.fromJson).toList();
  }

  Future<Loan> extendLoan({
    required String loanId,
    required int additionalMonths,
    required num chargeFee,
    required String reason,
  }) async {
    final data = await _api.post('/loans/$loanId/extensions', {
      'additionalMonths': additionalMonths,
      'chargeFee': chargeFee,
      'reason': reason.trim(),
      'requestedByMember': true,
    });
    return Loan.fromJson(data);
  }

  Future<Loan> topUpLoan({
    required String loanId,
    required num amount,
    required int repaymentMonths,
    num? interestRate,
    required num chargeFee,
    required String reason,
  }) async {
    final data = await _api.post('/loans/$loanId/top-ups', {
      'amount': amount,
      'repaymentMonths': repaymentMonths,
      if (interestRate != null) 'interestRate': interestRate,
      'chargeFee': chargeFee,
      'reason': reason.trim(),
    });
    return Loan.fromJson(data);
  }

  Future<List<LoanRepayment>> repayments(String loanId) async {
    final rows = await _api.getList('/loans/$loanId/repayments');
    return rows.map(LoanRepayment.fromJson).toList();
  }

  /// Reverse a posted financial transaction (transactions:approve).
  Future<void> reverseTransaction(String id, String reason) async {
    await _api.post('/financial-transactions/$id/reversal', {'reason': reason});
  }

  Future<List<FinancialTxn>> transactions({String? search}) async {
    final rows = await _api.getList('/financial-transactions',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(FinancialTxn.fromJson).toList();
  }

  Future<PageResult<FinancialTxn>> transactionsPage(
      {String? search, required int page, int size = 25}) async {
    final r = await _api.getPage('/financial-transactions',
        page: page,
        size: size,
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return r.mapItems(FinancialTxn.fromJson);
  }

  Future<FinancialTxn> createCashSavingsDeposit({
    required String memberId,
    required num amount,
    String? narration,
  }) async {
    final data = await _api.post('/financial-transactions', {
      'memberId': memberId,
      'type': 'savings_deposit',
      'channel': 'cash',
      'amount': amount,
      if (narration != null && narration.trim().isNotEmpty)
        'narration': narration.trim(),
    });
    return FinancialTxn.fromJson(data);
  }

  Future<MobileMoneyPaymentRequest> requestMemberSavingsMobileMoney({
    required String memberId,
    required num amount,
    required String payerPhone,
    String? provider,
  }) async {
    final data = await _api.post(
      '/integrations/mobile-money/payment-requests/staff',
      {
        'memberId': memberId,
        'purpose': 'savings_deposit',
        'amount': amount,
        'payerPhone': payerPhone.trim(),
        if (provider != null && provider.trim().isNotEmpty)
          'provider': provider.trim(),
      },
    );
    return MobileMoneyPaymentRequest.fromJson(data);
  }

  Future<List<MemberFundBalance>> memberFundBalances() async {
    final rows = await _api.getList('/members/fund-balances');
    return rows.map(MemberFundBalance.fromJson).toList();
  }

  Future<SaccoProfile> saccoProfile(String tenantId) async {
    final data = await _api.get('/tenants/$tenantId/profile');
    return SaccoProfile.fromJson(data);
  }

  Future<SaccoProfile> updateSaccoProfile(
    String tenantId, {
    num? loanInterestRate,
    String? logoDataUrl,
  }) async {
    final data = await _api.patch('/tenants/$tenantId/profile', {
      if (loanInterestRate != null) 'loanInterestRate': loanInterestRate,
      if (logoDataUrl != null) 'logoDataUrl': logoDataUrl,
    });
    return SaccoProfile.fromJson(data);
  }

  Future<List<FundType>> fundTypes() async {
    final rows = await _api.getList('/fund-types');
    return rows.map(FundType.fromJson).toList();
  }

  Future<FundType> createFundType({
    required String name,
    required String code,
    required String basis,
    String? description,
  }) async {
    final data = await _api.post('/fund-types', {
      'name': name.trim(),
      'code': code.trim().toLowerCase(),
      'basis': basis.trim().toLowerCase(),
      if (description != null && description.trim().isNotEmpty)
        'description': description.trim(),
      'active': true,
    });
    return FundType.fromJson(data);
  }

  Future<List<Subscription>> subscriptions() async {
    final rows = await _api.getList('/subscriptions');
    return rows.map(Subscription.fromJson).toList();
  }

  Future<List<MemberSubscription>> memberSubscriptions() async {
    final rows = await _api.getList('/member-subscriptions');
    return rows.map(MemberSubscription.fromJson).toList();
  }

  Future<MemberSubscription> recordMemberSubscriptionPayment(
    String subscriptionId, {
    required num amount,
  }) async {
    final data = await _api.post('/member-subscriptions/$subscriptionId/payments', {
      'amount': amount,
      'method': 'cash',
    });
    return MemberSubscription.fromJson(data);
  }

  Future<void> recordBulkMemberSubscriptionPayment({
    required num amount,
    required List<String> subscriptionIds,
  }) async {
    await _api.post('/member-subscriptions/bulk-payments', {
      'amount': amount,
      'subscriptionIds': subscriptionIds,
      'method': 'cash',
    });
  }

  Future<MobileMoneyPaymentRequest> requestMemberDuesMobileMoney({
    required String memberId,
    required String subscriptionId,
    required String payerPhone,
    String? provider,
  }) async {
    final data = await _api.post(
      '/integrations/mobile-money/payment-requests/staff',
      {
        'memberId': memberId,
        'subscriptionId': subscriptionId,
        'purpose': 'membership_dues',
        'amount': 1,
        'payerPhone': payerPhone.trim(),
        if (provider != null && provider.trim().isNotEmpty)
          'provider': provider.trim(),
      },
    );
    return MobileMoneyPaymentRequest.fromJson(data);
  }

  Future<MobileMoneyPaymentRequest> requestSaccoSubscriptionMobileMoney({
    required num amount,
    required String payerPhone,
    List<String> memberSubscriptionIds = const [],
    String? provider,
  }) async {
    final data = await _api.post(
      '/integrations/mobile-money/subscription-payment-requests/staff',
      {
        'amount': amount,
        'payerPhone': payerPhone.trim(),
        if (memberSubscriptionIds.isNotEmpty)
          'memberSubscriptionIds': memberSubscriptionIds,
        if (provider != null && provider.trim().isNotEmpty)
          'provider': provider.trim(),
      },
    );
    return MobileMoneyPaymentRequest.fromJson(data);
  }

  Future<MobileMoneyPaymentRequest> requestSmsTopUpMobileMoney({
    required int smsCount,
    required String payerPhone,
    String? provider,
  }) async {
    final data = await _api.post(
      '/integrations/mobile-money/sms-payment-requests/staff',
      {
        'smsCount': smsCount,
        'payerPhone': payerPhone.trim(),
        if (provider != null && provider.trim().isNotEmpty)
          'provider': provider.trim(),
      },
    );
    return MobileMoneyPaymentRequest.fromJson(data);
  }

  Future<int> sendSmsBroadcast({
    required String message,
    String title = 'SACCO message',
    List<String> memberIds = const [],
  }) async {
    final data = await _api.post('/notifications/messages/sms', {
      'title': title.trim().isEmpty ? 'SACCO message' : title.trim(),
      'body': message.trim(),
      if (memberIds.isNotEmpty) 'memberIds': memberIds,
    });
    final balance = data['smsBalance'];
    if (balance is int) return balance;
    if (balance is num) return balance.toInt();
    return int.tryParse('$balance') ?? 0;
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

  Future<List<AppNotification>> notificationsFeed({String? search}) async {
    final rows = await _api.getList('/notifications/messages',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(AppNotification.fromJson).toList();
  }

  /// The current staff member's personal notification inbox.
  Future<List<AppNotification>> myNotifications() async {
    final rows = await _api.getList('/notifications/inbox');
    return rows.map(AppNotification.fromJson).toList();
  }

  Future<void> markNotificationRead(String id) async {
    await _api.patch('/notifications/inbox/$id/read', const {});
  }

  Future<void> markAllNotificationsRead() async {
    await _api.post('/notifications/inbox/read-all', const {});
  }

  Future<List<MobileMoneyPaymentRequest>> mobileMoneyPaymentRequests() async {
    final rows = await _api.getList('/integrations/mobile-money/payment-requests');
    return rows.map(MobileMoneyPaymentRequest.fromJson).toList();
  }

  Future<List<MobileMoneyCallback>> mobileMoneyCallbacks() async {
    final rows = await _api.getList('/integrations/mobile-money/callbacks');
    return rows.map(MobileMoneyCallback.fromJson).toList();
  }

  /// Live MTN/Airtel account (float) balances for configured providers.
  Future<List<MobileMoneyBalance>> mobileMoneyBalances() async {
    final rows = await _api.getList('/integrations/mobile-money/balances');
    return rows.map(MobileMoneyBalance.fromJson).toList();
  }

  Future<MobileMoneyPaymentRequest> refreshMobileMoneyProviderStatus(
      String requestId) async {
    final data = await _api
        .get('/integrations/mobile-money/payment-requests/$requestId/provider-status');
    return MobileMoneyPaymentRequest.fromJson(data);
  }

  Future<MobileMoneyPaymentRequest> updateMobileMoneyPaymentRequestStatus(
    String requestId,
    String status, {
    String? reason,
  }) async {
    final data = await _api.patch(
      '/integrations/mobile-money/payment-requests/$requestId/status',
      {
        'status': status,
        if (reason != null && reason.trim().isNotEmpty)
          'reason': reason.trim(),
      },
    );
    return MobileMoneyPaymentRequest.fromJson(data);
  }

  Future<ReconciliationReport> reconciliation() async {
    final data = await _api.get('/reconciliation');
    return ReconciliationReport.fromJson(data);
  }

  Future<List<ChatThread>> chatThreads() async {
    final rows = await _api.getList('/chat/threads');
    return rows.map(ChatThread.fromJson).toList();
  }

  Future<List<ChatMessage>> chatMessages(String threadId) async {
    final rows = await _api.getList('/chat/threads/$threadId/messages');
    return rows.map(ChatMessage.fromJson).toList();
  }

  Future<void> sendChatMessage(String threadId, String body) async {
    await _api.post('/chat/threads/$threadId/messages', {'body': body});
  }

  Future<void> markThreadRead(String threadId) async {
    try {
      await _api.post('/chat/threads/$threadId/read', const {});
    } catch (_) {}
  }

  Future<List<Complaint>> complaints() async {
    final rows = await _api.getList('/complaints');
    return rows.map(Complaint.fromJson).toList();
  }

  Future<PageResult<Complaint>> complaintsPage(
      {String? status, required int page, int size = 25}) async {
    final r = await _api.getPage('/complaints',
        page: page,
        size: size,
        query: (status != null && status.isNotEmpty) ? {'status': status} : null);
    return r.mapItems(Complaint.fromJson);
  }

  /// Update a complaint's status, optionally adding resolution notes.
  Future<void> updateComplaint(String id, String status,
      {String? notes}) async {
    await _api.patch('/complaints/$id/status', {
      'status': status,
      if (notes != null && notes.isNotEmpty) 'resolutionNotes': notes,
    });
  }

  Future<List<WelfareClaim>> welfareClaims() async {
    final rows = await _api.getList('/welfare-claims');
    return rows.map(WelfareClaim.fromJson).toList();
  }

  Future<PageResult<WelfareClaim>> welfareClaimsPage(
      {String? status, required int page, int size = 25}) async {
    final r = await _api.getPage('/welfare-claims',
        page: page,
        size: size,
        query: (status != null && status.isNotEmpty) ? {'status': status} : null);
    return r.mapItems(WelfareClaim.fromJson);
  }

  Future<List<SavingsTransfer>> savingsTransfers() async {
    final rows = await _api.getList('/savings-transfers');
    return rows.map(SavingsTransfer.fromJson).toList();
  }

  Future<void> decideSavingsTransfer(String id, String status,
      {String? reason}) async {
    await _api.patch('/savings-transfers/$id/decision', {
      'status': status,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }

  Future<List<GovernanceMeeting>> governanceMeetings() async {
    final rows = await _api.getList('/governance-meetings');
    return rows.map(GovernanceMeeting.fromJson).toList();
  }

  Future<List<AuditEvent>> auditEvents({String? search}) async {
    final rows = await _api.getList('/audit-events',
        query: (search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null);
    return rows.map(AuditEvent.fromJson).toList();
  }

  Future<List<FinancialProduct>> financialProducts() async {
    final rows = await _api.getList('/financial-products');
    return rows.map(FinancialProduct.fromJson).toList();
  }

  Future<List<Branch>> branches() async {
    final rows = await _api.getList('/branches');
    return rows.map(Branch.fromJson).toList();
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

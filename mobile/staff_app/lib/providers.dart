import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/api_client.dart';
import 'data/admin_repository.dart';
import 'data/auth_repository.dart';
import 'data/biometric_service.dart';
import 'data/push_service.dart';
import 'data/session_store.dart';
import 'domain/models.dart';

final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());

final pushServiceProvider = Provider<PushService>((ref) => PushService());

final apiClientProvider =
    Provider<ApiClient>((ref) => ApiClient(
          ref.watch(sessionStoreProvider),
          ref.watch(pushServiceProvider),
        ));

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(sessionStoreProvider),
    ref.watch(pushServiceProvider),
  ),
);

/// The current staff session (permissions + identity), refreshed from /auth/me.
final sessionProvider = FutureProvider<StaffSession>(
  (ref) => ref.watch(authRepositoryProvider).me(),
);

/// The permission set (from the keystore), used to gate features synchronously.
final permissionsProvider = FutureProvider<List<String>>(
  (ref) => ref.watch(sessionStoreProvider).readPermissions(),
);

final saccoStatusProvider = FutureProvider<SaccoStatus>((ref) async {
  final data = await ref.watch(apiClientProvider).get('/operations/status');
  return SaccoStatus.fromJson(data);
});

final adminRepositoryProvider =
    Provider<AdminRepository>((ref) => AdminRepository(ref.watch(apiClientProvider)));

/// Members list, optionally filtered by a search term.
final membersProvider =
    FutureProvider.autoDispose.family<List<Member>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).members(search: search),
);

final memberProvider = FutureProvider.autoDispose.family<Member, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).member(id),
);

final memberLoansProvider =
    FutureProvider.autoDispose.family<List<Loan>, String>(
  (ref, memberId) => ref.watch(adminRepositoryProvider).memberLoans(memberId),
);

final memberFundBalancesProvider =
    FutureProvider.autoDispose<List<MemberFundBalance>>(
  (ref) => ref.watch(adminRepositoryProvider).memberFundBalances(),
);

final saccoProfileProvider =
    FutureProvider.autoDispose.family<SaccoProfile, String>(
  (ref, tenantId) => ref.watch(adminRepositoryProvider).saccoProfile(tenantId),
);

/// Loans list, optionally filtered by a search term.
final loansProvider = FutureProvider.autoDispose.family<List<Loan>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).loans(search: search),
);

final loanRepaymentsProvider =
    FutureProvider.autoDispose.family<List<LoanRepayment>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).repayments(loanId),
);

final loanExtensionsProvider =
    FutureProvider.autoDispose.family<List<LoanExtension>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).loanExtensions(loanId),
);

final guarantorRequestsProvider =
    FutureProvider.autoDispose<List<LoanGuarantor>>(
  (ref) => ref.watch(adminRepositoryProvider).guarantorRequests(),
);

final subscriptionsProvider =
    FutureProvider.autoDispose<List<Subscription>>(
  (ref) => ref.watch(adminRepositoryProvider).subscriptions(),
);

final subscriptionPackagesProvider =
    FutureProvider.autoDispose<List<SubscriptionPackage>>(
  (ref) => ref.watch(adminRepositoryProvider).packages(),
);

final memberSubscriptionsProvider =
    FutureProvider.autoDispose<List<MemberSubscription>>(
  (ref) => ref.watch(adminRepositoryProvider).memberSubscriptions(),
);

final interestByYearProvider = FutureProvider.autoDispose<List<InterestYear>>(
  (ref) => ref.watch(adminRepositoryProvider).interestByYear(),
);

final fundTypesProvider = FutureProvider.autoDispose<List<FundType>>(
  (ref) => ref.watch(adminRepositoryProvider).fundTypes(),
);

/// Map of member id -> display name, used to label loans (which carry only ids).
final memberNamesProvider = FutureProvider.autoDispose<Map<String, String>>(
  (ref) async {
    final members = await ref.watch(adminRepositoryProvider).members();
    return {
      for (final m in members)
        m.id: m.fullName.isEmpty ? m.membershipNo : m.fullName
    };
  },
);

/// A member's statement from the start of the current year to today. Used to
/// drill into savings / shares / welfare transactions from a balance card.
final memberStatementProvider =
    FutureProvider.autoDispose.family<MemberStatement, String>(
  (ref, memberId) {
    final now = DateTime.now();
    return ref.watch(adminRepositoryProvider).memberStatement(
          memberId,
          from: DateTime(now.year, 1, 1),
          to: now,
        );
  },
);

/// A member's loan ledger: disbursements + repayment deposits, newest first.
final memberLoanLedgerProvider =
    FutureProvider.autoDispose.family<List<LoanLedgerEntry>, String>(
  (ref, memberId) =>
      ref.watch(adminRepositoryProvider).memberLoanLedger(memberId),
);

/// SACCO-wide financial transactions, optionally filtered by a search term.
final transactionsProvider =
    FutureProvider.autoDispose.family<List<FinancialTxn>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).transactions(search: search),
);

/// Welfare claims across the SACCO.
final welfareClaimsProvider = FutureProvider.autoDispose<List<WelfareClaim>>(
  (ref) => ref.watch(adminRepositoryProvider).welfareClaims(),
);

/// Audit events, optionally filtered by a search term.
final auditEventsProvider =
    FutureProvider.autoDispose.family<List<AuditEvent>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).auditEvents(search: search),
);

/// Staff users.
final usersProvider = FutureProvider.autoDispose<List<AppUser>>(
  (ref) => ref.watch(adminRepositoryProvider).users(),
);

/// Roles with their permissions.
final rolesProvider = FutureProvider.autoDispose<List<AppRole>>(
  (ref) => ref.watch(adminRepositoryProvider).roles(),
);

/// Role ids assigned to a specific user.
final userRoleIdsProvider =
    FutureProvider.autoDispose.family<List<String>, String>(
  (ref, userId) => ref.watch(adminRepositoryProvider).userRoleIds(userId),
);

final biometricServiceProvider =
    Provider<BiometricService>((ref) => BiometricService());

final biometricSupportedProvider = FutureProvider<bool>(
    (ref) => ref.watch(biometricServiceProvider).isSupported());

final biometricLockProvider = FutureProvider<bool>(
    (ref) => ref.watch(sessionStoreProvider).biometricLockEnabled());

/// A loan's repayment schedule (installments).
final loanScheduleProvider =
    FutureProvider.autoDispose.family<List<LoanScheduleRow>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).loanSchedule(loanId),
);

/// A member's full statement (all transactions, all funds).
final memberFullStatementProvider =
    FutureProvider.autoDispose.family<MemberStatement, String>(
  (ref, memberId) =>
      ref.watch(adminRepositoryProvider).memberStatement(memberId),
);

/// Member KYC & contacts.
final memberNextOfKinProvider =
    FutureProvider.autoDispose.family<List<NextOfKin>, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).memberNextOfKin(id),
);
final memberBeneficiariesProvider =
    FutureProvider.autoDispose.family<List<Beneficiary>, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).memberBeneficiaries(id),
);
final memberDocumentsProvider =
    FutureProvider.autoDispose.family<List<MemberDocument>, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).memberDocuments(id),
);

/// Member complaints across the SACCO.
final complaintsProvider = FutureProvider.autoDispose<List<Complaint>>(
  (ref) => ref.watch(adminRepositoryProvider).complaints(),
);

/// Map of staff user id -> display name, used to label maker/checker on records.
final staffNamesProvider = FutureProvider.autoDispose<Map<String, String>>(
  (ref) async {
    final users = await ref.watch(adminRepositoryProvider).users();
    return {
      for (final u in users)
        u.id: u.fullName.isEmpty ? u.email : u.fullName
    };
  },
);

/// Raw bytes of a member document, keyed by (memberId, documentId).
final memberDocumentContentProvider =
    FutureProvider.autoDispose.family<DocumentBytes, (String, String)>(
  (ref, key) =>
      ref.watch(adminRepositoryProvider).memberDocumentContent(key.$1, key.$2),
);

/// The SACCO's notification activity feed, optionally filtered by search.
final notificationsFeedProvider =
    FutureProvider.autoDispose.family<List<AppNotification>, String>(
  (ref, search) =>
      ref.watch(adminRepositoryProvider).notificationsFeed(search: search),
);

/// Staff mobile-money payment requests.
final mobileMoneyPaymentRequestsProvider =
    FutureProvider.autoDispose<List<MobileMoneyPaymentRequest>>(
  (ref) => ref.watch(adminRepositoryProvider).mobileMoneyPaymentRequests(),
);

/// Provider callbacks received from mobile-money integrations.
final mobileMoneyCallbacksProvider =
    FutureProvider.autoDispose<List<MobileMoneyCallback>>(
  (ref) => ref.watch(adminRepositoryProvider).mobileMoneyCallbacks(),
);

/// SACCO-wide cash reconciliation.
final reconciliationProvider = FutureProvider.autoDispose<ReconciliationReport>(
  (ref) => ref.watch(adminRepositoryProvider).reconciliation(),
);

/// Support chat threads.
final chatThreadsProvider = FutureProvider.autoDispose<List<ChatThread>>(
  (ref) => ref.watch(adminRepositoryProvider).chatThreads(),
);

/// Messages in a chat thread.
final chatMessagesProvider =
    FutureProvider.autoDispose.family<List<ChatMessage>, String>(
  (ref, threadId) => ref.watch(adminRepositoryProvider).chatMessages(threadId),
);

/// SACCO branches.
final branchesProvider = FutureProvider.autoDispose<List<Branch>>(
  (ref) => ref.watch(adminRepositoryProvider).branches(),
);

/// Financial products (loan/savings/share/welfare product setup).
final financialProductsProvider =
    FutureProvider.autoDispose<List<FinancialProduct>>(
  (ref) => ref.watch(adminRepositoryProvider).financialProducts(),
);

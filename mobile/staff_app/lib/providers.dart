import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/api_client.dart';
import 'data/admin_repository.dart';
import 'data/auth_repository.dart';
import 'data/biometric_service.dart';
import 'data/session_store.dart';
import 'domain/models.dart';

final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());

final apiClientProvider =
    Provider<ApiClient>((ref) => ApiClient(ref.watch(sessionStoreProvider)));

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(sessionStoreProvider),
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

/// Loans list, optionally filtered by a search term.
final loansProvider = FutureProvider.autoDispose.family<List<Loan>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).loans(search: search),
);

final loanRepaymentsProvider =
    FutureProvider.autoDispose.family<List<LoanRepayment>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).repayments(loanId),
);

final subscriptionsProvider =
    FutureProvider.autoDispose<List<Subscription>>(
  (ref) => ref.watch(adminRepositoryProvider).subscriptions(),
);

final subscriptionPackagesProvider =
    FutureProvider.autoDispose<List<SubscriptionPackage>>(
  (ref) => ref.watch(adminRepositoryProvider).packages(),
);

final interestByYearProvider = FutureProvider.autoDispose<List<InterestYear>>(
  (ref) => ref.watch(adminRepositoryProvider).interestByYear(),
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

/// Financial transactions awaiting approval.
final pendingTransactionsProvider =
    FutureProvider.autoDispose<List<FinancialTxn>>(
  (ref) => ref.watch(adminRepositoryProvider).pendingTransactions(),
);

/// Loan repayments awaiting approval.
final pendingRepaymentsProvider =
    FutureProvider.autoDispose<List<LoanRepayment>>(
  (ref) => ref.watch(adminRepositoryProvider).pendingRepayments(),
);

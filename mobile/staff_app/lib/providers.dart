import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/api_client.dart';
import 'data/admin_repository.dart';
import 'data/app_version_service.dart';
import 'data/auth_repository.dart';
import 'data/biometric_service.dart';
import 'data/offline_read_cache.dart';
import 'data/push_service.dart';
import 'data/session_store.dart';
import 'domain/models.dart';

final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());

/// App theme preference (System / Light / Dark), persisted in [SessionStore].
class ThemeModeController extends StateNotifier<ThemeMode> {
  ThemeModeController(this._store) : super(ThemeMode.system) {
    _load();
  }
  final SessionStore _store;

  Future<void> _load() async {
    state = _parse(await _store.readThemeMode());
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await _store.writeThemeMode(_name(mode));
  }

  static ThemeMode _parse(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _name(ThemeMode mode) => switch (mode) {
        ThemeMode.light => 'light',
        ThemeMode.dark => 'dark',
        ThemeMode.system => 'system',
      };
}

final themeModeProvider = StateNotifierProvider<ThemeModeController, ThemeMode>(
  (ref) => ThemeModeController(ref.watch(sessionStoreProvider)),
);

final pushServiceProvider = Provider<StaffPushTopics>((ref) => PushService());

final staffReadCacheProvider = Provider<StaffReadCache>(
  (ref) => StaffReadCache(ref.watch(sessionStoreProvider)),
);

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(
      ref.watch(sessionStoreProvider),
      ref.watch(pushServiceProvider),
      readCache: ref.watch(staffReadCacheProvider),
    ));

final appVersionServiceProvider = Provider<AppVersionService>(
  (ref) => AppVersionService(ref.watch(apiClientProvider)),
);

final appVersionPolicyProvider = FutureProvider<AppVersionPolicy?>(
  (ref) => ref.watch(appVersionServiceProvider).check(),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(sessionStoreProvider),
    ref.watch(pushServiceProvider),
    ref.watch(staffReadCacheProvider),
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

final adminRepositoryProvider = Provider<AdminRepository>(
    (ref) => AdminRepository(ref.watch(apiClientProvider)));

/// Members list, optionally filtered by a search term.
final membersProvider = FutureProvider.autoDispose.family<List<Member>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).members(search: search),
);

final memberProvider = FutureProvider.autoDispose.family<Member, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).member(id),
);

final memberLoansProvider =
    FutureProvider.autoDispose.family<List<Loan>, String>(
  (ref, memberId) => ref.watch(adminRepositoryProvider).memberLoans(memberId),
);

final memberLoanExposureProvider =
    FutureProvider.autoDispose.family<MemberLoanExposure, String>(
  (ref, memberId) =>
      ref.watch(adminRepositoryProvider).memberLoanExposure(memberId),
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

/// Aggregate loan-portfolio figures for the Reports screen.
final loanPortfolioSummaryProvider =
    FutureProvider.autoDispose<LoanPortfolioSummary>(
  (ref) => ref.watch(adminRepositoryProvider).loanPortfolioSummary(),
);

final loanRepaymentsProvider =
    FutureProvider.autoDispose.family<List<LoanRepayment>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).repayments(loanId),
);

final loanRecoveriesProvider =
    FutureProvider.autoDispose.family<List<LoanRecoveryCase>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).loanRecoveries(loanId),
);

final loanExtensionsProvider =
    FutureProvider.autoDispose.family<List<LoanExtension>, String>(
  (ref, loanId) => ref.watch(adminRepositoryProvider).loanExtensions(loanId),
);

final guarantorRequestsProvider =
    FutureProvider.autoDispose<List<LoanGuarantor>>(
  (ref) => ref.watch(adminRepositoryProvider).guarantorRequests(),
);

final subscriptionsProvider = FutureProvider.autoDispose<List<Subscription>>(
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

/// Paid/unpaid/total member-subscription counts for the summary cards.
final memberSubscriptionSummaryProvider =
    FutureProvider.autoDispose<MemberSubscriptionSummary>(
  (ref) => ref.watch(adminRepositoryProvider).memberSubscriptionSummary(),
);

final interestByYearProvider = FutureProvider.autoDispose<List<InterestYear>>(
  (ref) => ref.watch(adminRepositoryProvider).interestByYear(),
);

final fundTypesProvider = FutureProvider.autoDispose<List<FundType>>(
  (ref) => ref.watch(adminRepositoryProvider).fundTypes(),
);

/// SACCO capital sources-of-funds register (finance-source:view).
final fundingSourcesProvider = FutureProvider.autoDispose<List<FundingSource>>(
  (ref) => ref.watch(adminRepositoryProvider).fundingSources(),
);

/// Treasurer cash book (cash-on-hand + entries). accounting:view.
final cashBookProvider = FutureProvider.autoDispose<CashBook>(
  (ref) => ref.watch(adminRepositoryProvider).cashBook(),
);

final expensesProvider = FutureProvider.autoDispose<List<Expense>>(
  (ref) => ref.watch(adminRepositoryProvider).expenses(),
);

final expenseAccountsProvider = FutureProvider.autoDispose<List<ChartAccount>>(
  (ref) => ref.watch(adminRepositoryProvider).expenseAccounts(),
);

final suppliersProvider = FutureProvider.autoDispose<List<Supplier>>(
  (ref) => ref.watch(adminRepositoryProvider).suppliers(),
);

/// Map of member id -> display name, used to label loans (which carry only ids).
final memberNamesProvider = FutureProvider.autoDispose<Map<String, String>>(
  (ref) => ref.watch(adminRepositoryProvider).memberNames(),
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
  (ref, search) =>
      ref.watch(adminRepositoryProvider).transactions(search: search),
);

/// Global-search result pages: only the first page per source, so a broad
/// query never pulls the whole table. Each carries the total match count.
final searchMembersProvider =
    FutureProvider.autoDispose.family<PageResult<Member>, String>(
  (ref, query) => ref
      .watch(adminRepositoryProvider)
      .membersPage(search: query, page: 0, size: 8),
);

final searchLoansProvider =
    FutureProvider.autoDispose.family<PageResult<Loan>, String>(
  (ref, query) => ref
      .watch(adminRepositoryProvider)
      .loansPage(search: query, page: 0, size: 8),
);

final searchTransactionsProvider =
    FutureProvider.autoDispose.family<PageResult<FinancialTxn>, String>(
  (ref, query) => ref
      .watch(adminRepositoryProvider)
      .transactionsPage(search: query, page: 0, size: 8),
);

/// Welfare claims across the SACCO.
final welfareClaimsProvider = FutureProvider.autoDispose<List<WelfareClaim>>(
  (ref) => ref.watch(adminRepositoryProvider).welfareClaims(),
);

final savingsTransfersProvider =
    FutureProvider.autoDispose<List<SavingsTransfer>>(
  (ref) => ref.watch(adminRepositoryProvider).savingsTransfers(),
);

final governanceMeetingsProvider =
    FutureProvider.autoDispose<List<GovernanceMeeting>>(
  (ref) => ref.watch(adminRepositoryProvider).governanceMeetings(),
);

/// Audit events, optionally filtered by a search term.
final auditEventsProvider =
    FutureProvider.autoDispose.family<List<AuditEvent>, String>(
  (ref, search) =>
      ref.watch(adminRepositoryProvider).auditEvents(search: search),
);

/// Staff users.
final usersProvider = FutureProvider.autoDispose<List<AppUser>>(
  (ref) => ref.watch(adminRepositoryProvider).users(),
);

/// Roles with their permissions.
final rolesProvider = FutureProvider.autoDispose<List<AppRole>>(
  (ref) => ref.watch(adminRepositoryProvider).roles(),
);

final permissionsCatalogProvider =
    FutureProvider.autoDispose<List<AppPermission>>(
  (ref) => ref.watch(adminRepositoryProvider).permissions(),
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

/// Key for a member's full statement over an optional date range. A null
/// [from]/[to] lets the backend apply its default window (start of the
/// current year through today).
typedef StatementRange = ({String memberId, DateTime? from, DateTime? to});

/// A member's full statement (all transactions, all funds) over a date range.
final memberFullStatementProvider =
    FutureProvider.autoDispose.family<MemberStatement, StatementRange>(
  (ref, key) => ref.watch(adminRepositoryProvider).memberStatement(
        key.memberId,
        from: key.from,
        to: key.to,
      ),
);

/// Member KYC & contacts.
final memberNextOfKinProvider =
    FutureProvider.autoDispose.family<List<NextOfKin>, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).memberNextOfKin(id),
);
final groupOfficialsProvider =
    FutureProvider.autoDispose.family<List<GroupOfficial>, String>(
  (ref, id) => ref.watch(adminRepositoryProvider).groupOfficials(id),
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
      for (final u in users) u.id: u.fullName.isEmpty ? u.email : u.fullName
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
/// The current staff member's personal notification inbox.
final myNotificationsProvider =
    FutureProvider.autoDispose<List<AppNotification>>(
  (ref) => ref.watch(adminRepositoryProvider).myNotifications(),
);

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

/// Live MTN/Airtel provider account balances (configured providers only).
final mobileMoneyBalancesProvider =
    FutureProvider.autoDispose<List<MobileMoneyBalance>>(
  (ref) => ref.watch(adminRepositoryProvider).mobileMoneyBalances(),
);

/// SACCO-wide cash reconciliation.
final reconciliationProvider = FutureProvider.autoDispose<ReconciliationReport>(
  (ref) => ref.watch(adminRepositoryProvider).reconciliation(),
);

final regulatoryReportProvider = FutureProvider.autoDispose<RegulatoryReport>(
  (ref) => ref.watch(adminRepositoryProvider).regulatoryReport(),
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

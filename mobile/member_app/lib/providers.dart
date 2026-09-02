import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/api_client.dart';
import 'data/biometric_service.dart';
import 'data/loan_repository.dart';
import 'data/member_repository.dart';
import 'data/notification_repository.dart';
import 'data/profile_repository.dart';
import 'data/payment_repository.dart';
import 'data/push_service.dart';
import 'data/session_store.dart';
import 'domain/models.dart';

final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());

final apiClientProvider =
    Provider<ApiClient>((ref) => ApiClient(ref.watch(sessionStoreProvider)));

final pushServiceProvider = Provider<PushService>((ref) => PushService());

final memberRepositoryProvider = Provider<MemberRepository>(
  (ref) => MemberRepository(
    ref.watch(apiClientProvider),
    ref.watch(sessionStoreProvider),
    ref.watch(pushServiceProvider),
  ),
);

final loanRepositoryProvider =
    Provider<LoanRepository>((ref) => LoanRepository(ref.watch(apiClientProvider)));

final paymentRepositoryProvider = Provider<PaymentRepository>(
  (ref) => PaymentRepository(ref.watch(apiClientProvider)),
);

final dashboardProvider = FutureProvider<DashboardSummary>(
  (ref) => ref.watch(memberRepositoryProvider).dashboard(),
);

final loansProvider =
    FutureProvider<List<Loan>>((ref) => ref.watch(loanRepositoryProvider).loans());

final paymentHistoryProvider = FutureProvider<List<MobileMoneyPayment>>(
  (ref) => ref.watch(paymentRepositoryProvider).history(),
);

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ref.watch(apiClientProvider)),
);

final notificationsProvider = FutureProvider<List<MemberNotification>>(
  (ref) => ref.watch(notificationRepositoryProvider).list(),
);

final profileRepositoryProvider = Provider<ProfileRepository>(
  (ref) => ProfileRepository(ref.watch(apiClientProvider)),
);

final profileProvider = FutureProvider<MemberProfile>(
  (ref) => ref.watch(profileRepositoryProvider).me(),
);

final profilePhotoProvider = FutureProvider<Uint8List?>(
  (ref) => ref.watch(profileRepositoryProvider).photo(),
);

final unreadCountProvider = Provider<int>((ref) {
  final async = ref.watch(notificationsProvider);
  return async.maybeWhen(
    data: (list) => list.where((n) => !n.read).length,
    orElse: () => 0,
  );
});

final notificationChannelsProvider = FutureProvider<Map<String, bool>>(
  (ref) => ref.watch(profileRepositoryProvider).channels(),
);

final membershipProvider = FutureProvider<MemberSubscription?>(
  (ref) => ref.watch(memberRepositoryProvider).membership(),
);

final complaintsProvider = FutureProvider<List<Complaint>>(
  (ref) => ref.watch(memberRepositoryProvider).complaints(),
);

final loanRepaymentsProvider =
    FutureProvider.family<List<LoanRepayment>, String>(
  (ref, loanId) => ref.watch(loanRepositoryProvider).repayments(loanId),
);

final fundBalancesProvider = FutureProvider<List<FundBalance>>(
  (ref) => ref.watch(memberRepositoryProvider).fundBalances(),
);

final statementProvider = FutureProvider<List<StatementLine>>(
  (ref) => ref.watch(memberRepositoryProvider).statement(),
);

final biometricServiceProvider =
    Provider<BiometricService>((ref) => BiometricService());

final biometricSupportedProvider =
    FutureProvider<bool>((ref) => ref.watch(biometricServiceProvider).isSupported());

final biometricLockProvider =
    FutureProvider<bool>((ref) => ref.watch(sessionStoreProvider).biometricLockEnabled());

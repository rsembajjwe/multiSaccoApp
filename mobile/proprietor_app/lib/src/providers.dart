import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'models.dart';
import 'platform_repository.dart';
import 'session_store.dart';

final sessionStoreProvider = Provider((ref) => SessionStore());
final apiClientProvider = Provider(
  (ref) => ApiClient(ref.watch(sessionStoreProvider)),
);
final authRepositoryProvider = Provider(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(sessionStoreProvider),
  ),
);
final platformRepositoryProvider = Provider(
  (ref) => PlatformRepository(ref.watch(apiClientProvider)),
);

final fleetSummaryProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).summary(),
);
final fleetProvider = FutureProvider.autoDispose
    .family<PageResult<TenantFleetItem>, String>(
      (ref, search) =>
          ref.watch(platformRepositoryProvider).tenants(search: search),
    );
final subscriptionsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).subscriptions(),
);
final packagesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).packages(),
);
final approvalsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).approvals(),
);
final ticketsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).tickets(),
);
final platformUsersProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).users(),
);
final platformRolesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).roles(),
);

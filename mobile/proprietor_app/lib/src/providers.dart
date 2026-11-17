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
final saccoLifecycleProvider = FutureProvider.autoDispose
    .family<SaccoLifecycleData, String>(
      (ref, tenantId) =>
          ref.watch(platformRepositoryProvider).saccoLifecycle(tenantId),
    );
final subscriptionsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).subscriptions(),
);
final packagesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).packages(),
);
final billingCatalogProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).billingCatalog(),
);
final adminPackagesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).adminPackages(),
);
final smsSalesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).smsSales(),
);
final smsInventoryProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).smsInventory(),
);
final smsBroadcastTenantsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).tenants(),
);
final notificationProviderStatusProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).notificationProviderStatus(),
);
final notificationDeliveriesProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).notificationDeliveries(),
);
final paymentOperationsEvidenceProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).paymentOperationsEvidence(),
);
final subscriptionPaymentsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).subscriptionPayments(),
);
final approvalsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).approvals(),
);
final fleetJobsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).fleetJobs(),
);
final fleetIncidentsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).fleetIncidents(),
);
final fleetSavedViewsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).fleetSavedViews(),
);
final forecastScenariosProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).forecastScenarios(),
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
final platformSecurityPolicyProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(platformRepositoryProvider).securityPolicy(),
);
final platformAuditEventsProvider = FutureProvider.autoDispose
    .family<PageResult<PlatformAuditEvent>, String>(
      (ref, search) =>
          ref.watch(platformRepositoryProvider).auditEvents(search: search),
    );

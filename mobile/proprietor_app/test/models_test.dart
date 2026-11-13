import 'package:flutter_test/flutter_test.dart';
import 'package:tereka_proprietor_app/src/models.dart';

void main() {
  test('platform session reads identity and permissions', () {
    final session = PlatformSession.fromJson({
      'token': 'token',
      'user': {
        'id': 'user_1',
        'fullName': 'Platform Owner',
        'email': 'owner@example.com',
        'tenantId': 'tenant_platform',
      },
      'roleNames': ['Platform Super Admin'],
      'permissionIds': ['tenants:view', 'tenants:manage'],
    });

    expect(session.isPlatform, isTrue);
    expect(session.can('tenants:manage'), isTrue);
    expect(session.name, 'Platform Owner');
  });

  test('fleet summary maps proprietor dashboard measures', () {
    final summary = FleetSummary.fromJson({
      'totalOrganizations': 12,
      'active': 8,
      'pendingReview': 2,
      'suspended': 1,
      'healthy': 7,
      'critical': 2,
      'renewalsDueIn30Days': 3,
      'expiredSubscriptions': 1,
      'totalSubscriptionRevenue': 4500000,
      'outstandingSubscriptionBalance': 600000,
      'averageOnboarding': 82,
      'slaBreached': 1,
    });

    expect(summary.total, 12);
    expect(summary.revenue, 4500000);
    expect(summary.outstanding, 600000);
    expect(summary.averageOnboarding, 82);
  });

  test('subscription balance never becomes negative', () {
    final subscription = PlatformSubscription.fromJson({
      'id': 'sub_1',
      'tenantId': 'tenant_1',
      'packageId': 'premium',
      'status': 'active',
      'amount': 100000,
      'paid': 120000,
      'invoice': 'INV-1',
    });

    expect(subscription.balance, 0);
  });

  test('fleet item parses expiry and outstanding balance', () {
    final tenant = TenantFleetItem.fromJson({
      'id': 'tenant_1',
      'saccoCode': 'AZCG',
      'name': 'A-Z Community Group',
      'status': 'active',
      'district': 'Kampala',
      'health': 'healthy',
      'healthReason': 'Operating normally',
      'subscriptionStatus': 'active',
      'subscriptionExpiry': '2027-11-13',
      'balanceDue': 25000,
      'onboarding': 100,
    });

    expect(tenant.subscriptionExpiry, DateTime(2027, 11, 13));
    expect(tenant.balanceDue, 25000);
  });
}

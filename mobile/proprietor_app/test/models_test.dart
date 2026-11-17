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
      'renewalsDueIn90Days': 3,
      'projectedRenewalValue90Days': 120000,
      'renewalForecast': [
        {
          'period': '2026-12',
          'organizations': 2,
          'projectedValue': 100000,
          'outstandingBalance': 20000,
        },
      ],
    });

    expect(summary.total, 12);
    expect(summary.revenue, 4500000);
    expect(summary.outstanding, 600000);
    expect(summary.averageOnboarding, 82);
    expect(summary.renewalForecast.single.organizations, 2);
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
      'memberCount': 12,
      'paidMemberCapacity': 12,
      'unitPrice': 5000,
      'tierLabel': 'Up to 250 members',
      'billingDescription': 'UGX 5,000 per registered member annually',
      'lifecycleState': 'active',
    });

    expect(subscription.balance, 0);
    expect(subscription.paidMemberCapacity, 12);
    expect(subscription.unitPrice, 5000);
    expect(subscription.tierLabel, 'Up to 250 members');
  });

  test('subscription package exposes member range and payment model', () {
    final package = SubscriptionPackage.fromJson({
      'id': 'community',
      'name': 'Community',
      'price': 5000,
      'billingPeriod': 'annual',
      'minMembers': 0,
      'memberLimit': 250,
      'tierLabel': 'Up to 250 members',
      'modules': 'Members, savings, shares, reports',
      'userLimit': 5,
      'branchLimit': 1,
      'status': 'active',
    });

    expect(package.isPerMember, isTrue);
    expect(package.userLimit, 5);
    expect(package.memberLimit, 250);
    expect(package.tierLabel, 'Up to 250 members');
  });

  test('billing catalog exposes proprietor SMS selling rate', () {
    final rate = BillingRate.fromJson({
      'code': 'sms_rate',
      'name': 'SMS message',
      'category': 'sms_rate',
      'unitPrice': 50,
      'billingPeriod': 'metered',
      'active': true,
    });

    expect(rate.code, 'sms_rate');
    expect(rate.unitPrice, 50);
    expect(rate.active, isTrue);
  });

  test('platform SMS broadcast maps delivery outcome', () {
    final result = PlatformSmsBroadcastResult.fromJson({
      'saccosSelected': 2,
      'saccosReached': 1,
      'recipients': 3,
      'sent': 2,
      'failed': 1,
      'smsSegments': 2,
      'providerSmsUnits': 6,
    });

    expect(result.saccosSelected, 2);
    expect(result.saccosReached, 1);
    expect(result.sent, 2);
    expect(result.failed, 1);
    expect(result.providerSmsUnits, 6);
  });

  test('notification provider and failed delivery map operations data', () {
    final provider = NotificationProviderStatus.fromJson({
      'channel': 'sms',
      'provider': 'afrosms',
      'status': 'ready',
      'balance': '120',
      'message': 'Available',
      'checkedAt': '2026-11-14T08:00:00Z',
    });
    final delivery = NotificationDeliveryItem.fromJson({
      'id': 'delivery_one',
      'tenantId': 'tenant_one',
      'channel': 'sms',
      'provider': 'afrosms',
      'recipient': '+256700000001',
      'status': 'failed',
      'message': 'Hello',
      'eventType': 'platform_sms_broadcast',
      'title': 'Notice',
      'createdAt': '2026-11-14T08:01:00Z',
    });

    expect(provider.isReady, isTrue);
    expect(provider.balance, '120');
    expect(delivery.failed, isTrue);
    expect(delivery.tenantId, 'tenant_one');
  });

  test('payment operations evidence maps reconciliation and providers', () {
    final evidence = PaymentOperationsEvidence.fromJson({
      'evidenceStatus': 'review',
      'checkedAt': '2026-11-14T09:00:00Z',
      'mobileMoney': {
        'paymentRequests': 10,
        'pendingPaymentRequests': 2,
        'failedPaymentRequests': 1,
        'postedPaymentRequests': 7,
        'callbacksReceived': 8,
        'callbacksPendingApproval': 1,
        'callbacksPosted': 7,
        'providerOptions': [
          {
            'network': 'mtn',
            'label': 'MTN Mobile Money',
            'providerId': 'mtn_momo',
            'available': true,
          },
        ],
        'reconciliationSummary': {
          'scanned': 2,
          'updated': 1,
          'failed': 1,
          'status': 'completed_with_errors',
          'message': 'Checked 2 requests.',
          'ranAt': '2026-11-14T08:59:00Z',
        },
        'evidenceStatus': 'review',
      },
    });

    expect(evidence.mobileMoney.pendingPaymentRequests, 2);
    expect(evidence.mobileMoney.providers.single.available, isTrue);
    expect(evidence.mobileMoney.reconciliation.failed, 1);
  });

  test('security policy and audit events map platform controls', () {
    final policy = PlatformSecurityPolicy.fromJson({
      'minimumPasswordLength': 12,
      'requireUppercase': true,
      'requireLowercase': true,
      'requireNumber': true,
      'requireSymbol': true,
      'passwordExpiryDays': 90,
      'lockoutFailedAttempts': 5,
      'lockoutMinutes': 30,
      'updatedAt': '2026-11-14T10:00:00Z',
    });
    final event = PlatformAuditEvent.fromJson({
      'id': 'audit_one',
      'tenantId': 'tenant_platform',
      'actorName': 'Proprietor',
      'action': 'Updated platform security policy',
      'resourceType': 'platform_security_policy',
      'resourceId': 'platform_default',
      'ipAddress': '127.0.0.1',
      'createdAt': '2026-11-14T10:01:00Z',
    });

    expect(policy.minimumPasswordLength, 12);
    expect(policy.toJson()['lockoutMinutes'], 30);
    expect(event.tenantId, 'tenant_platform');
  });

  test('SACCO lifecycle maps collection controls and payment accounts', () {
    final tenant = TenantLifecycleDetail.fromJson({
      'id': 'tenant_one',
      'name': 'Mutwe Community',
      'abbreviation': 'MUTWE',
      'status': 'active',
      'registrationNo': 'REG-1',
      'district': 'Wakiso',
      'country': 'Uganda',
      'packageId': 'community',
      'allowedCollectionMode': 'BOTH',
      'mobileMoneyCollectionActive': true,
      'bankCollectionActive': false,
    });
    final account = SaccoPaymentAccountItem.fromJson({
      'id': 'account_one',
      'channel': 'mobile_money',
      'network': 'mtn',
      'accountName': 'Mutwe Community',
      'accountNumber': '256700000001',
      'active': true,
    });
    final official = SaccoOfficialItem.fromJson({
      'office': 'chairperson',
      'memberId': 'member_one',
      'membershipNo': 'MUTWE-0001',
      'fullName': 'Jane Chairperson',
      'email': 'jane@example.com',
      'phone': '+256700123456',
      'staffAccessGranted': true,
      'validMember': true,
    });

    expect(tenant.allowedCollectionMode, 'BOTH');
    expect(tenant.mobileMoneyActive, isTrue);
    expect(account.toJson(activeOverride: false)['active'], isFalse);
    expect(official.email, 'jane@example.com');
    expect(official.phone, '+256700123456');
    expect(official.staffAccessGranted, isTrue);
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
      'setupMissing': <String>[],
      'smsBalance': 42,
    });

    expect(tenant.subscriptionExpiry, DateTime(2027, 11, 13));
    expect(tenant.balanceDue, 25000);
    expect(tenant.smsBalance, 42);
    expect(tenant.setupMissing, isEmpty);
  });

  test('fleet operations map job results and incidents', () {
    final job = FleetBulkJob.fromJson({
      'id': 'fleet_job_one',
      'status': 'completed_with_errors',
      'requestedByName': 'Proprietor',
      'requestReason': 'Compliance review',
      'requestedCount': 2,
      'succeededCount': 1,
      'failedCount': 1,
      'targetStatus': 'pending_review',
      'createdAt': '2026-11-14T10:00:00Z',
    });
    final result = FleetBulkJobResult.fromJson({
      'id': 'result_one',
      'tenantId': 'tenant_one',
      'tenantName': 'Mutwe Community',
      'status': 'failed',
      'message': 'Update failed.',
    });
    final incident = FleetIncident.fromJson({
      'incidentKey': 'tenant_one:payment_callback',
      'tenantId': 'tenant_one',
      'issueType': 'payment_callback',
      'workflowStatus': 'acknowledged',
      'assigneeName': 'Proprietor',
      'updatedAt': '2026-11-14T10:05:00Z',
    });

    expect(job.failedCount, 1);
    expect(result.tenantName, 'Mutwe Community');
    expect(incident.status, 'acknowledged');
  });

  test('saved fleet views and forecasts map reporting controls', () {
    final view = FleetSavedView.fromJson({
      'id': 'view_one',
      'name': 'Kampala risks',
      'district': 'Kampala',
      'health': 'critical',
      'status': '',
      'search': '',
      'accountManager': 'unassigned',
    });
    final scenario = FleetForecastScenario.fromJson({
      'id': 'scenario_one',
      'name': 'Conservative',
      'renewalRate': 80,
      'priceAdjustment': 5,
    });

    expect(view.health, 'critical');
    expect(scenario.projectedValue(100000), closeTo(84000, 0.01));
  });

  test('billing operations map composed bills and SMS sales', () {
    final summary = TenantBillingSummary.fromJson({
      'tenantId': 'tenant_one',
      'annualRecurringTotal': 1200000,
      'oneTimeTotal': 500000,
      'usageTotal': 4500,
      'total': 1704500,
      'lines': [
        {
          'category': 'subscription',
          'description': 'Base subscription',
          'quantity': 1,
          'amount': 1200000,
          'billingPeriod': 'annual',
        },
      ],
    });
    final sale = SmsSaleItem.fromJson({
      'id': 'sms_sale_one',
      'tenantId': 'tenant_one',
      'quantity': 100,
      'unitPrice': 45,
      'amount': 4500,
      'reference': 'CASH-001',
      'description': 'Cash SMS credit purchase',
      'createdAt': '2026-11-15T08:00:00Z',
    });

    expect(summary.lines.single.description, 'Base subscription');
    expect(summary.total, 1704500);
    expect(sale.quantity, 100);
  });

  test('SMS inventory maps provider capacity and customer commitments', () {
    final inventory = SmsInventorySummary.fromJson({
      'provider': 'afrosms',
      'providerStatus': 'ready',
      'providerBalance': 23955,
      'providerUnitCost': 35,
      'saccoSellingRate': 45,
      'providerAvailableCredits': 684,
      'saccoCreditsOutstanding': 200,
      'memberCreditsOutstanding': 25,
      'totalCreditsOutstanding': 225,
      'reserveCredits': 459,
      'lowStockThreshold': 100,
      'grossMarginPerSms': 10,
      'grossMarginPercent': 28.57,
      'totalCreditsSold': 350,
      'totalSalesRevenue': 15750,
      'suggestedTopUpAmount': 0,
      'alertLevel': 'ok',
      'alertCode': 'SMS_INVENTORY_HEALTHY',
      'alertMessage': 'SMS inventory is healthy.',
      'providerCheckedAt': '2026-11-16T10:00:00Z',
      'settingsUpdatedAt': '2026-11-16T09:00:00Z',
      'settingsUpdatedBy': 'user_1',
    });

    expect(inventory.providerAvailableCredits, 684);
    expect(inventory.totalCreditsOutstanding, 225);
    expect(inventory.reserveCredits, 459);
    expect(inventory.needsAttention, isFalse);
  });
}

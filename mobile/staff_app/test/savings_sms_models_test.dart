import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/domain/models.dart';

void main() {
  test('SACCO profile maps annual savings withdrawal settings', () {
    final profile = SaccoProfile.fromJson({
      'id': 'profile_one',
      'tenantId': 'tenant_one',
      'legalName': 'One SACCO',
      'savingsCyclePeriod': 'annual',
      'savingsCycleStartMonth': 12,
      'savingsCycleStartDay': 1,
      'savingsWithdrawalWindowDays': 15,
    });

    expect(profile.savingsCyclePeriod, 'annual');
    expect(profile.savingsCycleStartMonth, 12);
    expect(profile.savingsWithdrawalWindowDays, 15);
  });

  test('SMS schedule maps execution and credit details', () {
    final schedule = SmsSchedule.fromJson({
      'id': 'schedule_one',
      'title': 'Account update',
      'mode': 'account_status',
      'status': 'scheduled',
      'scheduledAt': '2026-12-01T08:00:00Z',
      'estimatedCredits': 20,
      'recipients': 10,
      'creditsUsed': 0,
      'failureReason': '',
    });

    expect(schedule.mode, 'account_status');
    expect(schedule.status, 'scheduled');
    expect(schedule.estimatedCredits, 20);
    expect(schedule.scheduledAt, isNotNull);
  });
}

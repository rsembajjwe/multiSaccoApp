import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tereka_proprietor_app/src/api_client.dart';
import 'package:tereka_proprietor_app/src/platform_repository.dart';
import 'package:tereka_proprietor_app/src/session_store.dart';

void main() {
  test('recovers missing official assignments from matching members', () async {
    final api = _OfficialApiClient(
      members: const [
        {'id': 'member-chair', 'name': 'Jane Chair'},
        {'id': 'member-treasurer', 'name': 'John Treasurer'},
        {'id': 'member-secretary', 'name': 'Joan Secretary'},
      ],
    );
    final repository = PlatformRepository(api);

    await repository.ensureOfficialAssignments('tenant-new', _officials);

    expect(api.assignments, {
      'chairperson': 'member-chair',
      'treasurer': 'member-treasurer',
      'secretary': 'member-secretary',
    });
  });

  test('reports offices that cannot be matched to member records', () async {
    final repository = PlatformRepository(
      _OfficialApiClient(members: const []),
    );

    await expectLater(
      repository.ensureOfficialAssignments('tenant-new', _officials),
      throwsA(
        isA<OfficialAssignmentException>().having(
          (error) => error.missingOffices,
          'missing offices',
          containsAll(['chairperson', 'treasurer', 'secretary']),
        ),
      ),
    );
  });

  test('resends an official invitation through the selected channel', () async {
    final api = _OfficialApiClient(members: const []);
    final repository = PlatformRepository(api);

    await repository.resendOfficialInvitation(
      memberId: 'member-treasurer',
      office: 'treasurer',
      deliveryChannel: 'sms',
    );

    expect(api.lastPostPath, '/users/official-staff-access/resend');
    expect(api.lastPostBody, {
      'memberId': 'member-treasurer',
      'office': 'treasurer',
      'deliveryChannel': 'sms',
    });
  });

  test('updates SMS supply cost, selling rate and warning together', () async {
    final api = _OfficialApiClient(members: const []);
    final repository = PlatformRepository(api);

    final summary = await repository.updateSmsInventorySettings(
      providerUnitCost: 35,
      saccoSellingRate: 45,
      lowStockThreshold: 100,
    );

    expect(api.lastPatchPath, '/platform-billing/sms-inventory/settings');
    expect(api.lastPatchBody, {
      'providerUnitCost': 35,
      'saccoSellingRate': 45,
      'lowStockThreshold': 100,
    });
    expect(summary.providerAvailableCredits, 684);
  });
}

const _officials = [
  {'office': 'chairperson', 'fullName': ' Jane   Chair '},
  {'office': 'treasurer', 'fullName': 'John Treasurer'},
  {'office': 'secretary', 'fullName': 'Joan Secretary'},
];

class _OfficialApiClient extends ApiClient {
  _OfficialApiClient({required this.members})
    : super(SessionStore(), dio: Dio());

  final List<Map<String, dynamic>> members;
  final Map<String, String> assignments = {};
  String? lastPostPath;
  Map<String, dynamic>? lastPostBody;
  String? lastPatchPath;
  Map<String, dynamic>? lastPatchBody;

  @override
  Future<List<Map<String, dynamic>>> getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    if (path == '/members/names') return members;
    if (path.endsWith('/officials')) {
      return ['chairperson', 'treasurer', 'secretary']
          .map(
            (office) => {
              'office': office,
              'memberId': assignments[office] ?? '',
              'membershipNo': assignments[office] == null ? '' : 'NEW-0001',
              'fullName': members
                  .where((member) => member['id'] == assignments[office])
                  .map((member) => member['name'])
                  .firstOrNull,
              'validMember': assignments[office] != null,
            },
          )
          .toList();
    }
    return const [];
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    lastPatchPath = path;
    lastPatchBody = body;
    if (path == '/platform-billing/sms-inventory/settings') {
      return {
        'provider': 'afrosms',
        'providerStatus': 'ready',
        'providerBalance': 23955,
        'providerUnitCost': body['providerUnitCost'],
        'saccoSellingRate': body['saccoSellingRate'],
        'providerAvailableCredits': 684,
        'saccoCreditsOutstanding': 0,
        'memberCreditsOutstanding': 0,
        'totalCreditsOutstanding': 0,
        'reserveCredits': 684,
        'lowStockThreshold': body['lowStockThreshold'],
        'grossMarginPerSms': 10,
        'grossMarginPercent': 28.57,
        'totalCreditsSold': 0,
        'totalSalesRevenue': 0,
        'suggestedTopUpAmount': 0,
        'alertLevel': 'ok',
        'alertCode': 'SMS_INVENTORY_HEALTHY',
        'alertMessage': 'SMS inventory is healthy.',
      };
    }
    assignments[path.split('/').last] = '${body['memberId']}';
    return const {};
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    lastPostPath = path;
    lastPostBody = body;
    return const {'deliveryStatus': 'sent'};
  }
}

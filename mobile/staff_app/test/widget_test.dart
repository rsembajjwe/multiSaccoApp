import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/data/push_service.dart';
import 'package:sacco_staff_app/domain/models.dart';
import 'package:sacco_staff_app/features/auth/login_screen.dart';
import 'package:sacco_staff_app/features/branches/branches_screen.dart';
import 'package:sacco_staff_app/features/funds/fund_sources_screen.dart';
import 'package:sacco_staff_app/features/loans/loan_detail_screen.dart';
import 'package:sacco_staff_app/features/reports/regulatory_report_screen.dart';
import 'package:sacco_staff_app/features/settings/settings_screen.dart';
import 'package:sacco_staff_app/features/treasury/cash_book_screen.dart';
import 'package:sacco_staff_app/features/users/users_screen.dart';
import 'package:sacco_staff_app/providers.dart';

class _NoopPushTopics implements StaffPushTopics {
  @override
  Future<String?> deviceToken() async => null;

  @override
  String get platform => 'android';

  @override
  Stream<String> get tokenRefresh => const Stream.empty();

  @override
  Future<void> requestPermission() async {}

  @override
  Future<void> subscribeStaff(String saccoCode) async {}

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {}
}

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'readAll') return <String, String>{};
      return null; // no stored session
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  testWidgets('staff login screen renders its fields', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          pushServiceProvider.overrideWithValue(_NoopPushTopics()),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pump();
    expect(find.text('SACCO Administrator'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(3));
  });

  testWidgets('settings groups detailed controls into focused pages',
      (tester) async {
    const session = StaffSession(
      token: 'token',
      userId: 'chair',
      userName: 'Chairperson',
      email: 'chair@example.com',
      roleNames: ['Chairperson'],
      permissions: [
        'fund-types:manage',
        'loans:terms',
        'subscriptions:view',
      ],
      saccoName: 'Test SACCO',
      tenantId: '',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWith((ref) async => session),
        ],
        child: const MaterialApp(home: SettingsScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('SACCO setup'), findsOneWidget);
    expect(find.text('App preferences'), findsOneWidget);
    expect(find.text('My access'), findsOneWidget);
    expect(find.text('Fund types'), findsNothing);
    expect(find.text('Biometric app lock'), findsNothing);

    await tester.tap(find.text('SACCO setup'));
    await tester.pumpAndSettle();

    expect(find.text('Fund types'), findsOneWidget);
    expect(find.text('Loan interest rate'), findsOneWidget);
    expect(find.text('Subscriptions'), findsOneWidget);
    expect(find.text('SACCO logo'), findsOneWidget);
  });

  testWidgets('manager can open an existing fund type for editing',
      (tester) async {
    const fundType = FundType(
      id: 'fundtype_school_fees',
      code: 'school_fees',
      name: 'School Fees',
      basis: 'savings',
      description: 'Education savings',
      system: false,
      active: true,
      displayOrder: 120,
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          fundTypesProvider.overrideWith((ref) async => [fundType]),
        ],
        child: const MaterialApp(
          home: FundSourcesScreen(canManage: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('School Fees'));
    await tester.pumpAndSettle();

    expect(find.text('Edit fund type'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'School Fees'), findsOneWidget);
    expect(find.text('school_fees'), findsOneWidget);
    expect(find.text('Save changes'), findsOneWidget);
  });

  testWidgets('chairperson sees pending loan warning and decision action',
      (tester) async {
    const session = StaffSession(
      token: 'token',
      userId: 'chair',
      userName: 'Chairperson',
      email: 'chair@example.com',
      roleNames: ['Chairperson'],
      permissions: ['loans:view', 'loans:approve'],
      saccoName: 'Test SACCO',
      tenantId: 'tenant_test',
    );
    const loan = Loan(
      id: 'loan_pending',
      memberId: 'member_1',
      product: 'Development Loan',
      amount: 500000,
      balance: 0,
      interestRate: 10,
      interestAmount: 50000,
      chargeFee: 0,
      totalPayable: 550000,
      monthlyInstallment: 45833,
      status: 'submitted',
      stage: 'Submitted',
      repayments: 0,
      repaymentTotal: 0,
      scheduledInstallments: 12,
      paidInstallments: 0,
      arrearsInstallments: 0,
      arrearsAmount: 0,
      nextDueDate: '',
      repaymentMonths: 12,
      disbursedAt: '',
      createdAt: '2026-11-11T10:00:00Z',
      purpose: 'Business expansion',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWith((ref) async => session),
          loanRepaymentsProvider.overrideWith((ref, id) async => []),
          loanExtensionsProvider.overrideWith((ref, id) async => []),
          loanRecoveriesProvider.overrideWith((ref, id) async => []),
        ],
        child: const MaterialApp(home: LoanDetailScreen(loan: loan)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('This loan is awaiting your approval decision.'),
        findsOneWidget);
    expect(find.text('Outstanding balance'), findsOneWidget);
    expect(find.text('Approve or reject loan'), findsOneWidget);

    await tester.tap(find.text('Approve or reject loan'));
    await tester.pumpAndSettle();

    expect(find.text('Loan approval decision'), findsOneWidget);
    expect(find.text('Approve'), findsOneWidget);
    expect(find.text('Reject'), findsOneWidget);
  });

  testWidgets('users screen only builds tabs allowed by permissions',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          rolesProvider.overrideWith((ref) async => const <AppRole>[]),
        ],
        child: const MaterialApp(
          home: UsersScreen(
            canViewUsers: false,
            canManageUsers: false,
            canViewRoles: true,
            canCreateRoles: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Roles'), findsNothing);
    expect(find.text('No roles defined.'), findsOneWidget);
    expect(find.text('Staff'), findsNothing);
  });

  testWidgets('user manager can start staff account creation', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          usersProvider.overrideWith((ref) async => const <AppUser>[]),
        ],
        child: const MaterialApp(
          home: UsersScreen(
            canViewUsers: true,
            canManageUsers: true,
            canViewRoles: false,
            canCreateRoles: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Add staff account'), findsOneWidget);
    await tester.tap(find.text('Add staff account'));
    await tester.pumpAndSettle();

    expect(
        find.widgetWithText(AlertDialog, 'Add staff account'), findsOneWidget);
    expect(find.text('Email'), findsWidgets);
    expect(find.text('SMS'), findsOneWidget);
    expect(find.text('Temporary password'), findsNothing);
  });

  testWidgets('role manager can select permissions for a custom role',
      (tester) async {
    const permission = AppPermission(
      id: 'members:view',
      module: 'members',
      action: 'view',
      description: 'View SACCO members.',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          rolesProvider.overrideWith((ref) async => const <AppRole>[]),
          permissionsCatalogProvider
              .overrideWith((ref) async => const [permission]),
        ],
        child: const MaterialApp(
          home: UsersScreen(
            canViewUsers: false,
            canManageUsers: false,
            canViewRoles: true,
            canCreateRoles: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create custom role'));
    await tester.pumpAndSettle();

    expect(find.text('Role name'), findsOneWidget);
    expect(find.text('members'), findsOneWidget);
    expect(find.text('Create role'), findsOneWidget);
  });

  testWidgets('role manager can edit a custom role', (tester) async {
    const permission = AppPermission(
      id: 'members:view',
      module: 'members',
      action: 'view',
      description: 'View members',
    );
    const role = AppRole(
      id: 'role_reviewer',
      name: 'Member Reviewer',
      protectedRole: false,
      permissionIds: ['members:view'],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          rolesProvider.overrideWith((ref) async => const [role]),
          permissionsCatalogProvider
              .overrideWith((ref) async => const [permission]),
        ],
        child: const MaterialApp(
          home: UsersScreen(
            canViewUsers: false,
            canManageUsers: false,
            canViewRoles: true,
            canCreateRoles: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Member Reviewer'));
    await tester.pumpAndSettle();

    expect(find.text('Edit custom role'), findsOneWidget);
    expect(find.text('Save changes'), findsOneWidget);
    expect(find.byType(Checkbox), findsWidgets);
  });

  testWidgets('branch manager can open branch creation form', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          branchesProvider.overrideWith((ref) async => const <Branch>[]),
          usersProvider.overrideWith((ref) async => const <AppUser>[]),
        ],
        child: const MaterialApp(home: BranchesScreen(canManage: true)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Add branch'));
    await tester.pumpAndSettle();

    expect(find.text('Branch code'), findsOneWidget);
    expect(find.text('Branch name'), findsOneWidget);
    expect(find.text('Create branch'), findsOneWidget);
  });

  testWidgets('branch manager can edit and deactivate a branch',
      (tester) async {
    const branch = Branch(
      id: 'branch_kla',
      code: 'KLA',
      name: 'Kampala Branch',
      address: 'Kampala',
      managerUserId: '',
      status: 'active',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          branchesProvider.overrideWith((ref) async => const [branch]),
          usersProvider.overrideWith((ref) async => const <AppUser>[]),
        ],
        child: const MaterialApp(home: BranchesScreen(canManage: true)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Kampala Branch'));
    await tester.pumpAndSettle();

    expect(find.text('Edit branch'), findsOneWidget);
    expect(find.text('Status'), findsOneWidget);
    expect(find.text('Save changes'), findsOneWidget);
  });

  testWidgets('treasurer can open cash loan repayment capture', (tester) async {
    const cashBook = CashBook(
      cashOnHand: 0,
      totalIn: 0,
      totalOut: 0,
      entries: [],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cashBookProvider.overrideWith((ref) async => cashBook),
        ],
        child: const MaterialApp(
          home: CashBookScreen(canManage: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Record'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Loan repayment'));
    await tester.pumpAndSettle();

    expect(find.text('Tap to search & select a member'), findsOneWidget);
    expect(find.text('Receipt reference (optional)'), findsOneWidget);
    expect(find.text('Post repayment'), findsOneWidget);
  });

  testWidgets('regulatory report shows compliance snapshot and CSV export',
      (tester) async {
    final report = RegulatoryReport.fromJson({
      'generatedAt': '2026-11-11T10:00:00Z',
      'period': '2026-11',
      'csv': '"tenant","members"\n"Test SACCO","10"',
      'consolidated': {
        'tenantName': 'Test SACCO',
        'memberCount': 10,
        'activeMembers': 9,
        'savings': 1000000,
        'shares': 500000,
        'welfare': 100000,
        'loanPortfolio': 750000,
        'activeLoans': 3,
        'loansAtRisk': 250000,
        'parPercent': 33,
        'expenseTotal': 50000,
        'assetCost': 200000,
        'assetNetBookValue': 180000,
        'journalEntries': 20,
        'unbalancedJournalEntries': 0,
        'reconciliationExceptions': 2,
        'openComplaints': 1,
        'openResolutions': 1,
        'complianceStatus': 'review',
        'dataProtectionEvidence': {
          'privacyRequests': 2,
          'openPrivacyRequests': 1,
          'completedPrivacyRequests': 1,
          'kycDocuments': 10,
          'kycDocumentsReviewDue': 2,
          'kycDocumentsDisposed': 1,
          'kycStorageActions': 1,
          'evidenceStatus': 'review',
        },
      },
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          regulatoryReportProvider.overrideWith((ref) async => report),
        ],
        child: const MaterialApp(home: RegulatoryReportScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Regulatory snapshot'), findsOneWidget);
    expect(find.text('2026-11'), findsOneWidget);
    expect(find.text('Copy CSV export'), findsOneWidget);
    expect(find.text('Review'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('33%'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('33%'), findsOneWidget);
  });
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/data/push_service.dart';
import 'package:sacco_staff_app/data/app_version_service.dart';
import 'package:sacco_staff_app/domain/models.dart';
import 'package:sacco_staff_app/features/auth/login_screen.dart';
import 'package:sacco_staff_app/features/branches/branches_screen.dart';
import 'package:sacco_staff_app/features/funds/fund_sources_screen.dart';
import 'package:sacco_staff_app/features/loans/loan_detail_screen.dart';
import 'package:sacco_staff_app/features/members/member_detail_screen.dart';
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
          appVersionPolicyProvider.overrideWith((ref) async => null),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pump();
    expect(find.text('SACCO Administrator'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(3));
  });

  testWidgets('staff can show and hide the login password', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          pushServiceProvider.overrideWithValue(_NoopPushTopics()),
          appVersionPolicyProvider.overrideWith((ref) async => null),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pump();

    final passwordField = find.byType(TextField).last;
    expect(tester.widget<TextField>(passwordField).obscureText, isTrue);
    await tester.tap(find.byTooltip('Show password'));
    await tester.pump();
    expect(tester.widget<TextField>(passwordField).obscureText, isFalse);
    expect(find.byTooltip('Hide password'), findsOneWidget);
  });

  testWidgets('unsupported staff build blocks login', (tester) async {
    const policy = AppVersionPolicy(
      currentVersionCode: 24,
      minimumVersionCode: 25,
      latestVersionCode: 26,
      upgradeRequired: true,
      updateAvailable: true,
      updateUrl: 'https://example.test/staff.apk',
      message: 'Install the approved update.',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          pushServiceProvider.overrideWithValue(_NoopPushTopics()),
          appVersionPolicyProvider.overrideWith((ref) async => policy),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Staff app update required'), findsOneWidget);
    expect(find.text('Install the approved update.'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('member profile shows complete loan and guarantee exposure',
      (tester) async {
    const member = Member(
      id: 'member-1',
      branchId: 'branch-1',
      nationalId: 'CM123',
      membershipNo: 'M-001',
      fullName: 'Prossy Member',
      memberType: 'individual',
      phone: '+256700000001',
      whatsapp: '',
      email: 'prossy@example.com',
      address: '',
      status: 'active',
      kycStatus: 'verified',
      joiningDate: '2026-01-01',
      savings: 300000,
      shares: 50000,
      welfare: 10000,
      loanBalance: 125000,
      loanStatus: 'active',
      guaranteedLoanBalance: 50000,
      guaranteeCapacity: 250000,
    );
    const exposure = MemberLoanExposure(
      memberId: 'member-1',
      fullName: 'Prossy Member',
      membershipNo: 'M-001',
      status: 'active',
      savings: 300000,
      shares: 50000,
      welfare: 10000,
      openLoanCount: 1,
      openLoanBalance: 125000,
      guaranteedLoanBalance: 50000,
      guaranteeCeiling: 300000,
      committedGuarantees: 50000,
      guaranteeCapacity: 250000,
      guaranteeLabels: ['Guaranteed for George — UGX 50,000'],
      openLoan: null,
    );
    const session = StaffSession(
      token: 'token',
      userId: 'treasurer',
      userName: 'Treasurer',
      email: 'treasurer@example.com',
      phone: '+256700000002',
      roleNames: ['Treasurer'],
      permissions: ['members:view', 'loans:view'],
      saccoName: 'Test SACCO',
      tenantId: 'tenant-test',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWith((ref) async => session),
          memberProvider.overrideWith((ref, id) async => member),
          memberLoanExposureProvider.overrideWith((ref, id) async => exposure),
          memberLoansProvider.overrideWith((ref, id) async => const <Loan>[]),
          memberFundBalancesProvider
              .overrideWith((ref) async => const <MemberFundBalance>[]),
          fundTypesProvider.overrideWith((ref) async => const <FundType>[]),
        ],
        child: const MaterialApp(
          home: MemberDetailScreen(memberId: 'member-1'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Financial standing'), findsOneWidget);
    expect(
        find.text('Active for loan and guarantee workflows'), findsOneWidget);
    expect(find.text('Total loan exposure'), findsOneWidget);
    expect(find.text('UGX 175,000'), findsOneWidget);
    expect(find.text('Guarantee commitments'), findsOneWidget);
    expect(find.textContaining('Guaranteed for George'), findsOneWidget);
  });

  testWidgets('settings groups detailed controls into focused pages',
      (tester) async {
    const session = StaffSession(
      token: 'token',
      userId: 'chair',
      userName: 'Chairperson',
      email: 'chair@example.com',
      phone: '+256700000001',
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
      phone: '+256700000001',
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

    await tester.tap(find.text('Post repayment'));
    await tester.pump();

    expect(
      find.text('Complete the highlighted repayment fields before posting.'),
      findsOneWidget,
    );
  });

  testWidgets('cash movement keeps validation feedback inside the form',
      (tester) async {
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
    await tester.tap(find.text('Cash movement'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Record entry'));
    await tester.tap(find.text('Record entry'));
    await tester.pump();

    expect(
      find.text('Complete the highlighted cash fields before posting.'),
      findsOneWidget,
    );
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

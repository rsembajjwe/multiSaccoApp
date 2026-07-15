class SaccoApiContract {
  static const basePath = '/api/v1';
  static const emulatorBaseUrl = 'http://10.0.2.2:5173/api/v1';

  static const memberLogin = '$basePath/member-auth/login';
  static const memberDashboard = '$basePath/member-auth/mobile-dashboard';
  static const memberNotifications = '$basePath/member-auth/notifications';
  static const memberMobileLoans = '$basePath/member-auth/mobile-loans';
  static const memberMobileComplaints = '$basePath/member-auth/mobile-complaints';
  static const memberGuarantorRequests = '$basePath/member-auth/guarantor-requests';
  static const mobileMoneyCallback = '$basePath/integrations/mobile-money/callback';
}

class MemberDashboardSummary {
  const MemberDashboardSummary({
    required this.memberName,
    required this.savings,
    required this.shares,
    required this.welfare,
    required this.loanBalance,
    required this.notificationCount,
    required this.lastUpdatedAt,
    required this.serverConfirmed,
  });

  final String memberName;
  final int savings;
  final int shares;
  final int welfare;
  final int loanBalance;
  final int notificationCount;
  final String lastUpdatedAt;
  final bool serverConfirmed;
}

/// Member-facing API endpoint paths. To be replaced by a client generated from
/// `openapi.yaml` in CI (see the development plan).
class ApiPaths {
  const ApiPaths._();

  static const login = '/member-auth/login';
  static const groupRegistrations = '/public/group-registrations';
  static const logout = '/member-auth/logout';
  static const me = '/member-auth/me';
  static const dashboard = '/member-auth/mobile-dashboard';
  static const notifications = '/member-auth/notifications';
  static const statement = '/member-auth/statement';
  static const fundBalances = '/member-auth/fund-balances';
  static const passwordResetRequest = '/member-auth/password-reset/request';
  static const passwordResetConfirm = '/member-auth/password-reset/confirm';
  static const mobileComplaints = '/member-auth/mobile-complaints';
  static const complaints = '/member-auth/complaints';
  static const governanceMeetings = '/member-auth/governance-meetings';
  static const membership = '/member-auth/membership';
  static const profilePhoto = '/member-auth/profile-photo';
  static const profileUpdate = '/member-auth/profile';
  static String loanRepayments(String loanId) =>
      '/member-auth/loans/$loanId/repayments';
  static const loanProducts = '/member-auth/loan-products';
  static const mobileLoans = '/member-auth/mobile-loans';
  static const guarantorRequests = '/member-auth/guarantor-requests';
  static const mobileMoneyPaymentRequests =
      '/integrations/mobile-money/payment-requests';
  static String mobileMoneyProviderStatus(String requestId) =>
      '$mobileMoneyPaymentRequests/$requestId/provider-status';
}

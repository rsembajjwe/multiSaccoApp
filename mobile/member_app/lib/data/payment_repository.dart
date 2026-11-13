import '../api_contract.dart';
import '../core/mobile_money.dart';
import '../domain/models.dart';
import 'api_client.dart';

class PaymentRepository {
  PaymentRepository(this._api);

  final ApiClient _api;

  Future<List<MobileMoneyPayment>> history() async {
    final rows = await _api.getList(ApiPaths.mobileMoneyPaymentRequests);
    return rows.map(MobileMoneyPayment.fromJson).toList();
  }

  /// Initiates a mobile-money collection. The backend calls the provider
  /// (MTN/Airtel/M-Pesa) and returns a pending request; the STK push happens
  /// on the payer's phone. Poll [history] for status.
  Future<MobileMoneyPayment> request({
    required PaymentPurpose purpose,
    required num amount,
    required MobileMoneyNetwork network,
    String? payerPhone,
    String? loanId,
  }) async {
    String? normalizedPhone;
    if (payerPhone != null && payerPhone.trim().isNotEmpty) {
      normalizedPhone = normalizeUgandanMobileNumber(payerPhone);
      if (normalizedPhone == null) {
        throw ApiException(
            'Enter a valid Ugandan mobile number, for example 0772123456.');
      }
      final networkError = validateMobileMoneyNetwork(normalizedPhone, network);
      if (networkError != null) throw ApiException(networkError);
    }
    final data = await _api.post(ApiPaths.mobileMoneyPaymentRequests, {
      'purpose': purpose.value,
      'amount': amount,
      'provider': network.value,
      if (normalizedPhone != null) 'payerPhone': normalizedPhone,
      if (loanId != null && loanId.isNotEmpty) 'loanId': loanId,
    });
    return MobileMoneyPayment.fromJson(data);
  }

  /// Queries the mobile-money provider and returns the backend's refreshed
  /// request state. The endpoint enforces member ownership of [id].
  Future<MobileMoneyPayment?> statusOf(String id) async {
    final data = await _api.get(ApiPaths.mobileMoneyProviderStatus(id));
    return MobileMoneyPayment.fromJson(data);
  }
}

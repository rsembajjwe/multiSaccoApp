import '../api_contract.dart';
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
    String? payerPhone,
    String? loanId,
  }) async {
    final data = await _api.post(ApiPaths.mobileMoneyPaymentRequests, {
      'purpose': purpose.value,
      'amount': amount,
      if (payerPhone != null && payerPhone.isNotEmpty) 'payerPhone': payerPhone,
      if (loanId != null && loanId.isNotEmpty) 'loanId': loanId,
    });
    return MobileMoneyPayment.fromJson(data);
  }

  /// Re-reads history and returns the request with [id], or null if not found.
  Future<MobileMoneyPayment?> statusOf(String id) async {
    final list = await history();
    for (final p in list) {
      if (p.id == id) return p;
    }
    return null;
  }
}

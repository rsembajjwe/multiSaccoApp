import 'api_client.dart';

class SmsWallet {
  const SmsWallet({required this.balance, required this.unitPrice});
  final int balance;
  final num unitPrice;

  factory SmsWallet.fromJson(Map<String, dynamic> json) => SmsWallet(
    balance: (json['balance'] as num?)?.toInt() ?? 0,
    unitPrice: json['unitPrice'] as num? ?? 0,
  );
}

class SmsRepository {
  const SmsRepository(this._api);
  final ApiClient _api;

  Future<SmsWallet> wallet() async => SmsWallet.fromJson(await _api.get('/member-auth/sms/wallet'));

  Future<Map<String, dynamic>> send({required List<String> recipients, required String message}) =>
      _api.post('/member-auth/sms/broadcast', {'recipients': recipients, 'message': message.trim()});

  Future<void> buy({required int credits, required String payerPhone, required String provider}) async {
    await _api.post('/integrations/mobile-money/sms-payment-requests/member', {
      'smsCount': credits,
      'payerPhone': payerPhone.trim(),
      'provider': provider,
    });
  }
}

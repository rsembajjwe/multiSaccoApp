import '../domain/models.dart';

String? normalizeUgandanMobileNumber(String value) {
  var phone = value.replaceAll(RegExp(r'[\s()-]'), '');
  if (phone.startsWith('0') && phone.length == 10) {
    phone = '+256${phone.substring(1)}';
  } else if (phone.startsWith('256') && phone.length == 12) {
    phone = '+$phone';
  }
  return RegExp(r'^\+256\d{9}$').hasMatch(phone) ? phone : null;
}

String? validateMobileMoneyNetwork(
  String normalizedPhone,
  MobileMoneyNetwork network,
) {
  final prefix = normalizedPhone.substring(4, 6);
  const mtnPrefixes = {'76', '77', '78'};
  const airtelPrefixes = {'70', '74', '75'};
  if (network == MobileMoneyNetwork.mtn && airtelPrefixes.contains(prefix)) {
    return 'This number appears to be Airtel. Select Airtel or enter an MTN number.';
  }
  if (network == MobileMoneyNetwork.airtel && mtnPrefixes.contains(prefix)) {
    return 'This number appears to be MTN. Select MTN or enter an Airtel number.';
  }
  return null;
}

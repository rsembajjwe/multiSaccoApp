import 'dart:typed_data';

import '../api_contract.dart';
import '../domain/models.dart';
import 'api_client.dart';

class ProfileRepository {
  ProfileRepository(this._api);

  final ApiClient _api;

  static const _prefsPath = '/member-auth/notification-preferences';

  Future<MemberProfile> me() async {
    final data = await _api.get(ApiPaths.me);
    return MemberProfile.fromJson(data);
  }

  /// Channel -> enabled map (email, sms, push, whatsapp), parsed defensively.
  Future<Map<String, bool>> channels() async {
    final data = await _api.get(_prefsPath);
    final src = (data['channels'] as Map<String, dynamic>?) ?? data;
    final out = <String, bool>{};
    src.forEach((k, v) {
      if (v is bool) {
        out[k] = v;
      } else if (v is Map && v['enabled'] is bool) {
        out[k] = v['enabled'] as bool;
      }
    });
    return out;
  }

  Future<void> setChannel(String channel, bool enabled) async {
    await _api.put(_prefsPath, {'channel': channel, 'enabled': enabled});
  }

  Future<void> uploadPhoto(String filePath) =>
      _api.uploadFile(ApiPaths.profilePhoto, filePath);

  Future<Uint8List?> photo() => _api.getBytes(ApiPaths.profilePhoto);

  Future<void> updateContact({String? phone, String? whatsapp, String? email}) async {
    await _api.patch(ApiPaths.profileUpdate, {
      if (phone != null) 'phone': phone,
      if (whatsapp != null) 'whatsapp': whatsapp,
      if (email != null) 'email': email,
    });
  }
}

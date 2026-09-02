import '../api_contract.dart';
import '../domain/models.dart';
import 'api_client.dart';

class NotificationRepository {
  NotificationRepository(this._api);

  final ApiClient _api;

  Future<List<MemberNotification>> list() async {
    final rows = await _api.getList(ApiPaths.notifications);
    return rows.map(MemberNotification.fromJson).toList();
  }

  Future<void> acknowledge(String id) async {
    await _api.patch('${ApiPaths.notifications}/$id/acknowledge', const {});
  }
}

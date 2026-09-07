import 'package:firebase_messaging/firebase_messaging.dart';

abstract class StaffPushTopics {
  Future<void> subscribeStaff(String saccoCode);
  Future<void> unsubscribeStaff(String saccoCode);
}

/// Wraps FCM topic subscription for staff. Every staff member of a SACCO
/// subscribes to the topic `staff_<saccoCode>`; the backend can push
/// staff-facing alerts to that topic (no device-token storage needed).
class PushService implements StaffPushTopics {
  final FirebaseMessaging _fm = FirebaseMessaging.instance;

  Future<void> requestPermission() async {
    try {
      await _fm.requestPermission();
    } catch (_) {
      // permission dialog unavailable / Firebase not ready — ignore
    }
  }

  @override
  Future<void> subscribeStaff(String saccoCode) async {
    if (saccoCode.isEmpty) return;
    try {
      await _fm.subscribeToTopic('staff_$saccoCode');
    } catch (_) {}
  }

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {
    if (saccoCode.isEmpty) return;
    try {
      await _fm.unsubscribeFromTopic('staff_$saccoCode');
    } catch (_) {}
  }
}

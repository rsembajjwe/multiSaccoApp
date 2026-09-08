import 'package:firebase_messaging/firebase_messaging.dart';

abstract class StaffPushTopics {
  Future<void> requestPermission();
  Future<void> subscribeStaff(String saccoCode);
  Future<void> unsubscribeStaff(String saccoCode);
}

/// Wraps FCM topic subscription for staff. Every staff member of a SACCO
/// subscribes to the topic `staff_<saccoCode>`; the backend can push
/// staff-facing alerts to that topic (no device-token storage needed).
class PushService implements StaffPushTopics {
  final FirebaseMessaging _fm = FirebaseMessaging.instance;
  static const _pushTimeout = Duration(seconds: 2);

  @override
  Future<void> requestPermission() async {
    try {
      await _fm.requestPermission().timeout(_pushTimeout);
    } catch (_) {
      // Permission dialog unavailable / Firebase not ready; login must continue.
    }
  }

  @override
  Future<void> subscribeStaff(String saccoCode) async {
    if (saccoCode.isEmpty) return;
    try {
      await _fm.subscribeToTopic('staff_$saccoCode').timeout(_pushTimeout);
    } catch (_) {}
  }

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {
    if (saccoCode.isEmpty) return;
    try {
      await _fm.unsubscribeFromTopic('staff_$saccoCode').timeout(_pushTimeout);
    } catch (_) {}
  }
}

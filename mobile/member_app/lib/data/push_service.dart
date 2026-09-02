import 'package:firebase_messaging/firebase_messaging.dart';

/// Wraps FCM topic subscription. Each member subscribes to the topic
/// `member_<id>`; the backend sends pushes to that topic (no device-token
/// storage needed server-side).
class PushService {
  final FirebaseMessaging _fm = FirebaseMessaging.instance;

  Future<void> requestPermission() async {
    try {
      await _fm.requestPermission();
    } catch (_) {
      // permission dialog unavailable / Firebase not ready — ignore
    }
  }

  Future<void> subscribeMember(String memberId) async {
    if (memberId.isEmpty) return;
    try {
      await _fm.subscribeToTopic('member_$memberId');
    } catch (_) {}
  }

  Future<void> unsubscribeMember(String memberId) async {
    if (memberId.isEmpty) return;
    try {
      await _fm.unsubscribeFromTopic('member_$memberId');
    } catch (_) {}
  }
}

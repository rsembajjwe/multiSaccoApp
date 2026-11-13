import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

abstract class StaffPushTopics {
  Future<void> requestPermission();
  Future<void> subscribeStaff(String saccoCode);
  Future<void> unsubscribeStaff(String saccoCode);
  Future<String?> deviceToken() async => null;
  Stream<String> get tokenRefresh => const Stream.empty();
  String get platform => 'android';
}

/// Wraps FCM device registration for authenticated staff notifications.
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
      await _fm.unsubscribeFromTopic('staff_$saccoCode').timeout(_pushTimeout);
    } catch (_) {}
  }

  @override
  Future<void> unsubscribeStaff(String saccoCode) async {
    try {
      await _fm.unsubscribeFromTopic('staff_$saccoCode').timeout(_pushTimeout);
    } catch (_) {}
  }

  @override
  Future<String?> deviceToken() async {
    try {
      return await _fm.getToken().timeout(_pushTimeout);
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<String> get tokenRefresh => _fm.onTokenRefresh;

  @override
  String get platform =>
      defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
}

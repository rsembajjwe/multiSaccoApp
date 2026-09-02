import 'package:flutter/foundation.dart';

/// Flipped to true by the API client when any request returns 401, so the
/// router can bounce the member back to the login screen instead of leaving
/// them stuck on an error state with a dead session.
final ValueNotifier<bool> sessionExpiredNotifier = ValueNotifier<bool>(false);

/// True while the app is showing the biometric lock screen. Guards the
/// inactivity auto-lock so the biometric prompt (which briefly backgrounds
/// the app) cannot trigger a re-lock loop.
final ValueNotifier<bool> appLockedNotifier = ValueNotifier<bool>(false);

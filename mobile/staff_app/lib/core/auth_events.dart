import 'package:flutter/foundation.dart';

/// Set true by the API client on a 401 so the router bounces to login.
final ValueNotifier<bool> sessionExpiredNotifier = ValueNotifier<bool>(false);

/// True while the biometric lock screen is showing. Guards the resume
/// auto-lock so the biometric prompt (which briefly backgrounds the app)
/// cannot trigger a re-lock loop.
final ValueNotifier<bool> appLockedNotifier = ValueNotifier<bool>(false);

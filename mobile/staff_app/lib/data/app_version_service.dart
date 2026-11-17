import 'dart:io';

import 'package:flutter/services.dart';

import 'api_client.dart';

class AppVersionPolicy {
  const AppVersionPolicy({
    required this.currentVersionCode,
    required this.minimumVersionCode,
    required this.latestVersionCode,
    required this.upgradeRequired,
    required this.updateAvailable,
    required this.updateUrl,
    required this.message,
  });

  final int currentVersionCode;
  final int minimumVersionCode;
  final int latestVersionCode;
  final bool upgradeRequired;
  final bool updateAvailable;
  final String updateUrl;
  final String message;

  factory AppVersionPolicy.fromJson(Map<String, dynamic> json) {
    int number(String key) => (json[key] as num?)?.toInt() ?? 0;
    return AppVersionPolicy(
      currentVersionCode: number('currentVersionCode'),
      minimumVersionCode: number('minimumVersionCode'),
      latestVersionCode: number('latestVersionCode'),
      upgradeRequired: json['upgradeRequired'] == true,
      updateAvailable: json['updateAvailable'] == true,
      updateUrl: '${json['updateUrl'] ?? ''}'.trim(),
      message: '${json['message'] ?? ''}'.trim(),
    );
  }
}

class AppVersionService {
  AppVersionService(
    this._api, {
    Future<int> Function()? buildNumberLoader,
    String? platform,
  })  : _buildNumberLoader = buildNumberLoader ?? _loadBuildNumber,
        _platform = platform ?? (Platform.isIOS ? 'ios' : 'android');

  static const _appInfoChannel = MethodChannel(
    'com.methaltech.sacco_staff_app/app_info',
  );

  final ApiClient _api;
  final Future<int> Function() _buildNumberLoader;
  final String _platform;

  static Future<int> _loadBuildNumber() async {
    return await _appInfoChannel.invokeMethod<int>('getBuildNumber') ?? 0;
  }

  Future<AppVersionPolicy?> check() async {
    try {
      final versionCode = await _buildNumberLoader();
      if (versionCode < 1) return null;
      final data = await _api.get(
        '/mobile-app-policy',
        query: {
          'app': 'staff',
          'platform': _platform,
          'versionCode': versionCode,
        },
      );
      return AppVersionPolicy.fromJson(data);
    } catch (_) {
      // Availability failures must not prevent already-approved versions from
      // reaching login. The server remains authoritative when it responds.
      return null;
    }
  }
}

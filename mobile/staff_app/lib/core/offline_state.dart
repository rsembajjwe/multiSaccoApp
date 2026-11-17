import 'package:flutter/foundation.dart';

class OfflineReadState {
  const OfflineReadState({
    required this.path,
    required this.cachedAt,
  });

  final String path;
  final DateTime cachedAt;
}

final offlineReadNotifier = ValueNotifier<OfflineReadState?>(null);

import 'package:flutter/material.dart';

import '../offline_state.dart';

class OfflineReadBanner extends StatelessWidget {
  const OfflineReadBanner({super.key, required this.state});

  final OfflineReadState state;

  @override
  Widget build(BuildContext context) {
    final local = state.cachedAt.toLocal();
    final time = TimeOfDay.fromDateTime(local).format(context);
    return Semantics(
      liveRegion: true,
      label: 'Offline. Showing saved data from $time.',
      child: Material(
        color: Theme.of(context).colorScheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              const Icon(Icons.cloud_off_outlined),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Offline — showing encrypted data saved at $time. Posting requires a connection.',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

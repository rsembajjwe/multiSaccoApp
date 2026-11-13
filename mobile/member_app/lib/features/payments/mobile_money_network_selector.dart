import 'package:flutter/material.dart';

import '../../domain/models.dart';

class MobileMoneyNetworkSelector extends StatelessWidget {
  const MobileMoneyNetworkSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final MobileMoneyNetwork value;
  final ValueChanged<MobileMoneyNetwork> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<MobileMoneyNetwork>(
      segments: MobileMoneyNetwork.values
          .map((network) => ButtonSegment(
                value: network,
                label: Text(network.label),
              ))
          .toList(),
      selected: {value},
      onSelectionChanged: (selection) => onChanged(selection.first),
    );
  }
}

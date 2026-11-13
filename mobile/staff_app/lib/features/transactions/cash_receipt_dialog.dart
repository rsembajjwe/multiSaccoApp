import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/format.dart';

Future<void> showCashReceipt(
  BuildContext context, {
  required String title,
  required String memberName,
  required String item,
  required num amount,
  required String reference,
  required String status,
}) async {
  final receipt = [
    'TEREKA SACCO RECEIPT',
    title,
    'Member: $memberName',
    'Item: $item',
    'Amount: ${Fmt.money(amount)}',
    'Reference: $reference',
    'Status: $status',
    'Date: ${Fmt.dateTime(DateTime.now().toIso8601String())}',
  ].join('\n');

  await showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      icon: const Icon(Icons.receipt_long_outlined),
      title: Text(title),
      content: SelectableText(receipt),
      actions: [
        TextButton.icon(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: receipt));
            if (dialogContext.mounted) {
              ScaffoldMessenger.of(dialogContext).showSnackBar(
                const SnackBar(content: Text('Receipt copied.')),
              );
            }
          },
          icon: const Icon(Icons.copy_outlined),
          label: const Text('Copy receipt'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('Done'),
        ),
      ],
    ),
  );
}

import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfx/pdfx.dart';

import '../../core/format.dart';
import '../../core/widgets/error_retry.dart';
import '../../providers.dart';

/// Views a member KYC document. Images render inline (pinch to zoom) and
/// PDFs render page-by-page with pinch-zoom.
class DocumentViewerScreen extends ConsumerWidget {
  const DocumentViewerScreen({
    super.key,
    required this.memberId,
    required this.documentId,
    required this.title,
  });

  final String memberId;
  final String documentId;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (memberId, documentId);
    final async = ref.watch(memberDocumentContentProvider(key));
    return Scaffold(
      appBar: AppBar(title: Text(Fmt.label(title))),
      backgroundColor: Colors.black,
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(
          message: 'Could not load this document.',
          detail: '$e',
          onRetry: () => ref.invalidate(memberDocumentContentProvider(key)),
        ),
        data: (doc) {
          if (doc.isImage) {
            return InteractiveViewer(
              minScale: 0.5,
              maxScale: 5,
              child: Center(
                child: Image.memory(
                  Uint8List.fromList(doc.bytes),
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const _Notice(
                      icon: Icons.broken_image_outlined,
                      text: 'This image could not be displayed.'),
                ),
              ),
            );
          }
          if (doc.isPdf) {
            return _PdfView(bytes: Uint8List.fromList(doc.bytes));
          }
          return const _Notice(
              icon: Icons.description_outlined,
              text: 'This document type can\'t be previewed in-app.');
        },
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 56, color: Colors.white70),
              const SizedBox(height: 16),
              Text(text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70)),
            ],
          ),
        ),
      );
}

class _PdfView extends StatefulWidget {
  const _PdfView({required this.bytes});
  final Uint8List bytes;

  @override
  State<_PdfView> createState() => _PdfViewState();
}

class _PdfViewState extends State<_PdfView> {
  late final PdfControllerPinch _controller;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = PdfControllerPinch(
      document: PdfDocument.openData(widget.bytes),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return const _Notice(
        icon: Icons.picture_as_pdf_outlined,
        text: 'This PDF could not be opened.',
      );
    }
    return PdfViewPinch(
      controller: _controller,
      onDocumentError: (_) {
        if (mounted) setState(() => _failed = true);
      },
    );
  }
}

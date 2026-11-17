import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../../providers.dart';

class SmsScreen extends ConsumerStatefulWidget {
  const SmsScreen({super.key});
  @override
  ConsumerState<SmsScreen> createState() => _SmsScreenState();
}

class _SmsScreenState extends ConsumerState<SmsScreen> {
  static const _contactsChannel = MethodChannel('com.methaltech.tereka/contacts');
  final _message = TextEditingController();
  final List<_PhoneContact> _contacts = [];
  final Set<String> _selected = {};
  bool _loadingContacts = false;
  bool _sending = false;
  String? _error;

  @override
  void dispose() { _message.dispose(); super.dispose(); }

  Future<void> _loadContacts() async {
    setState(() { _loadingContacts = true; _error = null; });
    try {
      final contacts = await _contactsChannel.invokeListMethod<dynamic>('getPhoneContacts') ?? const [];
      final rows = contacts.whereType<Map>().map((contact) => _PhoneContact(
        '${contact['name'] ?? 'Contact'}', '${contact['phone'] ?? ''}'.trim(),
      )).where((contact) => contact.phone.isNotEmpty).toList();
      rows.sort((a, b) => a.name.compareTo(b.name));
      if (mounted) setState(() { _contacts..clear()..addAll(rows); });
    } on PlatformException catch (error) {
      if (mounted) setState(() => _error = error.message ?? 'Could not read phone contacts.');
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally { if (mounted) setState(() => _loadingContacts = false); }
  }

  Future<void> _send() async {
    if (_selected.isEmpty || _message.text.trim().isEmpty) { setState(() => _error = 'Select at least one contact and enter a message.'); return; }
    setState(() { _sending = true; _error = null; });
    try {
      final result = await ref.read(smsRepositoryProvider).send(recipients: _selected.toList(), message: _message.text);
      ref.invalidate(smsWalletProvider);
      if (!mounted) return;
      _message.clear(); setState(() => _selected.clear());
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${result['sent'] ?? 0} SMS recipient(s) reached. Balance: ${result['balance'] ?? 0}.')));
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally { if (mounted) setState(() => _sending = false); }
  }

  Future<void> _buy() async {
    final credits = TextEditingController(text: '20');
    final phone = TextEditingController();
    String provider = 'mtn_momo';
    final accepted = await showDialog<bool>(context: context, builder: (context) => StatefulBuilder(builder: (context, setDialogState) => AlertDialog(
      title: const Text('Buy SMS credits'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: credits, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Number of SMS credits')),
        const SizedBox(height: 12),
        TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Mobile-money phone', hintText: '+256 700 123456')),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(initialValue: provider, decoration: const InputDecoration(labelText: 'Network'), items: const [
          DropdownMenuItem(value: 'mtn_momo', child: Text('MTN Mobile Money')),
          DropdownMenuItem(value: 'airtel_money', child: Text('Airtel Money')),
        ], onChanged: (value) => setDialogState(() => provider = value ?? provider)),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Request payment'))],
    )));
    if (accepted == true) {
      try {
        await ref.read(smsRepositoryProvider).buy(credits: int.tryParse(credits.text) ?? 0, payerPhone: phone.text, provider: provider);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Approve the mobile-money prompt. Credits appear after payment confirmation.')));
      } catch (error) { if (mounted) setState(() => _error = '$error'); }
    }
    credits.dispose(); phone.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(smsWalletProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Send SMS'), actions: [IconButton(onPressed: _buy, tooltip: 'Buy credits', icon: const Icon(Icons.add_card))]),
      body: SafeArea(child: Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          wallet.when(data: (value) => Text('SMS balance: ${value.balance}  •  ${value.unitPrice} per credit', style: Theme.of(context).textTheme.titleMedium), loading: () => const LinearProgressIndicator(), error: (_, __) => const Text('SMS balance unavailable')),
          const SizedBox(height: 12),
          TextField(controller: _message, maxLength: 459, maxLines: 4, decoration: const InputDecoration(labelText: 'Message', helperText: 'Long messages use more than one credit per recipient.')),
          Row(children: [Expanded(child: OutlinedButton.icon(onPressed: _loadingContacts ? null : _loadContacts, icon: const Icon(Icons.contacts), label: Text(_loadingContacts ? 'Loading contacts…' : 'Select phone contacts'))), const SizedBox(width: 12), FilledButton(onPressed: _sending ? null : _send, child: const Text('Send'))]),
          if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
          Padding(padding: const EdgeInsets.only(top: 8), child: Text('${_selected.length} contact(s) selected. Contacts remain on this device; only selected phone numbers are sent.')),
        ])),
        Expanded(child: _contacts.isEmpty ? const Center(child: Text('Load contacts to choose SMS recipients.')) : ListView.builder(itemCount: _contacts.length, itemBuilder: (_, index) {
          final contact = _contacts[index];
          return CheckboxListTile(value: _selected.contains(contact.phone), title: Text(contact.name), subtitle: Text(contact.phone), onChanged: (value) => setState(() { if (value == true) { _selected.add(contact.phone); } else { _selected.remove(contact.phone); } }));
        })),
      ])),
    );
  }
}

class _PhoneContact { const _PhoneContact(this.name, this.phone); final String name; final String phone; }

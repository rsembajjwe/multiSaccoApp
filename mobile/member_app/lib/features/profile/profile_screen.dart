import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../providers.dart';
import '../../domain/models.dart';
import '../subscription/subscription_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final channels = ref.watch(notificationChannelsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load your profile.'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(profileProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (p) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Center(
              child: _ProfileAvatar(
                  initial:
                      p.fullName.isNotEmpty ? p.fullName[0].toUpperCase() : '?'),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(p.fullName, style: Theme.of(context).textTheme.titleLarge),
            ),
            const SizedBox(height: 16),
            Card(
              child: Column(
                children: [
                  if (p.membershipNo != null)
                    _row(context, 'Membership no.', p.membershipNo!),
                  if (p.phone != null) _row(context, 'Phone', p.phone!),
                  if (p.whatsapp != null) _row(context, 'WhatsApp', p.whatsapp!),
                  if (p.email != null) _row(context, 'Email', p.email!),
                  if (p.status != null) _row(context, 'Status', p.status!),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Edit contact details'),
                subtitle: const Text('Phone, WhatsApp and email'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => _ContactEditSheet(profile: p),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: const Icon(Icons.sms_outlined),
                title: const Text('Personal SMS'),
                subtitle: const Text('Buy credits and message selected phone contacts'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/sms'),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: const Icon(Icons.card_membership_outlined),
                title: const Text('My subscription'),
                subtitle: const Text('View status and pay dues'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('Notification channels',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            channels.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => const ListTile(
                title: Text('Notification settings unavailable'),
              ),
              data: (map) => Card(
                child: Column(
                  children: map.entries
                      .map((e) => SwitchListTile(
                            title: Text(_channelLabel(e.key)),
                            value: e.value,
                            onChanged: (val) async {
                              await ref
                                  .read(profileRepositoryProvider)
                                  .setChannel(e.key, val);
                              ref.invalidate(notificationChannelsProvider);
                            },
                          ))
                      .toList(),
                ),
              ),
            ),
            if (ref.watch(biometricSupportedProvider).value ?? false) ...[
              const SizedBox(height: 24),
              Text('Security', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Card(
                child: SwitchListTile(
                  title: const Text('Require biometric unlock'),
                  subtitle:
                      const Text('Ask for fingerprint or face when reopening the app'),
                  value: ref.watch(biometricLockProvider).value ?? false,
                  onChanged: (val) async {
                    if (val) {
                      final ok =
                          await ref.read(biometricServiceProvider).authenticate();
                      if (!ok) return;
                    }
                    await ref.read(sessionStoreProvider).setBiometricLock(val);
                    ref.invalidate(biometricLockProvider);
                  },
                ),
              ),
            ],
            const SizedBox(height: 24),
            OutlinedButton.icon(
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
              onPressed: () async {
                await ref.read(memberRepositoryProvider).logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value) => ListTile(
        dense: true,
        title: Text(label, style: Theme.of(context).textTheme.bodySmall),
        subtitle: Text(value, style: Theme.of(context).textTheme.bodyLarge),
      );

  String _channelLabel(String key) {
    switch (key.toLowerCase()) {
      case 'sms':
        return 'SMS';
      case 'email':
        return 'Email';
      case 'push':
        return 'Push notifications';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return key;
    }
  }
}


class _ProfileAvatar extends ConsumerWidget {
  const _ProfileAvatar({required this.initial});
  final String initial;

  Future<void> _pickAndUpload(
      BuildContext context, WidgetRef ref, ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: source,
      maxWidth: 800,
      imageQuality: 85,
    );
    if (file == null) return;
    try {
      await ref.read(profileRepositoryProvider).uploadPhoto(file.path);
      ref.invalidate(profilePhotoProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile photo updated.')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  void _chooseSource(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () {
                Navigator.of(context).pop();
                _pickAndUpload(context, ref, ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () {
                Navigator.of(context).pop();
                _pickAndUpload(context, ref, ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bytes = ref.watch(profilePhotoProvider).value;
    return Stack(
      children: [
        CircleAvatar(
          radius: 44,
          backgroundImage: bytes != null ? MemoryImage(bytes) : null,
          child: bytes == null
              ? Text(initial, style: const TextStyle(fontSize: 32))
              : null,
        ),
        Positioned(
          right: 0,
          bottom: 0,
          child: Material(
            color: Theme.of(context).colorScheme.primary,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: () => _chooseSource(context, ref),
              child: const Padding(
                padding: EdgeInsets.all(6),
                child: Icon(Icons.camera_alt, size: 16, color: Colors.white),
              ),
            ),
          ),
        ),
      ],
    );
  }
}


class _ContactEditSheet extends ConsumerStatefulWidget {
  const _ContactEditSheet({required this.profile});
  final MemberProfile profile;

  @override
  ConsumerState<_ContactEditSheet> createState() => _ContactEditSheetState();
}

class _ContactEditSheetState extends ConsumerState<_ContactEditSheet> {
  late final TextEditingController _phone =
      TextEditingController(text: widget.profile.phone ?? '');
  late final TextEditingController _whatsapp =
      TextEditingController(text: widget.profile.whatsapp ?? '');
  late final TextEditingController _email =
      TextEditingController(text: widget.profile.email ?? '');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _whatsapp.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final email = _email.text.trim();
    if (email.isNotEmpty && !email.contains('@')) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(profileRepositoryProvider).updateContact(
            phone: _phone.text.trim(),
            whatsapp: _whatsapp.text.trim(),
            email: email,
          );
      ref.invalidate(profileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contact details updated.')),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Edit contact details',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Telephone number'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _whatsapp,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'WhatsApp number'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Text(_error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save'),
          ),
        ],
      ),
    );
  }
}

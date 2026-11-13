import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers.dart';

class GroupRegistrationScreen extends ConsumerStatefulWidget {
  const GroupRegistrationScreen({super.key});

  @override
  ConsumerState<GroupRegistrationScreen> createState() =>
      _GroupRegistrationScreenState();
}

class _GroupRegistrationScreenState
    extends ConsumerState<GroupRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _groupName = TextEditingController();
  final _address = TextEditingController();
  final _chairmanName = TextEditingController();
  final _chairmanPhone = TextEditingController();
  final _chairmanEmail = TextEditingController();
  final _secretaryName = TextEditingController();
  final _secretaryPhone = TextEditingController();
  final _secretaryEmail = TextEditingController();
  final _treasurerName = TextEditingController();
  final _treasurerPhone = TextEditingController();
  final _treasurerEmail = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final controller in [
      _groupName,
      _address,
      _chairmanName,
      _chairmanPhone,
      _chairmanEmail,
      _secretaryName,
      _secretaryPhone,
      _secretaryEmail,
      _treasurerName,
      _treasurerPhone,
      _treasurerEmail,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  String? _required(String? value) => value == null || value.trim().isEmpty
      ? 'This field is required.'
      : null;

  String? _phone(String? value) {
    final requiredError = _required(value);
    if (requiredError != null) return requiredError;
    final compact = value!.replaceAll(' ', '');
    return RegExp(r'^\+?[0-9]{7,40}$').hasMatch(compact)
        ? null
        : 'Enter a valid contact number.';
  }

  String? _email(String? value) {
    final requiredError = _required(value);
    if (requiredError != null) return requiredError;
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value!.trim())
        ? null
        : 'Enter a valid email address.';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final registration = await ref.read(memberRepositoryProvider).registerGroup(
            groupName: _groupName.text.trim(),
            address: _address.text.trim(),
            chairman: _official(_chairmanName, _chairmanPhone, _chairmanEmail),
            secretary: _official(_secretaryName, _secretaryPhone, _secretaryEmail),
            treasurer: _official(_treasurerName, _treasurerPhone, _treasurerEmail),
          );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Registration submitted'),
          content: Text(
            'Your group is awaiting platform approval. '
            'Your organization code is ${registration.organizationCode}. '
            'Keep this code for signing in. Reference: ${registration.reference}',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Map<String, String> _official(
    TextEditingController name,
    TextEditingController phone,
    TextEditingController email,
  ) =>
      {
        'fullName': name.text.trim(),
        'phone': phone.text.trim(),
        'email': email.text.trim().toLowerCase(),
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register an organization')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                controller: _groupName,
                decoration: const InputDecoration(
                  labelText: 'Group or organization name',
                  helperText: 'For a group, CBO, cooperative, or SACCO',
                ),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _address,
                decoration: const InputDecoration(labelText: 'Group address'),
                maxLines: 2,
                validator: _required,
              ),
              const SizedBox(height: 24),
              _OfficialFields(
                title: 'Chairman',
                name: _chairmanName,
                phone: _chairmanPhone,
                email: _chairmanEmail,
                validator: _phone,
                emailValidator: _email,
              ),
              _OfficialFields(
                title: 'Secretary',
                name: _secretaryName,
                phone: _secretaryPhone,
                email: _secretaryEmail,
                validator: _phone,
                emailValidator: _email,
              ),
              _OfficialFields(
                title: 'Treasurer',
                name: _treasurerName,
                phone: _treasurerPhone,
                email: _treasurerEmail,
                validator: _phone,
                emailValidator: _email,
              ),
              if (_error != null) ...[
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 12),
              ],
              FilledButton.icon(
                onPressed: _busy ? null : _submit,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.group_add_outlined),
                label: const Text('Submit registration'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OfficialFields extends StatelessWidget {
  const _OfficialFields({
    required this.title,
    required this.name,
    required this.phone,
    required this.email,
    required this.validator,
    required this.emailValidator,
  });

  final String title;
  final TextEditingController name;
  final TextEditingController phone;
  final TextEditingController email;
  final String? Function(String?) validator;
  final String? Function(String?) emailValidator;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextFormField(
          controller: name,
          decoration: const InputDecoration(labelText: 'Full name'),
          validator: validator,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Contact number'),
          validator: validator,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: email,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          decoration: const InputDecoration(labelText: 'Email address'),
          validator: emailValidator,
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

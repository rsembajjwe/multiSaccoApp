import 'package:flutter_test/flutter_test.dart';
import 'package:sacco_staff_app/domain/models.dart';

void main() {
  test('GroupOfficial parses review contact details', () {
    final official = GroupOfficial.fromJson({
      'id': 'official_1',
      'role': 'chairman',
      'fullName': 'Amina Kato',
      'phone': '+256700000001',
      'email': 'amina@example.com',
    });

    expect(official.id, 'official_1');
    expect(official.role, 'chairman');
    expect(official.fullName, 'Amina Kato');
    expect(official.phone, '+256700000001');
    expect(official.email, 'amina@example.com');
  });
}

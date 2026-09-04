import 'package:intl/intl.dart';

/// Shared formatting so money, dates and numbers read the same across every
/// admin screen.
class Fmt {
  Fmt._();

  static final NumberFormat _money =
      NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
  static final NumberFormat _plain = NumberFormat.decimalPattern();
  static final DateFormat _date = DateFormat('d MMM yyyy');
  static final DateFormat _dateTime = DateFormat('d MMM yyyy, h:mm a');

  static String money(num? v) => _money.format(v ?? 0);
  static String number(num? v) => _plain.format(v ?? 0);

  static String date(dynamic v) {
    final d = _parse(v);
    return d == null ? '—' : _date.format(d.toLocal());
  }

  static String dateTime(dynamic v) {
    final d = _parse(v);
    return d == null ? '—' : _dateTime.format(d.toLocal());
  }

  static int? year(dynamic v) => _parse(v)?.toLocal().year;

  static DateTime? _parse(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse('$v');
  }

  /// Title-cases a snake/lower status like `pending_approval` -> `Pending approval`.
  static String label(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final s = raw.replaceAll('_', ' ').trim();
    return s.isEmpty ? '—' : s[0].toUpperCase() + s.substring(1);
  }
}

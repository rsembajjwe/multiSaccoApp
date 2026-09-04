import 'package:intl/intl.dart';

/// Shared formatting so money, dates and numbers read the same across every
/// admin screen.
class Fmt {
  Fmt._();

  static String _currency = 'UGX';
  static int _digits = 0;
  static NumberFormat _money =
      NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

  /// Sets the display currency (from the signed-in SACCO's tenant settings).
  static void setCurrency(String code, int digits) {
    final c = code.trim().isEmpty ? 'UGX' : code.trim();
    final d = digits < 0 ? 0 : (digits > 4 ? 4 : digits);
    if (c == _currency && d == _digits) return;
    _currency = c;
    _digits = d;
    _money = NumberFormat.currency(symbol: '$c ', decimalDigits: d);
  }
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

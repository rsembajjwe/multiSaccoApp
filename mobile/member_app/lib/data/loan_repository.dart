import '../api_contract.dart';
import '../domain/models.dart';
import 'api_client.dart';

class LoanRepository {
  LoanRepository(this._api);

  final ApiClient _api;

  /// Member loans arrive inside the mobile-dashboard payload's `loans` array.
  Future<List<Loan>> loans() async {
    final data = await _api.get(ApiPaths.dashboard);
    final raw = data['loans'];
    if (raw is List) {
      return raw.whereType<Map<String, dynamic>>().map(Loan.fromJson).toList();
    }
    return const [];
  }

  Future<List<LoanRepayment>> repayments(String loanId) async {
    final rows = await _api.getList(ApiPaths.loanRepayments(loanId));
    return rows.map(LoanRepayment.fromJson).toList();
  }
}

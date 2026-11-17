# Android APK Release

Built on 2026-11-17 against `https://globalntereka.com/api/v1`.

| APK | Application ID | Version |
| --- | --- | --- |
| `Tereka.apk` | `com.methaltech.sacco_member_app` | `0.1.10` (`11`) |
| `Staff_Tereka.apk` | `com.methaltech.sacco_staff_app` | `0.1.26` (`27`) |
| `Tereka_Proprietor.apk` | `com.methaltech.tereka.proprietor` | `1.0.24` (`25`) |

Checksums are recorded in `SHA256SUMS.txt`.

This release lets authenticated users update their registered email address and telephone number. It also shows the masked registered phone number or email used for password-reset delivery. Proprietor SMS resets use the main platform SMS account, Staff resets use the SACCO SMS account, and Member resets use the member's personal SMS account.

Staff member cards now show total savings, outstanding loan balance, and aggregate loan status. Loan posting keeps Save active while checking the borrower, waits visibly when tapped, and reports incomplete fields instead of appearing unresponsive.

Loan saving now remains successful even when a later guarantor request fails, and the exact failure is displayed inside the form. The form also shows whether guarantor cover is required using total repayment (principal, interest, and charges) against the member's savings.

Staff loan posting is now atomic: loan details, signed-form reference, inclusive cover, and required signed guarantors are validated and saved together. If any item is invalid, no partial loan is created.

Staff borrower and guarantor selection now searches while typing, keeps valid selections visible across legacy status formats, marks unavailable members with a reason, prevents duplicate or self-guarantors, clears stale guarantors when the borrower changes, and ignores late search responses.

Loan borrower and guarantor pickers now load active members only. Every candidate displays savings, outstanding personal loan balance, liabilities from guaranteeing other members, and remaining guarantee capacity before selection.

Staff loan repayment now guides the user with the selected member's open loans, total outstanding amount, principal, total payable, amount paid, installment, due date, and arrears. Loan payment history starts with the application or actual disbursement as appropriate, then lists every repayment chronologically through the current date.

Loan approval validation errors now remain visible inside the approval form instead of appearing behind the modal sheet.

Staff member profiles now show authoritative loan and guarantee exposure, including own outstanding debt, guaranteed liabilities, total exposure, guarantee ceiling, committed cover, remaining capacity, and active guarantee commitments. Inactive members are clearly marked as unavailable for new loan and guarantee workflows.

Loan repayments, cash movements, and expenses now keep validation and posting failures visible inside their forms so staff can correct and retry safely. Loan mutations also refresh member exposure immediately.

Dashboard refresh now reloads operational data, and staff with loan access see an arrears warning with the affected loan count and overdue amount.

Member, Staff, and Proprietor login screens now provide an accessible show/hide password control. Staff first-login password and confirmation fields provide separate visibility controls.

The Staff app now keeps successful authenticated GET responses in encrypted, SACCO-scoped storage for up to 24 hours. When connectivity fails it can show the matching saved response, displays a clear offline notice, never shares cached data across SACCOs, and continues to require a live connection for every posting or update.

The Staff app now checks a public server-managed version policy before login. Unsupported builds are blocked with an upgrade message, while newer optional releases are announced without preventing access. Build 25 remains supported during the rollout; the server minimum can be raised to build 26 after distribution is complete.

Staff financial posting now permits active members only, including transactions that were awaiting approval when a member became inactive or suspended. Annual savings-cycle SACCOs can configure an opening date and withdrawal window, while withdrawals preserve savings committed to loan collateral and guarantees.

Staff SMS now supports all-member or selected-member audiences, personalized account-status messages, future scheduling, schedule cancellation, exact segment charging, and automatic refunds for unsent segments. Every send continues to use the SACCO's own SMS-credit wallet.

These APKs use the project's existing Android debug certificate. Configure a protected production keystore before publishing through Google Play or another public app store.

package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/financial-accounts")
class FinancialAccountController {

    private static final Set<String> ACCOUNT_TYPES = Set.of("savings", "shares", "welfare");

    private final FinancialAccountRepository accountRepository;
    private final FinancialProductRepository productRepository;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;

    FinancialAccountController(
            FinancialAccountRepository accountRepository,
            FinancialProductRepository productRepository,
            MemberRepository memberRepository,
            AuthService authService,
            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.productRepository = productRepository;
        this.memberRepository = memberRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listAccounts(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "memberId", required = false) String memberId,
            @RequestParam(name = "type", required = false) String requestedType) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        String accountType = normalizeType(requestedType);
        if (requestedType != null && accountType == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_ACCOUNT_TYPE", "Account type must be savings, shares, or welfare."));
        }

        List<FinancialAccount> accounts;
        if (authService.isPlatform(currentSession.user()) && requestedTenantId == null) {
            accounts = accountRepository.findAllByOrderByTenantIdAscMemberIdAscAccountTypeAsc();
        } else if (memberId != null && !memberId.isBlank()) {
            Member member = scopedMember(tenantId, memberId.trim());
            if (member == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member not found for this tenant."));
            }
            accounts = accountRepository.findByTenantIdAndMemberIdOrderByAccountTypeAsc(tenantId, member.getId());
        } else if (accountType != null) {
            accounts = accountRepository.findByTenantIdAndAccountTypeOrderByMemberIdAsc(tenantId, accountType);
        } else {
            accounts = accountRepository.findByTenantIdOrderByMemberIdAscAccountTypeAsc(tenantId);
        }

        return ResponseEntity.ok(ApiResponse.of(toResponses(accounts)));
    }

    @PostMapping
    ResponseEntity<?> openAccount(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody OpenFinancialAccountRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        Member member = scopedMember(tenantId, body.memberId().trim());
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
        }
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_NOT_ACTIVE", "Only active members can open financial accounts."));
        }

        FinancialProduct product = productRepository.findById(body.productId().trim())
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FINANCIAL_PRODUCT", "Product does not exist for this tenant."));
        }

        String requestedType = normalizeType(body.accountType());
        if (requestedType == null || !requestedType.equals(product.getProductType())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "ACCOUNT_PRODUCT_MISMATCH", "Account type must match the financial product type."));
        }

        if (accountRepository.existsByMemberIdAndProductId(member.getId(), product.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "FINANCIAL_ACCOUNT_EXISTS", "Member already has an account for this product."));
        }

        String accountNo = body.accountNo() == null || body.accountNo().isBlank()
                ? nextAccountNo(tenantId, requestedType)
                : body.accountNo().trim().toUpperCase();
        if (accountRepository.existsByTenantIdAndAccountNoIgnoreCase(tenantId, accountNo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "FINANCIAL_ACCOUNT_NO_EXISTS", "Account number already exists for this tenant."));
        }

        FinancialAccount account = accountRepository.save(new FinancialAccount(
                "account_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                product.getId(),
                requestedType,
                accountNo,
                currentSession.user().getId()));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Opened " + requestedType + " account " + accountNo + " for " + member.getMembershipNo(),
                "financial_account",
                account.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FinancialAccountResponse.from(account, member, product)));
    }

    private List<FinancialAccountResponse> toResponses(List<FinancialAccount> accounts) {
        Map<String, Member> members = memberRepository.findAllById(accounts.stream().map(FinancialAccount::getMemberId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        Map<String, FinancialProduct> products = productRepository.findAllById(accounts.stream().map(FinancialAccount::getProductId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(FinancialProduct::getId, Function.identity()));
        return accounts.stream()
                .map(account -> FinancialAccountResponse.from(account, members.get(account.getMemberId()), products.get(account.getProductId())))
                .toList();
    }

    private Member scopedMember(String tenantId, String memberId) {
        return memberRepository.findById(memberId)
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElse(null);
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private String normalizeType(String accountType) {
        if (accountType == null || accountType.isBlank()) return null;
        String normalized = accountType.trim().toLowerCase();
        return ACCOUNT_TYPES.contains(normalized) ? normalized : null;
    }

    private String nextAccountNo(String tenantId, String accountType) {
        String prefix = "tenant_lake".equals(tenantId) ? "LFS" : "GVS";
        String typePrefix = switch (accountType) {
            case "shares" -> "SHR";
            case "welfare" -> "WEL";
            default -> "SAV";
        };
        long next = accountRepository.countByTenantIdAndAccountType(tenantId, accountType) + 1;
        return prefix + "-" + typePrefix + "-" + String.format("%04d", next);
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access financial accounts for another tenant."));
    }

    record OpenFinancialAccountRequest(
            String tenantId,
            @NotBlank String memberId,
            @NotBlank String productId,
            @NotBlank String accountType,
            String accountNo) {
    }
}

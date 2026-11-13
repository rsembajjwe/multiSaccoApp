package com.methaltech.sacco.tenant;

import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.DefaultBranchProvisioningService;
import com.methaltech.sacco.identity.DefaultSaccoRoleProvisioningService;
import com.methaltech.sacco.subscription.Subscription;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import com.methaltech.sacco.subscription.SubscriptionService;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationRegistrationService {

    private final TenantRepository tenantRepository;
    private final SaccoProfileRepository saccoProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final DefaultBranchProvisioningService branchProvisioningService;
    private final DefaultSaccoRoleProvisioningService roleProvisioningService;
    private final OrganizationCodeGenerator codeGenerator;

    public OrganizationRegistrationService(
            TenantRepository tenantRepository,
            SaccoProfileRepository saccoProfileRepository,
            SubscriptionRepository subscriptionRepository,
            SubscriptionService subscriptionService,
            DefaultBranchProvisioningService branchProvisioningService,
            DefaultSaccoRoleProvisioningService roleProvisioningService,
            OrganizationCodeGenerator codeGenerator) {
        this.tenantRepository = tenantRepository;
        this.saccoProfileRepository = saccoProfileRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.branchProvisioningService = branchProvisioningService;
        this.roleProvisioningService = roleProvisioningService;
        this.codeGenerator = codeGenerator;
    }

    @Transactional
    public Registration register(String name, String address, String phone, String email) {
        String organizationCode = codeGenerator.nextCode(name);
        Tenant tenant = new Tenant(
                "tenant_" + UUID.randomUUID(),
                name.trim(),
                organizationCode,
                "",
                address.trim(),
                "Uganda",
                "en-UG",
                "UGX",
                0,
                LocalDate.now().plusYears(1),
                "starter");
        tenant.updateStatus("pending_self_registration");
        tenant = tenantRepository.save(tenant);

        Branch branch = branchProvisioningService.ensureMainBranch(
                tenant.getId(), organizationCode, address, null);
        roleProvisioningService.ensureOfficialRole(tenant.getId(), "chairperson", null);
        roleProvisioningService.ensureOfficialRole(tenant.getId(), "secretary", null);
        roleProvisioningService.ensureOfficialRole(tenant.getId(), "treasurer", null);
        saccoProfileRepository.save(new SaccoProfile(
                "profile_" + UUID.randomUUID(),
                tenant.getId(),
                tenant.getName(),
                "",
                "",
                "",
                address.trim(),
                email.trim().toLowerCase(),
                phone.trim(),
                ""));
        Subscription subscription = subscriptionRepository.save(
                subscriptionService.createInitialSubscription(tenant.getId(), "starter", false));
        return new Registration(tenant.getId(), organizationCode, tenant.getName(), branch, subscription);
    }

    public record Registration(
            String tenantId,
            String organizationCode,
            String organizationName,
            Branch branch,
            Subscription subscription) {
    }
}

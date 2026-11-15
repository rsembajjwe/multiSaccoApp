package com.methaltech.sacco.identity;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OfficialStaffAccountService {

    private final StaffOnboardingService onboardingService;
    private final DefaultSaccoRoleProvisioningService roleProvisioningService;
    private final UserRoleRepository userRoleRepository;

    OfficialStaffAccountService(
            StaffOnboardingService onboardingService,
            DefaultSaccoRoleProvisioningService roleProvisioningService,
            UserRoleRepository userRoleRepository) {
        this.onboardingService = onboardingService;
        this.roleProvisioningService = roleProvisioningService;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public User create(
            String tenantId,
            String office,
            String fullName,
            String email,
            String phone,
            String deliveryChannel,
            String createdByUserId) {
        User user = onboardingService.createUser(
                tenantId, fullName, email, phone, deliveryChannel);
        String roleId = roleProvisioningService.ensureOfficialRole(tenantId, office, createdByUserId);
        if (!userRoleRepository.existsByIdUserIdAndIdRoleId(user.getId(), roleId)) {
            userRoleRepository.save(new UserRole(user.getId(), roleId, tenantId));
        }
        return user;
    }
}

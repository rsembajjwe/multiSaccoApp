package com.methaltech.sacco.identity;

import org.springframework.data.jpa.repository.JpaRepository;

interface PlatformSecurityPolicyRepository extends JpaRepository<PlatformSecurityPolicy, String> {
}

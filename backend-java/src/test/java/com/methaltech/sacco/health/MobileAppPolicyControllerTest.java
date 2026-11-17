package com.methaltech.sacco.health;

import static org.assertj.core.api.Assertions.assertThat;

import com.methaltech.sacco.api.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.env.MockEnvironment;

class MobileAppPolicyControllerTest {

    @Test
    void reportsMandatoryUpgradeBelowConfiguredMinimum() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("sacco.mobile-app.staff.android.minimum-version-code", "26")
                .withProperty("sacco.mobile-app.staff.android.latest-version-code", "27")
                .withProperty("sacco.mobile-app.staff.android.update-url", "https://example.test/staff.apk");
        MobileAppPolicyController controller = new MobileAppPolicyController(environment);

        ResponseEntity<?> response = controller.policy("staff", "android", 25);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        ApiResponse<?> envelope = (ApiResponse<?>) response.getBody();
        MobileAppPolicyController.MobileAppPolicyResponse policy =
                (MobileAppPolicyController.MobileAppPolicyResponse) envelope.data();
        assertThat(policy.upgradeRequired()).isTrue();
        assertThat(policy.updateAvailable()).isTrue();
        assertThat(policy.minimumVersionCode()).isEqualTo(26);
        assertThat(policy.latestVersionCode()).isEqualTo(27);
    }

    @Test
    void rejectsUnknownApplicationsAndInvalidVersions() {
        MobileAppPolicyController controller = new MobileAppPolicyController(new MockEnvironment());

        assertThat(controller.policy("unknown", "android", 25).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.policy("staff", "desktop", 25).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.policy("staff", "android", 0).getStatusCode().value()).isEqualTo(400);
    }
}

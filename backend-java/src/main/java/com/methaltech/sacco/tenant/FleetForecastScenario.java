package com.methaltech.sacco.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fleet_forecast_scenarios")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class FleetForecastScenario {
    @Id private String id;
    @Column(name = "user_id") private String userId;
    private String name;
    @Column(name = "renewal_rate") private int renewalRate;
    @Column(name = "price_adjustment") private int priceAdjustment;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;

    FleetForecastScenario(String id, String userId, String name, int renewalRate, int priceAdjustment) {
        this.id = id;
        this.userId = userId;
        this.name = name.trim();
        this.renewalRate = renewalRate;
        this.priceAdjustment = priceAdjustment;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}

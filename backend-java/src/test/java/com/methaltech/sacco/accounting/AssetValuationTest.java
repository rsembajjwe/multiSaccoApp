package com.methaltech.sacco.accounting;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AssetValuationTest {

    @Test
    void futureDepreciationStartHasNoAccumulatedDepreciation() {
        Asset asset = asset(LocalDate.now().plusMonths(1), "120000", "20000", 10);

        assertThat(AssetValuation.accumulatedDepreciation(asset)).isEqualByComparingTo("0");
        assertThat(AssetValuation.netBookValue(asset)).isEqualByComparingTo("120000");
    }

    @Test
    void accumulatedDepreciationIncludesCurrentMonthAndRoundsHalfUp() {
        Asset asset = asset(LocalDate.now().minusMonths(2), "100000", "10000", 7);

        assertThat(AssetValuation.accumulatedDepreciation(asset)).isEqualByComparingTo("38571.43");
        assertThat(AssetValuation.netBookValue(asset)).isEqualByComparingTo("61428.57");
    }

    @Test
    void accumulatedDepreciationIsCappedByUsefulLifeAndNetBookValueDoesNotFallBelowSalvageValue() {
        Asset asset = asset(LocalDate.now().minusMonths(48), "600000", "100000", 12);

        assertThat(AssetValuation.accumulatedDepreciation(asset)).isEqualByComparingTo("500000.00");
        assertThat(AssetValuation.netBookValue(asset)).isEqualByComparingTo("100000");
    }

    @Test
    void inactiveAssetsDoNotDepreciate() {
        Asset asset = asset(LocalDate.now().minusMonths(12), "600000", "100000", 12);
        setStatus(asset, "disposed");

        assertThat(AssetValuation.accumulatedDepreciation(asset)).isEqualByComparingTo("0");
        assertThat(AssetValuation.netBookValue(asset)).isEqualByComparingTo("600000");
    }

    @Test
    void assetResponseUsesSuppliedValuationEvidence() {
        Asset asset = asset(LocalDate.now().minusMonths(48), "600000", "100000", 12);

        AssetResponse response = AssetResponse.from(
                asset,
                AssetValuation.accumulatedDepreciation(asset),
                AssetValuation.netBookValue(asset));

        assertThat(response.id()).isEqualTo("asset_1");
        assertThat(response.tenantId()).isEqualTo("tenant_green");
        assertThat(response.status()).isEqualTo("active");
        assertThat(response.accumulatedDepreciation()).isEqualByComparingTo("500000.00");
        assertThat(response.netBookValue()).isEqualByComparingTo("100000");
    }

    private static Asset asset(LocalDate depreciationStartDate, String cost, String salvageValue, int usefulLifeMonths) {
        return new Asset(
                "asset_1",
                "tenant_green",
                "Office laptop",
                "technology",
                "1300",
                money(cost),
                money(salvageValue),
                usefulLifeMonths,
                depreciationStartDate.minusDays(7),
                depreciationStartDate,
                "bank",
                "ASSET-001",
                "Head office",
                "user_secretary",
                "user_treasurer");
    }

    private static void setStatus(Asset asset, String status) {
        try {
            java.lang.reflect.Field field = Asset.class.getDeclaredField("status");
            field.setAccessible(true);
            field.set(asset, status);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

    private static BigDecimal money(String value) {
        return new BigDecimal(value);
    }
}

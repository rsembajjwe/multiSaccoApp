package com.methaltech.sacco.tenant;

/**
 * The payment collection channels the Platform Super Admin allows a SACCO to use through Tereka.
 * This is a platform-level control: a SACCO admin can only activate a channel that is allowed here.
 */
public enum CollectionMode {
    /** SACCO is not allowed to collect payments through Tereka yet. */
    NONE,
    /** SACCO may use mobile-money collection only. */
    MOBILE_MONEY_ONLY,
    /** SACCO may use bank-led collection only. */
    BANK_ONLY,
    /** SACCO may use both mobile-money and bank collection. */
    BOTH;

    public boolean allowsMobileMoney() {
        return this == MOBILE_MONEY_ONLY || this == BOTH;
    }

    public boolean allowsBank() {
        return this == BANK_ONLY || this == BOTH;
    }

    /** Parses a value from client input, returning {@code null} when it is not a valid mode. */
    public static CollectionMode parse(String value) {
        if (value == null) {
            return null;
        }
        try {
            return CollectionMode.valueOf(value.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    /** Lenient read for stored values, defaulting to {@link #NONE} when missing or unknown. */
    public static CollectionMode fromStored(String value) {
        CollectionMode parsed = parse(value);
        return parsed == null ? NONE : parsed;
    }
}

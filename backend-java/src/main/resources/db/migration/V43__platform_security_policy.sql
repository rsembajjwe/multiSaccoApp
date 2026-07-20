CREATE TABLE platform_security_policies (
    id VARCHAR(80) PRIMARY KEY,
    minimum_password_length INTEGER NOT NULL,
    require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_number BOOLEAN NOT NULL DEFAULT TRUE,
    require_symbol BOOLEAN NOT NULL DEFAULT FALSE,
    password_expiry_days INTEGER NOT NULL DEFAULT 90,
    lockout_failed_attempts INTEGER NOT NULL DEFAULT 5,
    lockout_minutes INTEGER NOT NULL DEFAULT 15,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_security_policies (
    id,
    minimum_password_length,
    require_uppercase,
    require_lowercase,
    require_number,
    require_symbol,
    password_expiry_days,
    lockout_failed_attempts,
    lockout_minutes
) VALUES (
    'platform_default',
    10,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    90,
    5,
    15
);

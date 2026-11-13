UPDATE users
SET password_reset_required = TRUE
WHERE tenant_id = 'tenant_platform'
  AND LOWER(email) = 'rsembajjwe@gmail.com'
  AND status = 'active';

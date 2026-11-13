-- Seeded SACCO officials share role-specific usernames across tenants. Authentication
-- remains tenant-scoped by the SACCO code, so the same email is safe in each tenant.
UPDATE users
SET email = 'rsembajjwe@gmail.com',
    password_hash = '4fc54e05cc1597789aa5dc70ee7e6f48148563331dd5911be2722398dc13cc20',
    password_salt = 'ad32ad22bd23595dec4476a9f7c14bf6',
    password_reset_required = FALSE,
    status = 'active'
WHERE id IN (
    'user_green_chairperson',
    'user_kigezi_chairperson',
    'user_masaka_chairperson',
    'user_gulu_chairperson',
    'user_mbale_chairperson',
    'user_hoima_chairperson'
);

UPDATE users
SET email = 'rsembajjwe1@gmail.com',
    password_hash = '3dcf00afb54f07b832e3e1d7838a27f068ad6c9aaa0ee7c3aa4c71ce7fb3e30c',
    password_salt = 'fbc458072d6a7fbe8b8aca01a84a50b1',
    password_reset_required = FALSE,
    status = 'active'
WHERE id IN (
    'user_green_treasurer',
    'user_kigezi_treasurer',
    'user_masaka_treasurer',
    'user_gulu_treasurer',
    'user_mbale_treasurer',
    'user_hoima_treasurer'
);

UPDATE users
SET email = 'rsembajjwe2@gmail.com',
    password_hash = '5ef12b3d11882b9826d45ba14d95b973b5edcfca0b180975c2f0a52170f20a33',
    password_salt = '45548f8d00b4f9b8ef9fbca55483afe7',
    password_reset_required = FALSE,
    status = 'active'
WHERE id IN (
    'user_green_secretary',
    'user_kigezi_secretary',
    'user_masaka_secretary',
    'user_gulu_secretary',
    'user_mbale_secretary',
    'user_hoima_secretary'
);

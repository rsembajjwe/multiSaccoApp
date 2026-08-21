-- Members can now select their own guarantors at loan submission, so a guarantor
-- request is not always created by a staff user. Allow requested_by_user_id to be
-- null (member-initiated) while keeping the FK for staff-initiated requests.
ALTER TABLE loan_guarantors ALTER COLUMN requested_by_user_id DROP NOT NULL;

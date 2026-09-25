-- Email verification now fails closed (an account without a verification row is treated as
-- unverified). Accounts that pre-date verification are recorded as verified once; existing rows,
-- including pending ones, are left untouched.
INSERT OR IGNORE INTO email_verifications (user_email, verified_at)
SELECT email, CURRENT_TIMESTAMP FROM users;

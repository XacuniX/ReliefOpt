ALTER TABLE users ADD COLUMN email TEXT;

UPDATE users SET email = LOWER(username) || '@reliefopt.org' WHERE email IS NULL;

ALTER TABLE users ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email));

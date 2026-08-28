ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id);

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

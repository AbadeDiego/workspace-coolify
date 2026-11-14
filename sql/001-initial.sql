CREATE TABLE IF NOT EXISTS workspace_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  sequence bigint NOT NULL CHECK (sequence >= 1000)
);

-- One row per record. JSONB accommodates the different forms without losing
-- checklist, revision and evidence history. Files are included in the backups.
CREATE TABLE IF NOT EXISTS workspace_records (
  collection text NOT NULL,
  record_key text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  PRIMARY KEY (collection, record_key)
);
CREATE INDEX IF NOT EXISTS workspace_records_order ON workspace_records (collection, position);

CREATE TABLE IF NOT EXISTS workspace_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL,
  credential_digest text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_sessions_expiry ON workspace_sessions (expires_at);
CREATE INDEX IF NOT EXISTS workspace_sessions_user ON workspace_sessions (user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_expiry ON login_attempts (expires_at);

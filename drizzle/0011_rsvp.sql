-- Guest RSVP responses for published event pages. Contact and IP are stored hashed.
-- expires_at is unix seconds so a retention job can delete stale PII without parsing config.

CREATE TABLE IF NOT EXISTS rsvp_responses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
  guest_count INTEGER NOT NULL DEFAULT 1,
  plus_ones_json TEXT,
  song TEXT,
  answers_json TEXT,
  name TEXT NOT NULL,
  contact_hash TEXT,
  response_token_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT,
  consent_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS rsvp_responses_project_idx ON rsvp_responses(project_id, created_at);
CREATE INDEX IF NOT EXISTS rsvp_responses_token_idx ON rsvp_responses(response_token_hash);
CREATE INDEX IF NOT EXISTS rsvp_responses_contact_idx ON rsvp_responses(project_id, contact_hash);
CREATE INDEX IF NOT EXISTS rsvp_responses_expires_idx ON rsvp_responses(expires_at);

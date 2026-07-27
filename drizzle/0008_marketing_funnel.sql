CREATE TABLE IF NOT EXISTS marketing_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_email TEXT,
  campaign_source TEXT,
  campaign_medium TEXT,
  campaign_name TEXT,
  campaign_content TEXT,
  campaign_term TEXT,
  template_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS marketing_events_name_created_idx ON marketing_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS marketing_events_campaign_idx ON marketing_events(campaign_source, campaign_name, created_at);
CREATE INDEX IF NOT EXISTS marketing_events_user_idx ON marketing_events(user_email, created_at);

CREATE TABLE IF NOT EXISTS marketing_leads (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  use_case TEXT NOT NULL,
  campaign_source TEXT,
  campaign_medium TEXT,
  campaign_name TEXT,
  campaign_content TEXT,
  campaign_term TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS marketing_leads_status_created_idx ON marketing_leads(status, created_at);

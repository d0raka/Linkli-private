-- Canonical billing records. billing_events is extended in place so historical
-- event ids stay unique; new tables are additive and have no FK to users so a
-- billing tombstone can outlive account deletion.

ALTER TABLE billing_events ADD COLUMN payload_json TEXT;
ALTER TABLE billing_events ADD COLUMN provider_event_at TEXT;
ALTER TABLE billing_events ADD COLUMN sequence INTEGER;
ALTER TABLE billing_events ADD COLUMN status TEXT NOT NULL DEFAULT 'processed';
ALTER TABLE billing_events ADD COLUMN processed_at TEXT;

CREATE INDEX IF NOT EXISTS billing_events_customer_idx ON billing_events(customer_email, provider_event_at);

CREATE TABLE IF NOT EXISTS billing_customers (
  user_email TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'hosted',
  provider_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'hosted',
  provider_order_id TEXT,
  plan TEXT NOT NULL,
  price_id TEXT,
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'chargeback', 'failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  provider_event_at TEXT
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_email, created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  provider_subscription_id TEXT,
  plan TEXT NOT NULL,
  price_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancel_scheduled', 'cancelled', 'expired')),
  current_period_end TEXT,
  cancel_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_email, status);

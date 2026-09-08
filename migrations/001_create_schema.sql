CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS brokers (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  exposure TEXT NOT NULL,
  risk_tier TEXT NOT NULL,
  score INTEGER NOT NULL,
  details TEXT NOT NULL,
  proof TEXT NOT NULL,
  before_state TEXT NOT NULL,
  after_state TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  frequency TEXT NOT NULL,
  next_check TEXT NOT NULL,
  monitoring_reason TEXT NOT NULL,
  FOREIGN KEY(scan_id) REFERENCES scan_runs(id)
);

CREATE TABLE IF NOT EXISTS monitoring_events (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  broker_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  details TEXT NOT NULL,
  FOREIGN KEY(scan_id) REFERENCES scan_runs(id),
  FOREIGN KEY(broker_id) REFERENCES brokers(id)
);

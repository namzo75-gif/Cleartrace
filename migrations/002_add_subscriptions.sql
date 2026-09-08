CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  seat_limit INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  renews_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

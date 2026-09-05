CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT,
  region TEXT,
  source_name TEXT,
  source_url TEXT,
  url TEXT,
  published_at TEXT,
  lane TEXT,
  kind TEXT,
  review_status TEXT,
  confidence TEXT,
  kentucky_connection TEXT,
  people TEXT,
  institutions TEXT,
  metadata TEXT,
  submitted_at TEXT,
  updated_at TEXT,
  status TEXT
);

CREATE INDEX IF NOT EXISTS idx_signals_region ON signals(region);
CREATE INDEX IF NOT EXISTS idx_signals_category ON signals(category);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_review_status ON signals(review_status);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  location TEXT,
  region TEXT,
  host TEXT,
  type TEXT,
  status TEXT,
  source_url TEXT,
  why_it_matters TEXT,
  submitted_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  region TEXT,
  source_url TEXT,
  reason TEXT,
  claim_status TEXT,
  submitted_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_claim_status ON profiles(claim_status);

CREATE TABLE IF NOT EXISTS toolkits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT,
  use_case TEXT,
  status TEXT,
  review_needed TEXT,
  sections TEXT,
  starter_text TEXT,
  submitted_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_toolkits_status ON toolkits(status);

CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  headline TEXT,
  summary TEXT,
  maintainer TEXT,
  status TEXT,
  next_win TEXT,
  focus_areas TEXT,
  open_questions TEXT,
  partner_asks TEXT,
  recommended_toolkits TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_regions_slug ON regions(slug);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT,
  source TEXT,
  status TEXT,
  reviewer_notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  region TEXT,
  name TEXT,
  api_key_hash TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_api_key_hash ON users(api_key_hash);

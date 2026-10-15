-- skills is stored as JSON text, for example '["Node.js","SQL"]'
CREATE TABLE IF NOT EXISTS internships (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  domain     TEXT NOT NULL,
  mode       TEXT NOT NULL CHECK (mode IN ('Remote', 'Hybrid', 'On-site')),
  location   TEXT NOT NULL,
  skills     TEXT NOT NULL,
  openings   INTEGER NOT NULL CHECK (openings >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One person can apply to one internship only once (UNIQUE rule)
CREATE TABLE IF NOT EXISTS applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  cover_note    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (internship_id, email)
);

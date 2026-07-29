-- Allow guest-created scorecards (no user account)
-- SQLite doesn't support ALTER COLUMN, so recreate the table
CREATE TABLE scorecards_new (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id),
  share_code TEXT UNIQUE,
  created_by TEXT REFERENCES users(id),
  title TEXT DEFAULT '',
  game_date TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO scorecards_new SELECT * FROM scorecards;
DROP TABLE scorecards;
ALTER TABLE scorecards_new RENAME TO scorecards;

CREATE INDEX IF NOT EXISTS idx_scorecards_created_by ON scorecards(created_by);
CREATE INDEX IF NOT EXISTS idx_scorecards_share_code ON scorecards(share_code);
CREATE INDEX IF NOT EXISTS idx_scorecards_template ON scorecards(template_id);

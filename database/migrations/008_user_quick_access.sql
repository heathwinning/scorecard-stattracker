-- Per-user quick-start scorecards for the home page.
CREATE TABLE IF NOT EXISTS user_quick_access (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, template_id)
);

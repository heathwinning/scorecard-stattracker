-- Scorecard Database Schema for Cloudflare D1

-- Users table (synced from Google OAuth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Google sub ID
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Games catalog (for filtering templates by game)
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('board','card','dice','party','sport','tile','other')),
  player_count TEXT,
  icon TEXT
);

-- Scorecard templates
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY, -- UUID
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  game_id TEXT REFERENCES games(id), -- optional link to a game
  is_public INTEGER NOT NULL DEFAULT 0, -- 0 = private, 1 = public gallery
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cells in a template grid
CREATE TABLE IF NOT EXISTS template_cells (
  id TEXT PRIMARY KEY, -- UUID
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  row_pos INTEGER NOT NULL,
  col_pos INTEGER NOT NULL,
  row_span INTEGER NOT NULL DEFAULT 1,
  col_span INTEGER NOT NULL DEFAULT 1,
  cell_type TEXT NOT NULL CHECK(cell_type IN ('label', 'input:text', 'input:number', 'input:list', 'tally', 'formula', 'heading')),
  cell_key TEXT NOT NULL, -- Unique key within template, used for formula references
  label TEXT NOT NULL DEFAULT '',
  formula_expr TEXT, -- For formula cells: the expression like SUM(B1:B10)
  per_player INTEGER NOT NULL DEFAULT 0, -- Repeats per player when filling
  config_json TEXT DEFAULT '{}', -- Extra config (tally min/max, default values, etc.)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_template_cells_template ON template_cells(template_id);

-- Completed scorecards (game sessions)
CREATE TABLE IF NOT EXISTS scorecards (
  id TEXT PRIMARY KEY, -- UUID
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  title TEXT DEFAULT '',
  game_date TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT DEFAULT '',
  share_code TEXT UNIQUE, -- null until shared; 6-char code for multiplayer
  sharing_mode TEXT NOT NULL DEFAULT 'shared' CHECK(sharing_mode IN ('shared', 'slots')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Players/teams within a scorecard
CREATE TABLE IF NOT EXISTS scorecard_players (
  id TEXT PRIMARY KEY, -- UUID
  scorecard_id TEXT NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scorecard_players_scorecard ON scorecard_players(scorecard_id);

CREATE TABLE IF NOT EXISTS scorecard_settings (
  scorecard_id TEXT PRIMARY KEY REFERENCES scorecards(id) ON DELETE CASCADE,
  host_only_editing INTEGER NOT NULL DEFAULT 0 CHECK(host_only_editing IN (0, 1)),
  is_locked INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scorecard_visibility_settings (
  scorecard_id TEXT PRIMARY KEY REFERENCES scorecards(id) ON DELETE CASCADE,
  private_player_scores INTEGER NOT NULL DEFAULT 0 CHECK(private_player_scores IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scorecard_game_configurations (
  scorecard_id TEXT PRIMARY KEY REFERENCES scorecards(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS template_rule_sets (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT NOT NULL DEFAULT '',
  definition_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(template_id, rule_key)
);

CREATE TABLE IF NOT EXISTS scorecard_layout_snapshots (
  scorecard_id TEXT PRIMARY KEY REFERENCES scorecards(id) ON DELETE CASCADE,
  cells_json TEXT NOT NULL,
  rules_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual cell values in a filled scorecard
CREATE TABLE IF NOT EXISTS cell_values (
  id TEXT PRIMARY KEY, -- UUID
  scorecard_id TEXT NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  template_cell_id TEXT NOT NULL REFERENCES template_cells(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES scorecard_players(id) ON DELETE CASCADE, -- NULL for non-per_player cells
  entry_key TEXT NOT NULL DEFAULT '', -- '' for normal cells, '0','1','2'... for list entries
  value TEXT NOT NULL DEFAULT '',
  is_hidden INTEGER NOT NULL DEFAULT 0, -- 0=visible, 1=hidden (multiplayer reveal)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cell_values_scorecard ON cell_values(scorecard_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cell_values_unique ON cell_values(scorecard_id, template_cell_id, player_id, entry_key);

-- Multiplayer: participants in a shared scorecard
CREATE TABLE IF NOT EXISTS scorecard_participants (
  id TEXT PRIMARY KEY, -- UUID
  scorecard_id TEXT NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_slot_id TEXT REFERENCES scorecard_players(id) ON DELETE CASCADE, -- which player row they control
  role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('owner','player')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_participants_scorecard ON scorecard_participants(scorecard_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_unique ON scorecard_participants(scorecard_id, user_id);

-- Session store (for auth cookies)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

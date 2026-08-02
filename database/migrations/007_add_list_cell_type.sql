-- List is a first-class numeric field type. Rebuild the table to expand the
-- SQLite CHECK constraint while preserving every template and cell value.
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS template_cells_with_list_type (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  row_pos INTEGER NOT NULL,
  col_pos INTEGER NOT NULL,
  row_span INTEGER NOT NULL DEFAULT 1,
  col_span INTEGER NOT NULL DEFAULT 1,
  cell_type TEXT NOT NULL CHECK(cell_type IN ('label', 'input:text', 'input:number', 'input:list', 'tally', 'formula', 'heading')),
  cell_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  formula_expr TEXT,
  per_player INTEGER NOT NULL DEFAULT 0,
  config_json TEXT DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO template_cells_with_list_type
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order, created_at)
SELECT
  id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order, created_at
FROM template_cells;

DROP TABLE template_cells;
ALTER TABLE template_cells_with_list_type RENAME TO template_cells;
CREATE INDEX IF NOT EXISTS idx_template_cells_template ON template_cells(template_id);

PRAGMA foreign_keys = ON;

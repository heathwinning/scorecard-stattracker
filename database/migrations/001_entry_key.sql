-- Migration: Add entry_key to support dynamic list entries (e.g., Wingspan bonus cards)
ALTER TABLE cell_values ADD COLUMN entry_key TEXT NOT NULL DEFAULT '';

-- Replace old unique index with one that includes entry_key
DROP INDEX IF EXISTS idx_cell_values_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cell_values_unique ON cell_values(scorecard_id, template_cell_id, player_id, entry_key);

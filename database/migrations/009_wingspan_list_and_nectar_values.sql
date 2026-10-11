-- Wingspan: bird score is a list and nectar is split by habitat.
-- Run after 006_reseed_system_scorecards.sql, which defines the new cells.
-- Existing scores are kept:
--   * Bird Points totals move into the first bird-card entry (entry_key '0').
--   * The single Oceania nectar value moves into Forest, the first nectar field.
--     Old games never recorded a habitat, so review those scores after migrating.
-- Existing games keep their saved layout snapshot, so each snapshot is rebuilt
-- from the current template cells, keeping only the modules it had selected.

UPDATE cell_values
SET entry_key = '0'
WHERE template_cell_id = 'ws-bi' AND entry_key = '';

UPDATE cell_values
SET template_cell_id = 'ws-nectar-forest', entry_key = ''
WHERE template_cell_id = 'ws-oceania-nectar'
  AND NOT EXISTS (
    SELECT 1 FROM cell_values existing
    WHERE existing.scorecard_id = cell_values.scorecard_id
      AND existing.template_cell_id = 'ws-nectar-forest'
      AND existing.player_id IS cell_values.player_id
      AND existing.entry_key = ''
  );

UPDATE template_cells SET sort_order = -1 WHERE id = 'ws-oceania-nectar';

UPDATE scorecard_layout_snapshots
SET cells_json = (
  SELECT json_group_array(json_object(
    'id', c.id,
    'template_id', c.template_id,
    'row_pos', c.row_pos,
    'col_pos', c.col_pos,
    'row_span', c.row_span,
    'col_span', c.col_span,
    'cell_type', c.cell_type,
    'cell_key', c.cell_key,
    'label', c.label,
    'formula_expr', c.formula_expr,
    'per_player', c.per_player,
    'config_json', json(c.config_json),
    'sort_order', c.sort_order
  ))
  FROM (
    SELECT * FROM template_cells
    WHERE template_id = 'wingspan' AND sort_order >= 0
    ORDER BY sort_order
  ) c
  WHERE json_extract(c.config_json, '$.rule_key') IS NULL
    OR json_extract(c.config_json, '$.rule_key') IN (SELECT value FROM json_each(scorecard_layout_snapshots.rules_json))
)
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE template_id = 'wingspan');

-- Migration: Update Wingspan template (remove old bonus_1-4, add allow_multiple bonus)
-- Also: remove player_name cells, fix labels, move totals

-- Remove player_name cells from all templates (player naming is handled by P1/P2 column headers)
UPDATE template_cells SET cell_type = 'heading', label = '', sort_order = -1 WHERE cell_key = 'player_name' AND template_id LIKE 'tpl-%';
UPDATE template_cells SET cell_type = 'heading', label = '', sort_order = -1 WHERE cell_key = 'team_name' AND template_id LIKE 'tpl-%';

-- Remove old bonus label cells (update their labels to indicate they're unused)
-- These get filtered out by the preview anyway, but clean them up
UPDATE template_cells SET cell_type = 'heading', label = '' WHERE template_id = 'tpl-wingspan' AND cell_key IN ('bonus_1', 'bonus_2', 'bonus_3', 'bonus_4');

-- Remove old bonus input cells (change to heading so they get filtered out)
UPDATE template_cells SET cell_type = 'heading', label = '', sort_order = -1 WHERE id IN ('ws-bo1i', 'ws-bo2i', 'ws-bo3i', 'ws-bo4i');

-- Remove old bonus label cells
UPDATE template_cells SET cell_type = 'heading', label = '', sort_order = -1 WHERE id IN ('ws-bo1l', 'ws-bo2l', 'ws-bo3l', 'ws-bo4l');

-- Update Wingspan grand total formula to use SUM(bonus_*) and move to bottom
UPDATE template_cells SET formula_expr = 'bird_points + SUM(bonus_*) + round_1 + round_2 + round_3 + round_4 + eggs + cached_food + tucked_cards', sort_order = 18 WHERE id = 'ws-ft';

-- Update verbose labels
UPDATE template_cells SET label = 'Bird Points' WHERE id = 'ws-bl';
UPDATE template_cells SET label = 'Other Points' WHERE id = 'ws-oh';
UPDATE template_cells SET label = 'Bonus' WHERE id = 'y-us-bl';
UPDATE template_cells SET label = 'Rounds' WHERE id = 'ch-rh';
UPDATE template_cells SET label = 'Longest Road' WHERE id = 'cat-llr';
UPDATE template_cells SET label = 'Largest Army' WHERE id = 'cat-lla';
UPDATE template_cells SET label = 'Settlements' WHERE id = 'cat-ls';
UPDATE template_cells SET label = 'Cities' WHERE id = 'cat-lc';
UPDATE template_cells SET label = 'Longest Path' WHERE id = 'ttr-llp';
UPDATE template_cells SET label = 'Unfinished Tickets' WHERE id = 'ttr-luf';

-- Move Total rows to bottom in affected templates
UPDATE template_cells SET sort_order = 14 WHERE id = 'uno-ft';
UPDATE template_cells SET sort_order = 21 WHERE id = 'sc-ft';
UPDATE template_cells SET sort_order = 18 WHERE id = 'ch-fs';
UPDATE template_cells SET sort_order = 18 WHERE id = 'p10-ft';
UPDATE template_cells SET sort_order = 15 WHERE id = 'gf-ft';

-- Insert new Wingspan bonus cell with allow_multiple (if not already present)
INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES ('ws-bi2', 'tpl-wingspan', 6, 0, 1, 1, 'input:number', 'bonus', 'Bonus Card', NULL, 1, '{"default":0,"allow_multiple":true}', 8);

-- Change Wingspan eggs/food/tucked from tally to number input (they're point values, not counters)
UPDATE template_cells SET cell_type = 'input:number', config_json = '{"default":0}' WHERE id = 'ws-et';
UPDATE template_cells SET cell_type = 'input:number', config_json = '{"default":0}' WHERE id = 'ws-ft2';
UPDATE template_cells SET cell_type = 'input:number', config_json = '{"default":0}' WHERE id = 'ws-tt';

-- Hide redundant Wingspan section headings and label cells
UPDATE template_cells SET sort_order = -1 WHERE id IN ('ws-bh', 'ws-boh', 'ws-rh', 'ws-oh', 'ws-ln', 'ws-lt');

-- Update Wingspan cells to new sort order (flat list, no section headings)
UPDATE template_cells SET sort_order = 1 WHERE id = 'ws-bi';
UPDATE template_cells SET sort_order = 2 WHERE id = 'ws-bi2';
UPDATE template_cells SET sort_order = 3 WHERE id = 'ws-r1i';
UPDATE template_cells SET sort_order = 4 WHERE id = 'ws-r2i';
UPDATE template_cells SET sort_order = 5 WHERE id = 'ws-r3i';
UPDATE template_cells SET sort_order = 6 WHERE id = 'ws-r4i';
UPDATE template_cells SET sort_order = 7 WHERE id = 'ws-et';
UPDATE template_cells SET sort_order = 8 WHERE id = 'ws-ft2';
UPDATE template_cells SET sort_order = 9 WHERE id = 'ws-tt';
UPDATE template_cells SET sort_order = 10 WHERE id = 'ws-ft';

-- Update labels
UPDATE template_cells SET label = 'Bonus Cards' WHERE id = 'ws-bi2';
UPDATE template_cells SET label = 'Round 1 Goal' WHERE id = 'ws-r1i';
UPDATE template_cells SET label = 'Round 2 Goal' WHERE id = 'ws-r2i';
UPDATE template_cells SET label = 'Round 3 Goal' WHERE id = 'ws-r3i';
UPDATE template_cells SET label = 'Round 4 Goal' WHERE id = 'ws-r4i';

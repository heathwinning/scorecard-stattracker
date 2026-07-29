-- Wipe all seed data so fresh import takes effect
DELETE FROM cell_values WHERE template_cell_id IN (SELECT id FROM template_cells WHERE template_id LIKE 'tpl-%');
DELETE FROM template_cells WHERE template_id LIKE 'tpl-%';
DELETE FROM scorecards WHERE template_id LIKE 'tpl-%';
DELETE FROM templates WHERE id LIKE 'tpl-%';

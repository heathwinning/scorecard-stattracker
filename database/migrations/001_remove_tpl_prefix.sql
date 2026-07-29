-- Remove old tpl- prefixed template rows before re-seeding with clean IDs
DELETE FROM template_cells WHERE template_id LIKE 'tpl-%';
DELETE FROM templates WHERE id LIKE 'tpl-%';

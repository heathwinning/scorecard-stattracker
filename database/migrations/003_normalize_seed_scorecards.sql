-- Normalize legacy seed templates for the unified ScorecardGrid.
--
-- Earlier templates relied on paired `label` cells and bespoke multi-column
-- layouts. The unified player grid renders one template cell per score row, so
-- every score-bearing cell needs a player-facing label of its own. Section and
-- child metadata mirrors the Wingspan template's hierarchy.

-- All existing headings become explicit sections.
UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.section', true)
WHERE template_id IN ('yahtzee', 'uno', 'catan', 'spades', 'scrabble', 'cornhole', 'poker', 'phase10', 'golf', 'ticket', 'wingspan')
  AND cell_type = 'heading';

-- Give score inputs and formulas their own descriptive labels.
UPDATE template_cells
SET label = CASE id
  -- Yahtzee
  WHEN 'y-us-i1' THEN 'Ones' WHEN 'y-us-i2' THEN 'Twos'
  WHEN 'y-us-i3' THEN 'Threes' WHEN 'y-us-i4' THEN 'Fours'
  WHEN 'y-us-i5' THEN 'Fives' WHEN 'y-us-i6' THEN 'Sixes'
  WHEN 'y-us-fs' THEN 'Upper Subtotal' WHEN 'y-us-fb' THEN 'Upper Bonus'
  WHEN 'y-us-ft' THEN 'Upper Total' WHEN 'y-ls-i1' THEN 'Three of a Kind'
  WHEN 'y-ls-i2' THEN 'Four of a Kind' WHEN 'y-ls-i3' THEN 'Full House'
  WHEN 'y-ls-i4' THEN 'Small Straight' WHEN 'y-ls-i5' THEN 'Large Straight'
  WHEN 'y-ls-i6' THEN 'Yahtzee' WHEN 'y-ls-i7' THEN 'Chance'
  WHEN 'y-ls-ft' THEN 'Lower Total' WHEN 'y-gt-f' THEN 'Grand Total'
  -- Uno / Phase 10 / Golf
  WHEN 'uno-ft' THEN 'Total Score' WHEN 'p10-ip' THEN 'Current Phase'
  WHEN 'p10-ft' THEN 'Total Score' WHEN 'gf-ft' THEN 'Total Score'
  -- Catan
  WHEN 'cat-ir' THEN 'Road Length' WHEN 'cat-flr' THEN 'Longest Road Bonus'
  WHEN 'cat-ik' THEN 'Knights Played' WHEN 'cat-fla' THEN 'Largest Army Bonus'
  WHEN 'cat-ts' THEN 'Settlements' WHEN 'cat-tc' THEN 'Cities'
  WHEN 'cat-tv' THEN 'VP Development Cards' WHEN 'cat-ft' THEN 'Total Victory Points'
  -- Spades
  WHEN 'sp-ib' THEN 'Bid' WHEN 'sp-it' THEN 'Tricks Won'
  WHEN 'sp-fs' THEN 'Round Score' WHEN 'sp-fb' THEN 'Bags'
  -- Scrabble
  WHEN 'sc-ft' THEN 'Total Score'
  -- Cornhole
  WHEN 'ch-fs' THEN 'Total Score'
  -- Poker
  WHEN 'pk-ib' THEN 'Buy-in' WHEN 'pk-ic' THEN 'Cash-out'
  WHEN 'pk-fn' THEN 'Net' WHEN 'pk-fb' THEN 'Total Buy-ins'
  WHEN 'pk-fc' THEN 'Total Cash-outs' WHEN 'pk-fh' THEN 'House Balance'
  -- Ticket to Ride
  WHEN 'ttr-ir' THEN 'Route Points' WHEN 'ttr-itk' THEN 'Completed Tickets'
  WHEN 'ttr-iuf' THEN 'Unfinished Tickets' WHEN 'ttr-ilp' THEN 'Longest Path Length'
  WHEN 'ttr-flp' THEN 'Longest Path Bonus' WHEN 'ttr-ic' THEN 'Trains Remaining'
  WHEN 'ttr-ft' THEN 'Total Score'
  ELSE label
END
WHERE template_id IN ('yahtzee', 'uno', 'catan', 'spades', 'scrabble', 'cornhole', 'poker', 'phase10', 'golf', 'ticket');

-- Round/hole/detail inputs sit underneath their corresponding section.
UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.child', true)
WHERE id GLOB 'uno-r*'
   OR id GLOB 'p10-r*'
   OR id GLOB 'gf-h*'
   OR id GLOB 'ch-r*'
   OR id GLOB 'sc-w*';

-- The total rows should carry the same strong visual hierarchy as Wingspan.
UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.section', true)
WHERE id IN (
  'y-us-fs', 'y-us-fb', 'y-us-ft', 'y-ls-ft', 'y-gt-f',
  'uno-ft', 'p10-ft', 'gf-ft', 'sc-ft', 'ch-fs',
  'cat-ft', 'pk-fn', 'pk-fb', 'pk-fc', 'pk-fh', 'ttr-ft'
);

-- Add missing, visible section rows to the legacy templates. INSERT OR IGNORE
-- keeps this migration safely repeatable.
INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('cat-h-vp', 'catan', 0, 0, 1, 1, 'heading', 'h_victory_points', 'Victory Points', NULL, 0, '{"section":true}', 0),
  ('sp-h-round', 'spades', 0, 0, 1, 1, 'heading', 'h_round', 'This Round', NULL, 0, '{"section":true}', 0),
  ('pk-h-player', 'poker', 0, 0, 1, 1, 'heading', 'h_player', 'Player Results', NULL, 0, '{"section":true}', 0),
  ('ttr-h-score', 'ticket', 0, 0, 1, 1, 'heading', 'h_score', 'Score Breakdown', NULL, 0, '{"section":true}', 0);

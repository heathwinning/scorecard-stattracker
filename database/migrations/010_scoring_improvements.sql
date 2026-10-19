-- Scoring improvements for the system scorecards.
-- Run after 006_reseed_system_scorecards.sql (which resets the templates on every deploy) and 009.
-- Idempotent. Existing games keep their saved layout snapshots, so their layouts and values are unchanged.

-- ============================================================
-- Yahtzee: extra Yahtzees add a 100-point bonus to the lower section
-- ============================================================
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('y-ls-bonus','yahtzee',0,0,1,1,'tally','yahtzee_bonus','Yahtzee Bonuses',NULL,1,'{"min":0,"default":0,"help":"Count each extra Yahtzee rolled after scoring 50 in the Yahtzee box. Each is worth 100 points."}',35)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET formula_expr = 'SUM(three_kind, four_kind, full_house, sm_straight, lg_straight, yahtzee, chance) + yahtzee_bonus * 100' WHERE id = 'y-ls-ft';

-- ============================================================
-- Catan: Longest Road and Largest Army are single cards, so only one player can hold each
-- ============================================================
UPDATE template_cells SET cell_type = 'tally', cell_key = 'longest_road', label = 'Longest Road', config_json = '{"min":0,"max":1,"default":0,"help":"Tap + for the player holding the Longest Road card (a road of 5 or more). Worth 2 VP."}' WHERE id = 'cat-ir';
UPDATE template_cells SET formula_expr = 'longest_road * 2', label = 'Longest Road VP', config_json = '{"help":"Calculated automatically: 2 VP for the Longest Road card."}' WHERE id = 'cat-flr';
UPDATE template_cells SET cell_type = 'tally', cell_key = 'largest_army', label = 'Largest Army', config_json = '{"min":0,"max":1,"default":0,"help":"Tap + for the player holding the Largest Army card (3 or more knights played). Worth 2 VP."}' WHERE id = 'cat-ik';
UPDATE template_cells SET formula_expr = 'largest_army * 2', label = 'Largest Army VP', config_json = '{"help":"Calculated automatically: 2 VP for the Largest Army card."}' WHERE id = 'cat-fla';
UPDATE template_cells SET config_json = '{"min":0,"default":2,"step":1,"help":"Settlements still on the board. A city replaces its settlement, so do not count upgraded ones."}' WHERE id = 'cat-ts';
UPDATE template_cells SET config_json = '{"min":0,"default":0,"step":1,"help":"Cities on the board. Each is worth 2 VP."}' WHERE id = 'cat-tc';

-- ============================================================
-- Spades: nil bids
-- ============================================================
UPDATE templates SET description = 'Track bids and tricks in Spades. Scores 10 points per trick bid plus 1 per overtrick (bag), -10 per trick bid when the bid is missed, and +100 / -100 for a nil bid.', updated_at = datetime('now') WHERE id = 'spades';
UPDATE template_cells SET formula_expr = 'bid == 0 ? (tricks == 0 ? 100 : -100) : (tricks >= bid ? bid * 10 + (tricks - bid) : bid * -10)', config_json = '{"help":"Calculated automatically. A bid of 0 is nil: +100 if no tricks are won, otherwise -100."}' WHERE id = 'sp-fs';
UPDATE template_cells SET formula_expr = 'bid > 0 and tricks > bid ? tricks - bid : 0', config_json = '{"help":"Overtricks (bags) for this round. Nil bids do not collect bags."}' WHERE id = 'sp-fb';

-- ============================================================
-- Poker Night: each buy-in or rebuy is its own list entry
-- ============================================================
UPDATE templates SET description = 'Track buy-ins (including rebuys), cash-outs, and net profit/loss. Shows house balance for cash games with friends.', updated_at = datetime('now') WHERE id = 'poker';
UPDATE template_cells SET cell_type = 'input:list', label = 'Buy-ins', config_json = '{"default":0,"default_entries":1,"show_entry_total":true,"help":"Add one entry per buy-in or rebuy."}' WHERE id = 'pk-ib';

-- ============================================================
-- Scrabble: end-of-game tile adjustment
-- ============================================================
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('sc-adjust','scrabble',0,0,1,1,'input:number','endgame_adjustment','End-of-Game Adjustment',NULL,1,'{"default":0,"help":"Subtract the value of your unplayed tiles. The player who goes out adds the total of all opponents'''' tiles."}',900)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET formula_expr = 'SUM(word_points) + endgame_adjustment', config_json = '{"section":true,"help":"Calculated from all recorded word scores and the end-of-game adjustment."}' WHERE id = 'sc-total';

-- ============================================================
-- Ticket to Ride: routes by length, ticket lists, and a single longest-path card
-- ============================================================
UPDATE template_cells SET cell_type = 'formula', cell_key = 'route_points', label = 'Route Points', formula_expr = 'routes_1 * 1 + routes_2 * 2 + routes_3 * 4 + routes_4 * 7 + routes_5 * 10 + routes_6 * 15', per_player = 1, sort_order = 10, config_json = '{"help":"Calculated automatically from the number of claimed routes of each length."}' WHERE id = 'ttr-ir';
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('ttr-route-1','ticket',0,0,1,1,'tally','routes_1','1-train routes',NULL,1,'{"child":true,"min":0,"default":0,"help":"Routes of length 1. Each scores 1 point."}',11),
  ('ttr-route-2','ticket',0,0,1,1,'tally','routes_2','2-train routes',NULL,1,'{"child":true,"min":0,"default":0,"help":"Routes of length 2. Each scores 2 points."}',12),
  ('ttr-route-3','ticket',0,0,1,1,'tally','routes_3','3-train routes',NULL,1,'{"child":true,"min":0,"default":0,"help":"Routes of length 3. Each scores 4 points."}',13),
  ('ttr-route-4','ticket',0,0,1,1,'tally','routes_4','4-train routes',NULL,1,'{"child":true,"min":0,"default":0,"help":"Routes of length 4. Each scores 7 points."}',14),
  ('ttr-route-5','ticket',0,0,1,1,'tally','routes_5','5-train routes',NULL,1,'{"child":true,"min":0,"default":0,"help":"Routes of length 5. Each scores 10 points."}',15),
  ('ttr-route-6','ticket',0,0,1,1,'tally','routes_6','6-train routes',NULL,1,'{"child":true,"min":0,"default":0,"help":"Routes of length 6. Each scores 15 points."}',16)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET cell_type = 'input:list', label = 'Completed Tickets', sort_order = 20, config_json = '{"default":0,"default_entries":1,"show_entry_total":true,"help":"Add one entry per completed destination ticket."}' WHERE id = 'ttr-itk';
UPDATE template_cells SET cell_type = 'input:list', label = 'Unfinished Tickets', sort_order = 30, config_json = '{"default":0,"default_entries":0,"show_entry_total":true,"help":"Add one entry per unfinished destination ticket, using its positive point value. The total is subtracted from the score."}' WHERE id = 'ttr-iuf';
UPDATE template_cells SET cell_type = 'tally', cell_key = 'longest_path', label = 'Longest Path', sort_order = 40, config_json = '{"min":0,"max":1,"default":0,"help":"Tap + for each player holding the Longest Continuous Path card (ties share it). Worth 10 points."}' WHERE id = 'ttr-ilp';
UPDATE template_cells SET formula_expr = 'longest_path * 10', label = 'Longest Path Bonus', sort_order = 41, config_json = '{"help":"Calculated automatically: 10 points for the Longest Continuous Path card."}' WHERE id = 'ttr-flp';
UPDATE template_cells SET cell_type = 'formula', formula_expr = '45 - (routes_1 * 1 + routes_2 * 2 + routes_3 * 3 + routes_4 * 4 + routes_5 * 5 + routes_6 * 6)', label = 'Trains Remaining', sort_order = 50, config_json = '{"help":"Not scored. Calculated from 45 trains minus those used on claimed routes."}' WHERE id = 'ttr-ic';

-- ============================================================
-- Cribbage: hand and crib are entered as points, not tapped one at a time
-- ============================================================
UPDATE templates SET description = 'Track pegging, hand, and crib points for each round. Running totals make it easy to race to 121.', updated_at = datetime('now') WHERE id = 'cribbage';
UPDATE template_cells SET cell_type = 'input:number', config_json = '{"inline_group":"cribbage-round","repeatable_group":"cribbage-round","repeatable_label":"Round","inline_label":"Hand","default":0,"help":"Points counted in your hand this round."}' WHERE id = 'crib-round-hand';
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('crib-round-crib','cribbage',0,0,1,1,'input:number','crib','',NULL,1,'{"inline_group":"cribbage-round","repeatable_group":"cribbage-round","repeatable_label":"Round","inline_label":"Crib","default":0,"help":"Points counted in the crib. Only the dealer scores it."}',3)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET sort_order = 4 WHERE id = 'crib-round-total';

-- ============================================================
-- Terraforming Mars: award placings, city adjacency, and cards as entries
-- ============================================================
UPDATE template_cells SET sort_order = 10 WHERE id = 'tm-rating';
UPDATE template_cells SET cell_key = 'awards_first', label = 'Awards (1st)', sort_order = 20, config_json = '{"section":true,"min":0,"max":3,"default":0,"help":"Funded awards where you placed first. Each is worth 5 points."}' WHERE id = 'tm-awards';
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('tm-awards-2','terraforming-mars',0,0,1,1,'tally','awards_second','Awards (2nd)',NULL,1,'{"section":true,"min":0,"max":3,"default":0,"help":"Funded awards where you placed second. Each is worth 2 points."}',30)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET sort_order = 40, config_json = '{"section":true,"min":0,"max":3,"default":0,"help":"Number of claimed milestones. Each is worth 5 points."}' WHERE id = 'tm-milestones';
UPDATE template_cells SET sort_order = 50 WHERE id = 'tm-greenery';
UPDATE template_cells SET cell_type = 'input:list', label = 'Cities', sort_order = 60, config_json = '{"default":0,"default_entries":1,"show_entry_total":true,"section":true,"help":"Add one entry per city: the number of greenery tiles adjacent to it, owned by anyone."}' WHERE id = 'tm-city';
UPDATE template_cells SET cell_type = 'input:list', label = 'Card Points', sort_order = 70, config_json = '{"default":0,"default_entries":1,"show_entry_total":true,"section":true,"help":"Add one entry per card with victory points, including points from resources on cards."}' WHERE id = 'tm-cards';
UPDATE template_cells SET formula_expr = 'terraform_rating + awards_first * 5 + awards_second * 2 + milestones * 5 + greenery + city_points + card_points' WHERE id = 'tm-total';
UPDATE templates SET description = 'Calculate final points from Terraform Rating, award placings, milestones, greenery, cities, and card points.', updated_at = datetime('now') WHERE id = 'terraforming-mars';

-- ============================================================
-- Cascadia: named wildlife and habitat subsections
-- ============================================================
UPDATE template_cells SET cell_type = 'formula', formula_expr = 'bear + elk + salmon + hawk + fox', label = 'Wildlife', sort_order = 10, config_json = '{"section":true,"help":"Calculated automatically from the five wildlife scores."}' WHERE id = 'ca-wildlife';
UPDATE template_cells SET cell_type = 'formula', formula_expr = 'hab_mountain + hab_forest + hab_prairie + hab_wetland + hab_river + habitat_bonus', label = 'Habitat Corridors', sort_order = 20, config_json = '{"section":true,"help":"Calculated automatically from the largest corridor of each habitat plus majority bonuses."}' WHERE id = 'ca-habitats';
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('ca-w-bear','cascadia',0,0,1,1,'input:number','bear','Bear',NULL,1,'{"child":true,"default":0,"help":"Points from the Bear wildlife scoring card."}',11),
  ('ca-w-elk','cascadia',0,0,1,1,'input:number','elk','Elk',NULL,1,'{"child":true,"default":0,"help":"Points from the Elk wildlife scoring card."}',12),
  ('ca-w-salmon','cascadia',0,0,1,1,'input:number','salmon','Salmon',NULL,1,'{"child":true,"default":0,"help":"Points from the Salmon wildlife scoring card."}',13),
  ('ca-w-hawk','cascadia',0,0,1,1,'input:number','hawk','Hawk',NULL,1,'{"child":true,"default":0,"help":"Points from the Hawk wildlife scoring card."}',14),
  ('ca-w-fox','cascadia',0,0,1,1,'input:number','fox','Fox',NULL,1,'{"child":true,"default":0,"help":"Points from the Fox wildlife scoring card."}',15),
  ('ca-h-mountain','cascadia',0,0,1,1,'input:number','hab_mountain','Mountain',NULL,1,'{"child":true,"default":0,"help":"Size of your largest Mountain corridor."}',21),
  ('ca-h-forest','cascadia',0,0,1,1,'input:number','hab_forest','Forest',NULL,1,'{"child":true,"default":0,"help":"Size of your largest Forest corridor."}',22),
  ('ca-h-prairie','cascadia',0,0,1,1,'input:number','hab_prairie','Prairie',NULL,1,'{"child":true,"default":0,"help":"Size of your largest Prairie corridor."}',23),
  ('ca-h-wetland','cascadia',0,0,1,1,'input:number','hab_wetland','Wetland',NULL,1,'{"child":true,"default":0,"help":"Size of your largest Wetland corridor."}',24),
  ('ca-h-river','cascadia',0,0,1,1,'input:number','hab_river','River',NULL,1,'{"child":true,"default":0,"help":"Size of your largest River corridor."}',25),
  ('ca-h-bonus','cascadia',0,0,1,1,'input:number','habitat_bonus','Habitat Majority Bonuses',NULL,1,'{"child":true,"default":0,"help":"Bonus points for having the largest corridor of a habitat."}',26)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET sort_order = 30 WHERE id = 'ca-nature';
UPDATE templates SET description = 'Calculate end-game points from wildlife cards, habitat corridors (with majority bonuses), and nature tokens.', updated_at = datetime('now') WHERE id = 'cascadia';

-- ============================================================
-- Azul: end-of-game bonuses
-- ============================================================
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('az-bonus-h','azul',0,0,1,1,'heading','azul_bonus_heading','End-of-Game Bonuses',NULL,0,'{"section":true,"help":"Count completed wall rows, columns, and colours at the end of the game."}',900),
  ('az-rows','azul',0,0,1,1,'tally','complete_rows','Complete Rows',NULL,1,'{"child":true,"min":0,"max":5,"default":0,"help":"Horizontal rows with all five tiles. Worth 2 points each."}',901),
  ('az-cols','azul',0,0,1,1,'tally','complete_columns','Complete Columns',NULL,1,'{"child":true,"min":0,"max":5,"default":0,"help":"Vertical columns with all five tiles. Worth 7 points each."}',902),
  ('az-sets','azul',0,0,1,1,'tally','complete_colours','Complete Colours',NULL,1,'{"child":true,"min":0,"max":5,"default":0,"help":"Colours with all five tiles placed. Worth 10 points each."}',903)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET formula_expr = 'SUM(round_score) + complete_rows * 2 + complete_columns * 7 + complete_colours * 10', config_json = '{"section":true,"help":"Calculated from every recorded round plus the end-of-game bonuses."}' WHERE id = 'az-total';
UPDATE templates SET description = 'Record each round''s score, track the running total, and add end-of-game row, column, and colour bonuses.', updated_at = datetime('now') WHERE id = 'azul';

-- ============================================================
-- Uno and Phase 10: any number of rounds instead of a fixed set
-- ============================================================
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('uno-hand-score','uno',0,0,1,1,'input:number','round_score','',NULL,1,'{"inline_group":"uno-round","repeatable_group":"uno-round","repeatable_label":"Round","inline_label":"Score","default":0,"help":"Enter the points for this round."}',2),
  ('uno-hand-total','uno',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"uno-round","repeatable_group":"uno-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',3),
  ('uno-grand','uno',0,0,1,1,'formula','total_score','Total Score','SUM(round_score)',1,'{"section":true,"help":"Calculated from every recorded round."}',1000)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET sort_order = -1 WHERE template_id = 'uno' AND id NOT IN ('uno-hand-score', 'uno-hand-total', 'uno-grand');
INSERT INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('ph10-score','phase10',0,0,1,1,'input:number','round_score','',NULL,1,'{"inline_group":"phase10-round","repeatable_group":"phase10-round","repeatable_label":"Round","inline_label":"Score","default":0,"help":"Record each player''s points at the end of the round."}',20),
  ('ph10-running','phase10',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"phase10-round","repeatable_group":"phase10-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',21),
  ('ph10-total','phase10',0,0,1,1,'formula','total_score','Total Score','SUM(round_score)',1,'{"section":true,"help":"Calculated from every recorded round. The lowest total wins."}',1000)
ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, row_pos=excluded.row_pos, col_pos=excluded.col_pos, row_span=excluded.row_span, col_span=excluded.col_span, cell_type=excluded.cell_type, cell_key=excluded.cell_key, label=excluded.label, formula_expr=excluded.formula_expr, per_player=excluded.per_player, config_json=excluded.config_json, sort_order=excluded.sort_order;
UPDATE template_cells SET sort_order = -1 WHERE template_id = 'phase10' AND id NOT IN ('ph10-score', 'ph10-running', 'ph10-total', 'p10-ip');
UPDATE template_cells SET sort_order = 1, config_json = '{"min":1,"max":10,"default":1,"step":1,"help":"Advance this when the player completes their current phase."}' WHERE id = 'p10-ip';
UPDATE templates SET description = 'Track rounds of Uno. Add a round whenever a hand finishes and record each player''s points. Running totals update automatically.', updated_at = datetime('now') WHERE id = 'uno';
UPDATE templates SET description = 'Track each player''s current phase and the score from every round. Lowest total score wins. Players complete 10 phases in order.', updated_at = datetime('now') WHERE id = 'phase10';

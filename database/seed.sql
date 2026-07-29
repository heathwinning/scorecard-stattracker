-- Wipe all seed data so fresh import takes effect
DELETE FROM cell_values WHERE template_cell_id IN (SELECT id FROM template_cells WHERE template_id LIKE 'tpl-%');
DELETE FROM template_cells WHERE template_id LIKE 'tpl-%';
DELETE FROM scorecards WHERE template_id LIKE 'tpl-%';
DELETE FROM templates WHERE id LIKE 'tpl-%';
-- Seed data: games catalog + 10 default templates
-- System user for default templates
INSERT OR IGNORE INTO users (id, email, name, avatar_url) VALUES
  ('system', 'system@scorecard.local', 'Scorecard System', '');

-- ============================================================
-- Games Catalog (for filtering templates by game)
-- ============================================================
INSERT OR IGNORE INTO games (id, name, slug, category, player_count, icon) VALUES
  ('game-yahtzee', 'Yahtzee', 'yahtzee', 'dice', '1-6', '🎲'),
  ('game-uno', 'Uno', 'uno', 'card', '2-10', '🃏'),
  ('game-catan', 'Catan', 'catan', 'board', '3-4', '🏝️'),
  ('game-spades', 'Spades', 'spades', 'card', '4', '♠️'),
  ('game-scrabble', 'Scrabble', 'scrabble', 'tile', '2-4', '📝'),
  ('game-cornhole', 'Cornhole', 'cornhole', 'sport', '2-4', 'Hole'),
  ('game-poker', 'Poker', 'poker', 'card', '2-10', '♦️'),
  ('game-phase10', 'Phase 10', 'phase-10', 'card', '2-6', '🔟'),
  ('game-golf-card', 'Golf (Card Game)', 'golf-card', 'card', '2-6', '⛳'),
  ('game-ticket-to-ride', 'Ticket to Ride', 'ticket-to-ride', 'board', '2-5', '🚂'),
  ('game-carcassonne', 'Carcassonne', 'carcassonne', 'tile', '2-5', '🏰'),
  ('game-7-wonders', '7 Wonders', '7-wonders', 'board', '2-7', '🏛️'),
  ('game-azul', 'Azul', 'azul', 'tile', '2-4', '🟦'),
  ('game-codenames', 'Codenames', 'codenames', 'party', '4-8', '🕵️'),
  ('game-wavelength', 'Wavelength', 'wavelength', 'party', '2-12', '📡'),
  ('game-monopoly', 'Monopoly', 'monopoly', 'board', '2-8', '🏠'),
  ('game-risk', 'Risk', 'risk', 'board', '2-6', '⚔️'),
  ('game-clue', 'Clue', 'clue', 'board', '3-6', '🔍'),
  ('game-battleship', 'Battleship', 'battleship', 'board', '2', '🚢'),
  ('game-connect-four', 'Connect Four', 'connect-four', 'board', '2', '🔴'),
  ('game-chess', 'Chess', 'chess', 'board', '2', '♟️'),
  ('game-checkers', 'Checkers', 'checkers', 'board', '2', '⭕'),
  ('game-dominion', 'Dominion', 'dominion', 'card', '2-4', '👑'),
  ('game-wingspan', 'Wingspan', 'wingspan', 'board', '1-5', '🐦'),
  ('game-terraforming-mars', 'Terraforming Mars', 'terraforming-mars', 'board', '1-5', '🔴'),
  ('game-splendor', 'Splendor', 'splendor', 'board', '2-4', '💎'),
  ('game-patchwork', 'Patchwork', 'patchwork', 'board', '2', '🧵'),
  ('game-qwirkle', 'Qwirkle', 'qwirkle', 'tile', '2-4', '🔶'),
  ('game-dominoes', 'Dominoes', 'dominoes', 'tile', '2-4', '🀄'),
  ('game-rummy', 'Rummy', 'rummy', 'card', '2-6', '🃏'),
  ('game-hearts', 'Hearts', 'hearts', 'card', '3-6', '♥️'),
  ('game-bridge', 'Bridge', 'bridge', 'card', '4', '🌉'),
  ('game-euchre', 'Euchre', 'euchre', 'card', '4', '🃏'),
  ('game-cribbage', 'Cribbage', 'cribbage', 'board', '2-3', '📋'),
  ('game-backgammon', 'Backgammon', 'backgammon', 'board', '2', '🎯'),
  ('game-farkle', 'Farkle', 'farkle', 'dice', '2-8', '🎲'),
  ('game-liars-dice', 'Liar''s Dice', 'liars-dice', 'dice', '2-6', '🎲'),
  ('game-darts', 'Darts', 'darts', 'sport', '1-4', '🎯'),
  ('game-bowling', 'Bowling', 'bowling', 'sport', '1-6', '🎳'),
  ('game-mini-golf', 'Mini Golf', 'mini-golf', 'sport', '1-4', '⛳'),
  ('game-ping-pong', 'Ping Pong', 'ping-pong', 'sport', '2-4', '🏓'),
  ('game-pickleball', 'Pickleball', 'pickleball', 'sport', '2-4', '🏸'),
  ('game-code-names-duet', 'Codenames Duet', 'codenames-duet', 'party', '2', '🤝'),
  ('game-telestrations', 'Telestrations', 'telestrations', 'party', '4-8', '✏️');


-- ============================================================
-- TEMPLATE 1: Yahtzee
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-yahtzee', 'Yahtzee', 'Classic dice game scorecard. Upper section (1s-6s) with 63-point bonus, lower section (3 of a kind through Yahtzee), auto-calculated totals.', 'game-yahtzee', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
-- Header
-- Upper Section
('y-us-h', 'tpl-yahtzee', 1, 0, 1, 2, 'heading', 'h_upper', 'Upper Section', NULL, 0, '{}', 1),
('y-us-l1', 'tpl-yahtzee', 2, 0, 1, 1, 'label', 'lbl_ones', 'Ones', NULL, 0, '{}', 2),
('y-us-i1', 'tpl-yahtzee', 2, 1, 1, 1, 'input:number', 'ones', '', NULL, 1, '{"default":0}', 3),
('y-us-l2', 'tpl-yahtzee', 3, 0, 1, 1, 'label', 'lbl_twos', 'Twos', NULL, 0, '{}', 4),
('y-us-i2', 'tpl-yahtzee', 3, 1, 1, 1, 'input:number', 'twos', '', NULL, 1, '{"default":0}', 5),
('y-us-l3', 'tpl-yahtzee', 4, 0, 1, 1, 'label', 'lbl_threes', 'Threes', NULL, 0, '{}', 6),
('y-us-i3', 'tpl-yahtzee', 4, 1, 1, 1, 'input:number', 'threes', '', NULL, 1, '{"default":0}', 7),
('y-us-l4', 'tpl-yahtzee', 5, 0, 1, 1, 'label', 'lbl_fours', 'Fours', NULL, 0, '{}', 8),
('y-us-i4', 'tpl-yahtzee', 5, 1, 1, 1, 'input:number', 'fours', '', NULL, 1, '{"default":0}', 9),
('y-us-l5', 'tpl-yahtzee', 6, 0, 1, 1, 'label', 'lbl_fives', 'Fives', NULL, 0, '{}', 10),
('y-us-i5', 'tpl-yahtzee', 6, 1, 1, 1, 'input:number', 'fives', '', NULL, 1, '{"default":0}', 11),
('y-us-l6', 'tpl-yahtzee', 7, 0, 1, 1, 'label', 'lbl_sixes', 'Sixes', NULL, 0, '{}', 12),
('y-us-i6', 'tpl-yahtzee', 7, 1, 1, 1, 'input:number', 'sixes', '', NULL, 1, '{"default":0}', 13),
-- Upper subtotal + bonus + total
('y-us-st', 'tpl-yahtzee', 8, 0, 1, 1, 'label', 'lbl_upper_sub', 'Upper Subtotal', NULL, 0, '{}', 14),
('y-us-fs', 'tpl-yahtzee', 8, 1, 1, 1, 'formula', 'upper_subtotal', '', 'SUM(ones, twos, threes, fours, fives, sixes)', 1, '{}', 15),
('y-us-bl', 'tpl-yahtzee', 9, 0, 1, 1, 'label', 'lbl_bonus', 'Bonus', NULL, 0, '{}', 16),
('y-us-fb', 'tpl-yahtzee', 9, 1, 1, 1, 'formula', 'upper_bonus', '', 'upper_subtotal >= 63 ? 35 : 0', 1, '{}', 17),
('y-us-tl', 'tpl-yahtzee', 10, 0, 1, 1, 'label', 'lbl_upper_total', 'Upper Total', NULL, 0, '{}', 18),
('y-us-ft', 'tpl-yahtzee', 10, 1, 1, 1, 'formula', 'upper_total', '', 'upper_subtotal + upper_bonus', 1, '{}', 19),
-- Lower Section
('y-ls-h', 'tpl-yahtzee', 11, 0, 1, 2, 'heading', 'h_lower', 'Lower Section', NULL, 0, '{}', 20),
('y-ls-l1', 'tpl-yahtzee', 12, 0, 1, 1, 'label', 'lbl_3kind', '3 of a Kind', NULL, 0, '{}', 21),
('y-ls-i1', 'tpl-yahtzee', 12, 1, 1, 1, 'input:number', 'three_kind', '', NULL, 1, '{"default":0}', 22),
('y-ls-l2', 'tpl-yahtzee', 13, 0, 1, 1, 'label', 'lbl_4kind', '4 of a Kind', NULL, 0, '{}', 23),
('y-ls-i2', 'tpl-yahtzee', 13, 1, 1, 1, 'input:number', 'four_kind', '', NULL, 1, '{"default":0}', 24),
('y-ls-l3', 'tpl-yahtzee', 14, 0, 1, 1, 'label', 'lbl_fh', 'Full House', NULL, 0, '{}', 25),
('y-ls-i3', 'tpl-yahtzee', 14, 1, 1, 1, 'input:number', 'full_house', '', NULL, 1, '{"default":0}', 26),
('y-ls-l4', 'tpl-yahtzee', 15, 0, 1, 1, 'label', 'lbl_smstr', 'Sm. Straight', NULL, 0, '{}', 27),
('y-ls-i4', 'tpl-yahtzee', 15, 1, 1, 1, 'input:number', 'sm_straight', '', NULL, 1, '{"default":0}', 28),
('y-ls-l5', 'tpl-yahtzee', 16, 0, 1, 1, 'label', 'lbl_lgstr', 'Lg. Straight', NULL, 0, '{}', 29),
('y-ls-i5', 'tpl-yahtzee', 16, 1, 1, 1, 'input:number', 'lg_straight', '', NULL, 1, '{"default":0}', 30),
('y-ls-l6', 'tpl-yahtzee', 17, 0, 1, 1, 'label', 'lbl_yahtzee', 'Yahtzee', NULL, 0, '{}', 31),
('y-ls-i6', 'tpl-yahtzee', 17, 1, 1, 1, 'input:number', 'yahtzee', '', NULL, 1, '{"default":0}', 32),
('y-ls-l7', 'tpl-yahtzee', 18, 0, 1, 1, 'label', 'lbl_chance', 'Chance', NULL, 0, '{}', 33),
('y-ls-i7', 'tpl-yahtzee', 18, 1, 1, 1, 'input:number', 'chance', '', NULL, 1, '{"default":0}', 34),
-- Lower total
('y-ls-lt', 'tpl-yahtzee', 19, 0, 1, 1, 'label', 'lbl_lower_total', 'Lower Total', NULL, 0, '{}', 35),
('y-ls-ft', 'tpl-yahtzee', 19, 1, 1, 1, 'formula', 'lower_total', '', 'SUM(three_kind, four_kind, full_house, sm_straight, lg_straight, yahtzee, chance)', 1, '{}', 36),
-- Grand Total
('y-gt-l', 'tpl-yahtzee', 20, 0, 1, 1, 'label', 'lbl_grand', 'Grand Total', NULL, 0, '{}', 37),
('y-gt-f', 'tpl-yahtzee', 20, 1, 1, 1, 'formula', 'grand_total', '', 'upper_total + lower_total', 1, '{}', 38);

-- ============================================================
-- TEMPLATE 2: Uno
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-uno', 'Uno', 'Track rounds of Uno. Record remaining cards per player per round. Lowest running total wins.', 'game-uno', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('uno-ln', 'tpl-uno', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('uno-lt', 'tpl-uno', 1, 1, 1, 1, 'label', 'lbl_total', 'Total', NULL, 0, '{}', 2),
('uno-ft', 'tpl-uno', 2, 1, 1, 1, 'formula', 'player_total', 'Total', 'SUM(round_*)', 1, '{}', 14),
('uno-rh', 'tpl-uno', 3, 0, 1, 8, 'heading', 'h_rounds', 'Rounds', NULL, 0, '{}', 5),
('uno-r1', 'tpl-uno', 4, 0, 1, 1, 'input:number', 'round_1', 'R1', NULL, 1, '{"default":0}', 6),
('uno-r2', 'tpl-uno', 4, 1, 1, 1, 'input:number', 'round_2', 'R2', NULL, 1, '{"default":0}', 7),
('uno-r3', 'tpl-uno', 4, 2, 1, 1, 'input:number', 'round_3', 'R3', NULL, 1, '{"default":0}', 8),
('uno-r4', 'tpl-uno', 4, 3, 1, 1, 'input:number', 'round_4', 'R4', NULL, 1, '{"default":0}', 9),
('uno-r5', 'tpl-uno', 4, 4, 1, 1, 'input:number', 'round_5', 'R5', NULL, 1, '{"default":0}', 10),
('uno-r6', 'tpl-uno', 4, 5, 1, 1, 'input:number', 'round_6', 'R6', NULL, 1, '{"default":0}', 11),
('uno-r7', 'tpl-uno', 4, 6, 1, 1, 'input:number', 'round_7', 'R7', NULL, 1, '{"default":0}', 12),
('uno-r8', 'tpl-uno', 4, 7, 1, 1, 'input:number', 'round_8', 'R8', NULL, 1, '{"default":0}', 13);

-- ============================================================
-- TEMPLATE 3: Catan
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-catan', 'Catan', 'Track Victory Points. Count settlements, cities, longest road, largest army, and VP development cards. Auto-calculates totals with conditional bonuses.', 'game-catan', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('cat-ln', 'tpl-catan', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('cat-lvp', 'tpl-catan', 1, 2, 1, 1, 'label', 'lbl_vp', 'Total VP', NULL, 0, '{}', 2),
-- Route length for longest road
('cat-llr', 'tpl-catan', 2, 1, 1, 1, 'label', 'lbl_lr', 'Longest Road', NULL, 1, '{}', 4),
('cat-ir', 'tpl-catan', 3, 1, 1, 1, 'input:number', 'road_length', '', NULL, 1, '{"default":0}', 5),
('cat-flr', 'tpl-catan', 3, 2, 1, 1, 'formula', 'road_vp', '', 'road_length >= 5 ? 2 : 0', 1, '{}', 6),
-- Knights for largest army
('cat-lla', 'tpl-catan', 4, 1, 1, 1, 'label', 'lbl_army', 'Largest Army', NULL, 1, '{}', 7),
('cat-ik', 'tpl-catan', 5, 1, 1, 1, 'input:number', 'knights', '', NULL, 1, '{"default":0}', 8),
('cat-fla', 'tpl-catan', 5, 2, 1, 1, 'formula', 'army_vp', '', 'knights >= 3 ? 2 : 0', 1, '{}', 9),
-- Settlements
('cat-ls', 'tpl-catan', 6, 1, 1, 1, 'label', 'lbl_settle', 'Settlements', NULL, 1, '{}', 10),
('cat-ts', 'tpl-catan', 7, 1, 1, 1, 'tally', 'settlements', '', NULL, 1, '{"min":0,"default":2,"step":1}', 11),
-- Cities
('cat-lc', 'tpl-catan', 8, 1, 1, 1, 'label', 'lbl_cities', 'Cities', NULL, 1, '{}', 12),
('cat-tc', 'tpl-catan', 9, 1, 1, 1, 'tally', 'cities', '', NULL, 1, '{"min":0,"default":0,"step":1}', 13),
-- VP Cards
('cat-lv', 'tpl-catan', 10, 1, 1, 1, 'label', 'lbl_vpcards', 'VP Dev Cards', NULL, 1, '{}', 14),
('cat-tv', 'tpl-catan', 11, 1, 1, 1, 'tally', 'vp_cards', '', NULL, 1, '{"min":0,"default":0,"step":1}', 15),
-- Total
('cat-ft', 'tpl-catan', 2, 2, 1, 1, 'formula', 'total_vp', '', 'settlements + cities * 2 + road_vp + army_vp + vp_cards', 1, '{}', 16);

-- ============================================================
-- TEMPLATE 4: Spades
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-spades', 'Spades', 'Track bids and tricks in Spades. Calculates scores: 10 pts per trick bid, 1 pt per overtrick (bag). -10 pts per undertrick per bid missed.', 'game-spades', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('sp-lp', 'tpl-spades', 1, 0, 1, 1, 'label', 'lbl_player', 'Player', NULL, 0, '{}', 1),
('sp-lb', 'tpl-spades', 1, 1, 1, 1, 'label', 'lbl_bid', 'Bid', NULL, 0, '{}', 2),
('sp-lt', 'tpl-spades', 1, 2, 1, 1, 'label', 'lbl_tricks', 'Tricks', NULL, 0, '{}', 3),
('sp-ls', 'tpl-spades', 1, 3, 1, 1, 'label', 'lbl_score', 'Score', NULL, 0, '{}', 4),
('sp-lbg', 'tpl-spades', 1, 4, 1, 1, 'label', 'lbl_bags', 'Bags', NULL, 0, '{}', 5),
('sp-ib', 'tpl-spades', 2, 1, 1, 1, 'input:number', 'bid', '', NULL, 1, '{"default":0}', 7),
('sp-it', 'tpl-spades', 2, 2, 1, 1, 'input:number', 'tricks', '', NULL, 1, '{"default":0}', 8),
('sp-fs', 'tpl-spades', 2, 3, 1, 1, 'formula', 'round_score', '', 'tricks >= bid ? bid * 10 + (tricks - bid) : bid * -10', 1, '{}', 9),
('sp-fb', 'tpl-spades', 2, 4, 1, 1, 'formula', 'bags', '', 'tricks > bid ? tricks - bid : 0', 1, '{}', 10);

-- ============================================================
-- TEMPLATE 5: Scrabble
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-scrabble', 'Scrabble', 'Track Scrabble word scores. Enter each word played and its score. Auto-calculates running total per player.', 'game-scrabble', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('sc-ln', 'tpl-scrabble', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('sc-lt', 'tpl-scrabble', 1, 2, 1, 1, 'label', 'lbl_total', 'Total', NULL, 0, '{}', 2),
('sc-ft', 'tpl-scrabble', 2, 2, 1, 1, 'formula', 'player_total', 'Total', 'SUM(word_*)', 1, '{}', 21),
('sc-wh', 'tpl-scrabble', 3, 0, 1, 3, 'heading', 'h_words', 'Words', NULL, 0, '{}', 5),
('sc-w1l', 'tpl-scrabble', 4, 0, 1, 1, 'input:text', 'word_1_name', 'Word', NULL, 1, '{"placeholder":"Word"}', 6),
('sc-w1s', 'tpl-scrabble', 4, 1, 1, 1, 'input:number', 'word_1', 'Score', NULL, 1, '{"default":0}', 7),
('sc-w2l', 'tpl-scrabble', 5, 0, 1, 1, 'input:text', 'word_2_name', 'Word', NULL, 1, '{"placeholder":"Word"}', 8),
('sc-w2s', 'tpl-scrabble', 5, 1, 1, 1, 'input:number', 'word_2', 'Score', NULL, 1, '{"default":0}', 9),
('sc-w3l', 'tpl-scrabble', 6, 0, 1, 1, 'input:text', 'word_3_name', 'Word', NULL, 1, '{"placeholder":"Word"}', 10),
('sc-w3s', 'tpl-scrabble', 6, 1, 1, 1, 'input:number', 'word_3', 'Score', NULL, 1, '{"default":0}', 11),
('sc-w4s', 'tpl-scrabble', 7, 1, 1, 1, 'input:number', 'word_4', 'Score', NULL, 1, '{"default":0}', 12),
('sc-w5s', 'tpl-scrabble', 8, 1, 1, 1, 'input:number', 'word_5', 'Score', NULL, 1, '{"default":0}', 13),
('sc-w6s', 'tpl-scrabble', 9, 1, 1, 1, 'input:number', 'word_6', 'Score', NULL, 1, '{"default":0}', 14),
('sc-w7s', 'tpl-scrabble', 10, 1, 1, 1, 'input:number', 'word_7', 'Score', NULL, 1, '{"default":0}', 15),
('sc-w8s', 'tpl-scrabble', 11, 1, 1, 1, 'input:number', 'word_8', 'Score', NULL, 1, '{"default":0}', 16),
('sc-w9s', 'tpl-scrabble', 12, 1, 1, 1, 'input:number', 'word_9', 'Score', NULL, 1, '{"default":0}', 17),
('sc-w10s', 'tpl-scrabble', 13, 1, 1, 1, 'input:number', 'word_10', 'Score', NULL, 1, '{"default":0}', 18),
('sc-w11s', 'tpl-scrabble', 14, 1, 1, 1, 'input:number', 'word_11', 'Score', NULL, 1, '{"default":0}', 19),
('sc-w12s', 'tpl-scrabble', 15, 1, 1, 1, 'input:number', 'word_12', 'Score', NULL, 1, '{"default":0}', 20);

-- ============================================================
-- TEMPLATE 6: Cornhole
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-cornhole', 'Cornhole / Bags', 'Track cornhole rounds. Enter bags in the hole (3 pts) and on the board (1 pt) per team per round. Auto-calculates totals.', 'game-cornhole', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('ch-ln', 'tpl-cornhole', 1, 0, 1, 1, 'label', 'lbl_team', 'Team', NULL, 0, '{}', 1),
('ch-ls', 'tpl-cornhole', 1, 1, 1, 1, 'label', 'lbl_score', 'Total Score', NULL, 0, '{}', 2),
('ch-fs', 'tpl-cornhole', 2, 1, 1, 1, 'formula', 'total_score', 'Score', 'SUM(hole_*) * 3 + SUM(board_*)', 1, '{}', 18),
('ch-rh', 'tpl-cornhole', 3, 0, 1, 5, 'heading', 'h_rounds', 'Rounds', NULL, 0, '{}', 5),
('ch-r1h', 'tpl-cornhole', 4, 0, 1, 1, 'input:number', 'hole_1', 'R1 Hole', NULL, 1, '{"default":0}', 6),
('ch-r1b', 'tpl-cornhole', 4, 1, 1, 1, 'input:number', 'board_1', 'R1 Board', NULL, 1, '{"default":0}', 7),
('ch-r2h', 'tpl-cornhole', 4, 2, 1, 1, 'input:number', 'hole_2', 'R2 Hole', NULL, 1, '{"default":0}', 8),
('ch-r2b', 'tpl-cornhole', 4, 3, 1, 1, 'input:number', 'board_2', 'R2 Board', NULL, 1, '{"default":0}', 9),
('ch-r3h', 'tpl-cornhole', 5, 0, 1, 1, 'input:number', 'hole_3', 'R3 Hole', NULL, 1, '{"default":0}', 10),
('ch-r3b', 'tpl-cornhole', 5, 1, 1, 1, 'input:number', 'board_3', 'R3 Board', NULL, 1, '{"default":0}', 11),
('ch-r4h', 'tpl-cornhole', 5, 2, 1, 1, 'input:number', 'hole_4', 'R4 Hole', NULL, 1, '{"default":0}', 12),
('ch-r4b', 'tpl-cornhole', 5, 3, 1, 1, 'input:number', 'board_4', 'R4 Board', NULL, 1, '{"default":0}', 13),
('ch-r5h', 'tpl-cornhole', 6, 0, 1, 1, 'input:number', 'hole_5', 'R5 Hole', NULL, 1, '{"default":0}', 14),
('ch-r5b', 'tpl-cornhole', 6, 1, 1, 1, 'input:number', 'board_5', 'R5 Board', NULL, 1, '{"default":0}', 15),
('ch-r6h', 'tpl-cornhole', 6, 2, 1, 1, 'input:number', 'hole_6', 'R6 Hole', NULL, 1, '{"default":0}', 16),
('ch-r6b', 'tpl-cornhole', 6, 3, 1, 1, 'input:number', 'board_6', 'R6 Board', NULL, 1, '{"default":0}', 17);

-- ============================================================
-- TEMPLATE 7: Poker Night
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-poker', 'Poker Night', 'Track buy-ins, cash-outs, and net profit/loss. Shows house balance for cash games with friends.', 'game-poker', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('pk-ln', 'tpl-poker', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('pk-lb', 'tpl-poker', 1, 1, 1, 1, 'label', 'lbl_buyin', 'Buy-in', NULL, 0, '{}', 2),
('pk-lc', 'tpl-poker', 1, 2, 1, 1, 'label', 'lbl_cashout', 'Cash-out', NULL, 0, '{}', 3),
('pk-ln2', 'tpl-poker', 1, 3, 1, 1, 'label', 'lbl_net', 'Net', NULL, 0, '{}', 4),
('pk-ib', 'tpl-poker', 2, 1, 1, 1, 'input:number', 'buy_in', '', NULL, 1, '{"default":0}', 6),
('pk-ic', 'tpl-poker', 2, 2, 1, 1, 'input:number', 'cash_out', '', NULL, 1, '{"default":0}', 7),
('pk-fn', 'tpl-poker', 2, 3, 1, 1, 'formula', 'net', '', 'cash_out - buy_in', 1, '{}', 8),
('pk-sh', 'tpl-poker', 3, 0, 1, 4, 'heading', 'h_summary', 'Summary', NULL, 0, '{}', 9),
('pk-sl', 'tpl-poker', 4, 0, 1, 1, 'label', 'lbl_totbuy', 'Total Buy-ins', NULL, 0, '{}', 10),
('pk-fb', 'tpl-poker', 4, 1, 1, 1, 'formula', 'total_buyins', '', 'SUM(buy_in)', 0, '{}', 11),
('pk-sc', 'tpl-poker', 5, 0, 1, 1, 'label', 'lbl_totcash', 'Total Cash-outs', NULL, 0, '{}', 12),
('pk-fc', 'tpl-poker', 5, 1, 1, 1, 'formula', 'total_cashouts', '', 'SUM(cash_out)', 0, '{}', 13),
('pk-sh2', 'tpl-poker', 6, 0, 1, 1, 'label', 'lbl_house', 'House Balance', NULL, 0, '{}', 14),
('pk-fh', 'tpl-poker', 6, 1, 1, 1, 'formula', 'house_balance', '', 'total_buyins - total_cashouts', 0, '{}', 15);

-- ============================================================
-- TEMPLATE 8: Phase 10
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-phase10', 'Phase 10', 'Track phases completed and round scores. Lowest total score wins. Players complete 10 phases in order.', 'game-phase10', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('p10-ln', 'tpl-phase10', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('p10-lp', 'tpl-phase10', 1, 1, 1, 1, 'label', 'lbl_phase', 'Current Phase', NULL, 0, '{}', 2),
('p10-lt', 'tpl-phase10', 1, 2, 1, 1, 'label', 'lbl_total', 'Total Score', NULL, 0, '{}', 3),
('p10-ip', 'tpl-phase10', 2, 1, 1, 1, 'tally', 'current_phase', '', NULL, 1, '{"min":1,"default":1,"step":1}', 5),
('p10-ft', 'tpl-phase10', 2, 2, 1, 1, 'formula', 'total_score', 'Total', 'SUM(round_*)', 1, '{}', 18),
('p10-rh', 'tpl-phase10', 3, 0, 1, 6, 'heading', 'h_rounds', 'Round Scores', NULL, 0, '{}', 7),
('p10-r1', 'tpl-phase10', 4, 0, 1, 1, 'input:number', 'round_1', 'R1', NULL, 1, '{"default":0}', 8),
('p10-r2', 'tpl-phase10', 4, 1, 1, 1, 'input:number', 'round_2', 'R2', NULL, 1, '{"default":0}', 9),
('p10-r3', 'tpl-phase10', 4, 2, 1, 1, 'input:number', 'round_3', 'R3', NULL, 1, '{"default":0}', 10),
('p10-r4', 'tpl-phase10', 4, 3, 1, 1, 'input:number', 'round_4', 'R4', NULL, 1, '{"default":0}', 11),
('p10-r5', 'tpl-phase10', 4, 4, 1, 1, 'input:number', 'round_5', 'R5', NULL, 1, '{"default":0}', 12),
('p10-r6', 'tpl-phase10', 4, 5, 1, 1, 'input:number', 'round_6', 'R6', NULL, 1, '{"default":0}', 13),
('p10-r7', 'tpl-phase10', 5, 0, 1, 1, 'input:number', 'round_7', 'R7', NULL, 1, '{"default":0}', 14),
('p10-r8', 'tpl-phase10', 5, 1, 1, 1, 'input:number', 'round_8', 'R8', NULL, 1, '{"default":0}', 15),
('p10-r9', 'tpl-phase10', 5, 2, 1, 1, 'input:number', 'round_9', 'R9', NULL, 1, '{"default":0}', 16),
('p10-r10', 'tpl-phase10', 5, 3, 1, 1, 'input:number', 'round_10', 'R10', NULL, 1, '{"default":0}', 17);

-- ============================================================
-- TEMPLATE 9: Golf (card game)
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-golf', 'Golf (Card Game)', 'Track 9-hole Golf card game. Lower score wins. Each hole: reveal cards, lowest total wins.', 'game-golf-card', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('gf-ln', 'tpl-golf', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('gf-lt', 'tpl-golf', 1, 1, 1, 1, 'label', 'lbl_total', 'Total', NULL, 0, '{}', 2),
('gf-ft', 'tpl-golf', 2, 1, 1, 1, 'formula', 'total_score', 'Total', 'SUM(hole_*)', 1, '{}', 15),
('gf-hh', 'tpl-golf', 3, 0, 1, 6, 'heading', 'h_holes', 'Holes', NULL, 0, '{}', 5),
('gf-h1', 'tpl-golf', 4, 0, 1, 1, 'input:number', 'hole_1', 'H1', NULL, 1, '{"default":0}', 6),
('gf-h2', 'tpl-golf', 4, 1, 1, 1, 'input:number', 'hole_2', 'H2', NULL, 1, '{"default":0}', 7),
('gf-h3', 'tpl-golf', 4, 2, 1, 1, 'input:number', 'hole_3', 'H3', NULL, 1, '{"default":0}', 8),
('gf-h4', 'tpl-golf', 4, 3, 1, 1, 'input:number', 'hole_4', 'H4', NULL, 1, '{"default":0}', 9),
('gf-h5', 'tpl-golf', 4, 4, 1, 1, 'input:number', 'hole_5', 'H5', NULL, 1, '{"default":0}', 10),
('gf-h6', 'tpl-golf', 4, 5, 1, 1, 'input:number', 'hole_6', 'H6', NULL, 1, '{"default":0}', 11),
('gf-h7', 'tpl-golf', 5, 0, 1, 1, 'input:number', 'hole_7', 'H7', NULL, 1, '{"default":0}', 12),
('gf-h8', 'tpl-golf', 5, 1, 1, 1, 'input:number', 'hole_8', 'H8', NULL, 1, '{"default":0}', 13),
('gf-h9', 'tpl-golf', 5, 2, 1, 1, 'input:number', 'hole_9', 'H9', NULL, 1, '{"default":0}', 14);

-- ============================================================
-- TEMPLATE 10: Ticket to Ride
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-ticket', 'Ticket to Ride', 'Track Ticket to Ride scores. Route points, destination tickets (completed & unfinished), longest path bonus, and trains remaining.', 'game-ticket-to-ride', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('ttr-ln', 'tpl-ticket', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('ttr-lt', 'tpl-ticket', 1, 2, 1, 1, 'label', 'lbl_total', 'Total Score', NULL, 0, '{}', 2),
('ttr-lr', 'tpl-ticket', 2, 1, 1, 1, 'label', 'lbl_routes', 'Route Points', NULL, 1, '{}', 4),
('ttr-ir', 'tpl-ticket', 3, 1, 1, 1, 'input:number', 'route_points', '', NULL, 1, '{"default":0}', 5),
('ttr-ltk', 'tpl-ticket', 4, 1, 1, 1, 'label', 'lbl_tickets', 'Completed Tickets', NULL, 1, '{}', 6),
('ttr-itk', 'tpl-ticket', 5, 1, 1, 1, 'input:number', 'ticket_points', '', NULL, 1, '{"default":0}', 7),
('ttr-luf', 'tpl-ticket', 6, 1, 1, 1, 'label', 'lbl_unfin', 'Unfinished Tickets', NULL, 1, '{}', 8),
('ttr-iuf', 'tpl-ticket', 7, 1, 1, 1, 'input:number', 'unfinished_penalty', '', NULL, 1, '{"default":0}', 9),
('ttr-llp', 'tpl-ticket', 8, 1, 1, 1, 'label', 'lbl_path', 'Longest Path', NULL, 1, '{}', 10),
('ttr-ilp', 'tpl-ticket', 9, 1, 1, 1, 'input:number', 'longest_trains', '', NULL, 1, '{"default":0}', 11),
('ttr-flp', 'tpl-ticket', 9, 2, 1, 1, 'formula', 'path_bonus', '', 'longest_trains > 0 ? 10 : 0', 1, '{}', 12),
('ttr-lc', 'tpl-ticket', 10, 1, 1, 1, 'label', 'lbl_cars', 'Trains Left', NULL, 1, '{}', 13),
('ttr-ic', 'tpl-ticket', 11, 1, 1, 1, 'tally', 'trains_left', '', NULL, 1, '{"min":0,"default":45,"step":-1}', 14),
-- Total
('ttr-ft', 'tpl-ticket', 2, 2, 1, 1, 'formula', 'total_score', '', 'route_points + ticket_points - unfinished_penalty + path_bonus', 1, '{}', 15);

-- ============================================================
-- TEMPLATE 11: Wingspan
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('tpl-wingspan', 'Wingspan', 'Track Wingspan scores. Bird card points, bonus cards, end-of-round goals, eggs, cached food, and tucked cards. Auto-calculates grand total.', 'game-wingspan', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('ws-bi', 'tpl-wingspan', 4, 0, 1, 1, 'input:number', 'bird_points', 'Bird Points', NULL, 1, '{"default":0}', 1),
('ws-bi2', 'tpl-wingspan', 6, 0, 1, 1, 'input:number', 'bonus', 'Bonus Cards', NULL, 1, '{"default":0,"allow_multiple":true}', 2),
('ws-rh', 'tpl-wingspan', 7, 0, 1, 2, 'formula', 'round_total', 'End-of-Round Goals', 'SUM(round_1, round_2, round_3, round_4)', 1, '{}', 3),
('ws-r1i', 'tpl-wingspan', 8, 0, 1, 1, 'input:number', 'round_1', 'Round 1', NULL, 1, '{"default":0}', 4),
('ws-r2i', 'tpl-wingspan', 9, 0, 1, 1, 'input:number', 'round_2', 'Round 2', NULL, 1, '{"default":0}', 5),
('ws-r3i', 'tpl-wingspan', 10, 0, 1, 1, 'input:number', 'round_3', 'Round 3', NULL, 1, '{"default":0}', 6),
('ws-r4i', 'tpl-wingspan', 11, 0, 1, 1, 'input:number', 'round_4', 'Round 4', NULL, 1, '{"default":0}', 7),
('ws-et', 'tpl-wingspan', 13, 0, 1, 1, 'input:number', 'eggs', 'Eggs', NULL, 1, '{"default":0}', 8),
('ws-ft2', 'tpl-wingspan', 14, 0, 1, 1, 'input:number', 'cached_food', 'Cached Food', NULL, 1, '{"default":0}', 9),
('ws-tt', 'tpl-wingspan', 15, 0, 1, 1, 'input:number', 'tucked_cards', 'Tucked Cards', NULL, 1, '{"default":0}', 10),
('ws-ft', 'tpl-wingspan', 2, 1, 1, 1, 'formula', 'grand_total', 'Total', 'bird_points + SUM(bonus_*) + round_total + eggs + cached_food + tucked_cards', 1, '{}', 11);

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
  ('game-wingspan', 'Wingspan', 'wingspan', 'board', '1-5', '🦜'),
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
  ('game-telestrations', 'Telestrations', 'telestrations', 'party', '4-8', '✏️'),
  ('game-romanian-whist', 'Romanian Whist', 'romanian-whist', 'card', '3-6', '🃏'),
  ('game-five-hundred', '500', '500', 'card', '4', '🂡'),
  ('game-liverpool-rummy', 'Liverpool Rummy', 'liverpool-rummy', 'card', '2-6', '🃏'),
  ('game-cascadia', 'Cascadia', 'cascadia', 'board', '1-4', '🏔️'),
  ('game-mus', 'Mus', 'mus', 'card', '4', '🃏');


-- ============================================================
-- TEMPLATE 1: Yahtzee
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('yahtzee', 'Yahtzee', 'Classic dice game scorecard. Upper section (1s-6s) with 63-point bonus, lower section (3 of a kind through Yahtzee), auto-calculated totals.', 'game-yahtzee', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
-- Header
-- Upper Section
('y-us-h', 'yahtzee', 1, 0, 1, 2, 'heading', 'h_upper', 'Upper Section', NULL, 0, '{}', 1),
('y-us-l1', 'yahtzee', 2, 0, 1, 1, 'label', 'lbl_ones', 'Ones', NULL, 0, '{}', 2),
('y-us-i1', 'yahtzee', 2, 1, 1, 1, 'input:number', 'ones', '', NULL, 1, '{"default":0}', 3),
('y-us-l2', 'yahtzee', 3, 0, 1, 1, 'label', 'lbl_twos', 'Twos', NULL, 0, '{}', 4),
('y-us-i2', 'yahtzee', 3, 1, 1, 1, 'input:number', 'twos', '', NULL, 1, '{"default":0}', 5),
('y-us-l3', 'yahtzee', 4, 0, 1, 1, 'label', 'lbl_threes', 'Threes', NULL, 0, '{}', 6),
('y-us-i3', 'yahtzee', 4, 1, 1, 1, 'input:number', 'threes', '', NULL, 1, '{"default":0}', 7),
('y-us-l4', 'yahtzee', 5, 0, 1, 1, 'label', 'lbl_fours', 'Fours', NULL, 0, '{}', 8),
('y-us-i4', 'yahtzee', 5, 1, 1, 1, 'input:number', 'fours', '', NULL, 1, '{"default":0}', 9),
('y-us-l5', 'yahtzee', 6, 0, 1, 1, 'label', 'lbl_fives', 'Fives', NULL, 0, '{}', 10),
('y-us-i5', 'yahtzee', 6, 1, 1, 1, 'input:number', 'fives', '', NULL, 1, '{"default":0}', 11),
('y-us-l6', 'yahtzee', 7, 0, 1, 1, 'label', 'lbl_sixes', 'Sixes', NULL, 0, '{}', 12),
('y-us-i6', 'yahtzee', 7, 1, 1, 1, 'input:number', 'sixes', '', NULL, 1, '{"default":0}', 13),
-- Upper subtotal + bonus + total
('y-us-st', 'yahtzee', 8, 0, 1, 1, 'label', 'lbl_upper_sub', 'Upper Subtotal', NULL, 0, '{}', 14),
('y-us-fs', 'yahtzee', 8, 1, 1, 1, 'formula', 'upper_subtotal', '', 'SUM(ones, twos, threes, fours, fives, sixes)', 1, '{}', 15),
('y-us-bl', 'yahtzee', 9, 0, 1, 1, 'label', 'lbl_bonus', 'Bonus', NULL, 0, '{}', 16),
('y-us-fb', 'yahtzee', 9, 1, 1, 1, 'formula', 'upper_bonus', '', 'upper_subtotal >= 63 ? 35 : 0', 1, '{}', 17),
('y-us-tl', 'yahtzee', 10, 0, 1, 1, 'label', 'lbl_upper_total', 'Upper Total', NULL, 0, '{}', 18),
('y-us-ft', 'yahtzee', 10, 1, 1, 1, 'formula', 'upper_total', '', 'upper_subtotal + upper_bonus', 1, '{}', 19),
-- Lower Section
('y-ls-h', 'yahtzee', 11, 0, 1, 2, 'heading', 'h_lower', 'Lower Section', NULL, 0, '{}', 20),
('y-ls-l1', 'yahtzee', 12, 0, 1, 1, 'label', 'lbl_3kind', '3 of a Kind', NULL, 0, '{}', 21),
('y-ls-i1', 'yahtzee', 12, 1, 1, 1, 'input:number', 'three_kind', '', NULL, 1, '{"default":0}', 22),
('y-ls-l2', 'yahtzee', 13, 0, 1, 1, 'label', 'lbl_4kind', '4 of a Kind', NULL, 0, '{}', 23),
('y-ls-i2', 'yahtzee', 13, 1, 1, 1, 'input:number', 'four_kind', '', NULL, 1, '{"default":0}', 24),
('y-ls-l3', 'yahtzee', 14, 0, 1, 1, 'label', 'lbl_fh', 'Full House', NULL, 0, '{}', 25),
('y-ls-i3', 'yahtzee', 14, 1, 1, 1, 'input:number', 'full_house', '', NULL, 1, '{"default":0}', 26),
('y-ls-l4', 'yahtzee', 15, 0, 1, 1, 'label', 'lbl_smstr', 'Sm. Straight', NULL, 0, '{}', 27),
('y-ls-i4', 'yahtzee', 15, 1, 1, 1, 'input:number', 'sm_straight', '', NULL, 1, '{"default":0}', 28),
('y-ls-l5', 'yahtzee', 16, 0, 1, 1, 'label', 'lbl_lgstr', 'Lg. Straight', NULL, 0, '{}', 29),
('y-ls-i5', 'yahtzee', 16, 1, 1, 1, 'input:number', 'lg_straight', '', NULL, 1, '{"default":0}', 30),
('y-ls-l6', 'yahtzee', 17, 0, 1, 1, 'label', 'lbl_yahtzee', 'Yahtzee', NULL, 0, '{}', 31),
('y-ls-i6', 'yahtzee', 17, 1, 1, 1, 'input:number', 'yahtzee', '', NULL, 1, '{"default":0}', 32),
('y-ls-l7', 'yahtzee', 18, 0, 1, 1, 'label', 'lbl_chance', 'Chance', NULL, 0, '{}', 33),
('y-ls-i7', 'yahtzee', 18, 1, 1, 1, 'input:number', 'chance', '', NULL, 1, '{"default":0}', 34),
-- Lower total
('y-ls-lt', 'yahtzee', 19, 0, 1, 1, 'label', 'lbl_lower_total', 'Lower Total', NULL, 0, '{}', 35),
('y-ls-ft', 'yahtzee', 19, 1, 1, 1, 'formula', 'lower_total', '', 'SUM(three_kind, four_kind, full_house, sm_straight, lg_straight, yahtzee, chance)', 1, '{}', 36),
-- Grand Total
('y-gt-l', 'yahtzee', 20, 0, 1, 1, 'label', 'lbl_grand', 'Grand Total', NULL, 0, '{}', 37),
('y-gt-f', 'yahtzee', 20, 1, 1, 1, 'formula', 'grand_total', '', 'upper_total + lower_total', 1, '{}', 38);

-- ============================================================
-- TEMPLATE 2: Uno
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('uno', 'Uno', 'Track rounds of Uno. Record remaining cards per player per round. Lowest running total wins.', 'game-uno', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('uno-ln', 'uno', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('uno-lt', 'uno', 1, 1, 1, 1, 'label', 'lbl_total', 'Total', NULL, 0, '{}', 2),
('uno-ft', 'uno', 2, 1, 1, 1, 'formula', 'player_total', 'Total', 'SUM(round_1, round_2, round_3, round_4, round_5, round_6, round_7, round_8)', 1, '{}', 14),
('uno-rh', 'uno', 3, 0, 1, 8, 'heading', 'h_rounds', 'Rounds', NULL, 0, '{}', 5),
('uno-r1', 'uno', 4, 0, 1, 1, 'input:number', 'round_1', 'R1', NULL, 1, '{"default":0}', 6),
('uno-r2', 'uno', 4, 1, 1, 1, 'input:number', 'round_2', 'R2', NULL, 1, '{"default":0}', 7),
('uno-r3', 'uno', 4, 2, 1, 1, 'input:number', 'round_3', 'R3', NULL, 1, '{"default":0}', 8),
('uno-r4', 'uno', 4, 3, 1, 1, 'input:number', 'round_4', 'R4', NULL, 1, '{"default":0}', 9),
('uno-r5', 'uno', 4, 4, 1, 1, 'input:number', 'round_5', 'R5', NULL, 1, '{"default":0}', 10),
('uno-r6', 'uno', 4, 5, 1, 1, 'input:number', 'round_6', 'R6', NULL, 1, '{"default":0}', 11),
('uno-r7', 'uno', 4, 6, 1, 1, 'input:number', 'round_7', 'R7', NULL, 1, '{"default":0}', 12),
('uno-r8', 'uno', 4, 7, 1, 1, 'input:number', 'round_8', 'R8', NULL, 1, '{"default":0}', 13);

-- ============================================================
-- TEMPLATE 3: Catan
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('catan', 'Catan', 'Track Victory Points. Count settlements, cities, longest road, largest army, and VP development cards. Auto-calculates totals with conditional bonuses.', 'game-catan', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('cat-ln', 'catan', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('cat-lvp', 'catan', 1, 2, 1, 1, 'label', 'lbl_vp', 'Total VP', NULL, 0, '{}', 2),
-- Route length for longest road
('cat-llr', 'catan', 2, 1, 1, 1, 'label', 'lbl_lr', 'Longest Road', NULL, 1, '{}', 4),
('cat-ir', 'catan', 3, 1, 1, 1, 'input:number', 'road_length', '', NULL, 1, '{"default":0}', 5),
('cat-flr', 'catan', 3, 2, 1, 1, 'formula', 'road_vp', '', 'road_length >= 5 ? 2 : 0', 1, '{}', 6),
-- Knights for largest army
('cat-lla', 'catan', 4, 1, 1, 1, 'label', 'lbl_army', 'Largest Army', NULL, 1, '{}', 7),
('cat-ik', 'catan', 5, 1, 1, 1, 'input:number', 'knights', '', NULL, 1, '{"default":0}', 8),
('cat-fla', 'catan', 5, 2, 1, 1, 'formula', 'army_vp', '', 'knights >= 3 ? 2 : 0', 1, '{}', 9),
-- Settlements
('cat-ls', 'catan', 6, 1, 1, 1, 'label', 'lbl_settle', 'Settlements', NULL, 1, '{}', 10),
('cat-ts', 'catan', 7, 1, 1, 1, 'tally', 'settlements', '', NULL, 1, '{"min":0,"default":2,"step":1}', 11),
-- Cities
('cat-lc', 'catan', 8, 1, 1, 1, 'label', 'lbl_cities', 'Cities', NULL, 1, '{}', 12),
('cat-tc', 'catan', 9, 1, 1, 1, 'tally', 'cities', '', NULL, 1, '{"min":0,"default":0,"step":1}', 13),
-- VP Cards
('cat-lv', 'catan', 10, 1, 1, 1, 'label', 'lbl_vpcards', 'VP Dev Cards', NULL, 1, '{}', 14),
('cat-tv', 'catan', 11, 1, 1, 1, 'tally', 'vp_cards', '', NULL, 1, '{"min":0,"default":0,"step":1}', 15),
-- Total
('cat-ft', 'catan', 2, 2, 1, 1, 'formula', 'total_vp', '', 'settlements + cities * 2 + road_vp + army_vp + vp_cards', 1, '{}', 16);

-- ============================================================
-- TEMPLATE 4: Spades
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('spades', 'Spades', 'Track bids and tricks in Spades. Calculates scores: 10 pts per trick bid, 1 pt per overtrick (bag). -10 pts per undertrick per bid missed.', 'game-spades', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('sp-lp', 'spades', 1, 0, 1, 1, 'label', 'lbl_player', 'Player', NULL, 0, '{}', 1),
('sp-lb', 'spades', 1, 1, 1, 1, 'label', 'lbl_bid', 'Bid', NULL, 0, '{}', 2),
('sp-lt', 'spades', 1, 2, 1, 1, 'label', 'lbl_tricks', 'Tricks', NULL, 0, '{}', 3),
('sp-ls', 'spades', 1, 3, 1, 1, 'label', 'lbl_score', 'Score', NULL, 0, '{}', 4),
('sp-lbg', 'spades', 1, 4, 1, 1, 'label', 'lbl_bags', 'Bags', NULL, 0, '{}', 5),
('sp-ib', 'spades', 2, 1, 1, 1, 'input:number', 'bid', '', NULL, 1, '{"default":0}', 7),
('sp-it', 'spades', 2, 2, 1, 1, 'input:number', 'tricks', '', NULL, 1, '{"default":0}', 8),
('sp-fs', 'spades', 2, 3, 1, 1, 'formula', 'round_score', '', 'tricks >= bid ? bid * 10 + (tricks - bid) : bid * -10', 1, '{}', 9),
('sp-fb', 'spades', 2, 4, 1, 1, 'formula', 'bags', '', 'tricks > bid ? tricks - bid : 0', 1, '{}', 10);

-- ============================================================
-- TEMPLATE 5: Scrabble
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('scrabble', 'Scrabble', 'Track Scrabble word scores. Enter each word played and its score. Auto-calculates running total per player.', 'game-scrabble', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('sc-ln', 'scrabble', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('sc-lt', 'scrabble', 1, 2, 1, 1, 'label', 'lbl_total', 'Total', NULL, 0, '{}', 2),
('sc-ft', 'scrabble', 2, 2, 1, 1, 'formula', 'player_total', 'Total', 'SUM(word_1, word_2, word_3, word_4, word_5, word_6, word_7, word_8, word_9, word_10, word_11, word_12)', 1, '{}', 21),
('sc-wh', 'scrabble', 3, 0, 1, 3, 'heading', 'h_words', 'Words', NULL, 0, '{}', 5),
('sc-w1l', 'scrabble', 4, 0, 1, 1, 'input:text', 'word_1_name', 'Word', NULL, 1, '{"placeholder":"Word"}', 6),
('sc-w1s', 'scrabble', 4, 1, 1, 1, 'input:number', 'word_1', 'Score', NULL, 1, '{"default":0}', 7),
('sc-w2l', 'scrabble', 5, 0, 1, 1, 'input:text', 'word_2_name', 'Word', NULL, 1, '{"placeholder":"Word"}', 8),
('sc-w2s', 'scrabble', 5, 1, 1, 1, 'input:number', 'word_2', 'Score', NULL, 1, '{"default":0}', 9),
('sc-w3l', 'scrabble', 6, 0, 1, 1, 'input:text', 'word_3_name', 'Word', NULL, 1, '{"placeholder":"Word"}', 10),
('sc-w3s', 'scrabble', 6, 1, 1, 1, 'input:number', 'word_3', 'Score', NULL, 1, '{"default":0}', 11),
('sc-w4s', 'scrabble', 7, 1, 1, 1, 'input:number', 'word_4', 'Score', NULL, 1, '{"default":0}', 12),
('sc-w5s', 'scrabble', 8, 1, 1, 1, 'input:number', 'word_5', 'Score', NULL, 1, '{"default":0}', 13),
('sc-w6s', 'scrabble', 9, 1, 1, 1, 'input:number', 'word_6', 'Score', NULL, 1, '{"default":0}', 14),
('sc-w7s', 'scrabble', 10, 1, 1, 1, 'input:number', 'word_7', 'Score', NULL, 1, '{"default":0}', 15),
('sc-w8s', 'scrabble', 11, 1, 1, 1, 'input:number', 'word_8', 'Score', NULL, 1, '{"default":0}', 16),
('sc-w9s', 'scrabble', 12, 1, 1, 1, 'input:number', 'word_9', 'Score', NULL, 1, '{"default":0}', 17),
('sc-w10s', 'scrabble', 13, 1, 1, 1, 'input:number', 'word_10', 'Score', NULL, 1, '{"default":0}', 18),
('sc-w11s', 'scrabble', 14, 1, 1, 1, 'input:number', 'word_11', 'Score', NULL, 1, '{"default":0}', 19),
('sc-w12s', 'scrabble', 15, 1, 1, 1, 'input:number', 'word_12', 'Score', NULL, 1, '{"default":0}', 20);

-- ============================================================
-- TEMPLATE 6: Cornhole
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('cornhole', 'Cornhole / Bags', 'Track cornhole rounds. Enter bags in the hole (3 pts) and on the board (1 pt) per team per round. Auto-calculates totals.', 'game-cornhole', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('ch-ln', 'cornhole', 1, 0, 1, 1, 'label', 'lbl_team', 'Team', NULL, 0, '{}', 1),
('ch-ls', 'cornhole', 1, 1, 1, 1, 'label', 'lbl_score', 'Total Score', NULL, 0, '{}', 2),
('ch-fs', 'cornhole', 2, 1, 1, 1, 'formula', 'total_score', 'Score', 'SUM(hole_1, hole_2, hole_3, hole_4, hole_5, hole_6) * 3 + SUM(board_1, board_2, board_3, board_4, board_5, board_6)', 1, '{}', 18),
('ch-rh', 'cornhole', 3, 0, 1, 5, 'heading', 'h_rounds', 'Rounds', NULL, 0, '{}', 5),
('ch-r1h', 'cornhole', 4, 0, 1, 1, 'input:number', 'hole_1', 'R1 Hole', NULL, 1, '{"default":0}', 6),
('ch-r1b', 'cornhole', 4, 1, 1, 1, 'input:number', 'board_1', 'R1 Board', NULL, 1, '{"default":0}', 7),
('ch-r2h', 'cornhole', 4, 2, 1, 1, 'input:number', 'hole_2', 'R2 Hole', NULL, 1, '{"default":0}', 8),
('ch-r2b', 'cornhole', 4, 3, 1, 1, 'input:number', 'board_2', 'R2 Board', NULL, 1, '{"default":0}', 9),
('ch-r3h', 'cornhole', 5, 0, 1, 1, 'input:number', 'hole_3', 'R3 Hole', NULL, 1, '{"default":0}', 10),
('ch-r3b', 'cornhole', 5, 1, 1, 1, 'input:number', 'board_3', 'R3 Board', NULL, 1, '{"default":0}', 11),
('ch-r4h', 'cornhole', 5, 2, 1, 1, 'input:number', 'hole_4', 'R4 Hole', NULL, 1, '{"default":0}', 12),
('ch-r4b', 'cornhole', 5, 3, 1, 1, 'input:number', 'board_4', 'R4 Board', NULL, 1, '{"default":0}', 13),
('ch-r5h', 'cornhole', 6, 0, 1, 1, 'input:number', 'hole_5', 'R5 Hole', NULL, 1, '{"default":0}', 14),
('ch-r5b', 'cornhole', 6, 1, 1, 1, 'input:number', 'board_5', 'R5 Board', NULL, 1, '{"default":0}', 15),
('ch-r6h', 'cornhole', 6, 2, 1, 1, 'input:number', 'hole_6', 'R6 Hole', NULL, 1, '{"default":0}', 16),
('ch-r6b', 'cornhole', 6, 3, 1, 1, 'input:number', 'board_6', 'R6 Board', NULL, 1, '{"default":0}', 17);

-- ============================================================
-- TEMPLATE 7: Poker Night
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('poker', 'Poker Night', 'Track buy-ins, cash-outs, and net profit/loss. Shows house balance for cash games with friends.', 'game-poker', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('pk-ln', 'poker', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('pk-lb', 'poker', 1, 1, 1, 1, 'label', 'lbl_buyin', 'Buy-in', NULL, 0, '{}', 2),
('pk-lc', 'poker', 1, 2, 1, 1, 'label', 'lbl_cashout', 'Cash-out', NULL, 0, '{}', 3),
('pk-ln2', 'poker', 1, 3, 1, 1, 'label', 'lbl_net', 'Net', NULL, 0, '{}', 4),
('pk-ib', 'poker', 2, 1, 1, 1, 'input:number', 'buy_in', '', NULL, 1, '{"default":0}', 6),
('pk-ic', 'poker', 2, 2, 1, 1, 'input:number', 'cash_out', '', NULL, 1, '{"default":0}', 7),
('pk-fn', 'poker', 2, 3, 1, 1, 'formula', 'net', '', 'cash_out - buy_in', 1, '{}', 8),
('pk-sh', 'poker', 3, 0, 1, 4, 'heading', 'h_summary', 'Summary', NULL, 0, '{}', 9),
('pk-sl', 'poker', 4, 0, 1, 1, 'label', 'lbl_totbuy', 'Total Buy-ins', NULL, 0, '{}', 10),
('pk-fb', 'poker', 4, 1, 1, 1, 'formula', 'total_buyins', '', 'SUM(PLAYERS(buy_in))', 0, '{}', 11),
('pk-sc', 'poker', 5, 0, 1, 1, 'label', 'lbl_totcash', 'Total Cash-outs', NULL, 0, '{}', 12),
('pk-fc', 'poker', 5, 1, 1, 1, 'formula', 'total_cashouts', '', 'SUM(PLAYERS(cash_out))', 0, '{}', 13),
('pk-sh2', 'poker', 6, 0, 1, 1, 'label', 'lbl_house', 'House Balance', NULL, 0, '{}', 14),
('pk-fh', 'poker', 6, 1, 1, 1, 'formula', 'house_balance', '', 'total_buyins - total_cashouts', 0, '{}', 15);

-- ============================================================
-- TEMPLATE 8: Phase 10
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('phase10', 'Phase 10', 'Track phases completed and round scores. Lowest total score wins. Players complete 10 phases in order.', 'game-phase10', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('p10-ln', 'phase10', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('p10-lp', 'phase10', 1, 1, 1, 1, 'label', 'lbl_phase', 'Current Phase', NULL, 0, '{}', 2),
('p10-lt', 'phase10', 1, 2, 1, 1, 'label', 'lbl_total', 'Total Score', NULL, 0, '{}', 3),
('p10-ip', 'phase10', 2, 1, 1, 1, 'tally', 'current_phase', '', NULL, 1, '{"min":1,"default":1,"step":1}', 5),
('p10-ft', 'phase10', 2, 2, 1, 1, 'formula', 'total_score', 'Total', 'SUM(round_1, round_2, round_3, round_4, round_5, round_6, round_7, round_8, round_9, round_10)', 1, '{}', 18),
('p10-rh', 'phase10', 3, 0, 1, 6, 'heading', 'h_rounds', 'Round Scores', NULL, 0, '{}', 7),
('p10-r1', 'phase10', 4, 0, 1, 1, 'input:number', 'round_1', 'R1', NULL, 1, '{"default":0}', 8),
('p10-r2', 'phase10', 4, 1, 1, 1, 'input:number', 'round_2', 'R2', NULL, 1, '{"default":0}', 9),
('p10-r3', 'phase10', 4, 2, 1, 1, 'input:number', 'round_3', 'R3', NULL, 1, '{"default":0}', 10),
('p10-r4', 'phase10', 4, 3, 1, 1, 'input:number', 'round_4', 'R4', NULL, 1, '{"default":0}', 11),
('p10-r5', 'phase10', 4, 4, 1, 1, 'input:number', 'round_5', 'R5', NULL, 1, '{"default":0}', 12),
('p10-r6', 'phase10', 4, 5, 1, 1, 'input:number', 'round_6', 'R6', NULL, 1, '{"default":0}', 13),
('p10-r7', 'phase10', 5, 0, 1, 1, 'input:number', 'round_7', 'R7', NULL, 1, '{"default":0}', 14),
('p10-r8', 'phase10', 5, 1, 1, 1, 'input:number', 'round_8', 'R8', NULL, 1, '{"default":0}', 15),
('p10-r9', 'phase10', 5, 2, 1, 1, 'input:number', 'round_9', 'R9', NULL, 1, '{"default":0}', 16),
('p10-r10', 'phase10', 5, 3, 1, 1, 'input:number', 'round_10', 'R10', NULL, 1, '{"default":0}', 17);

-- ============================================================
-- TEMPLATE 9: Golf (card game)
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('golf', 'Golf (Card Game)', 'Track 9-hole Golf card game. Lower score wins. Each hole: reveal cards, lowest total wins.', 'game-golf-card', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('gf-ln', 'golf', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('gf-lt', 'golf', 1, 1, 1, 1, 'label', 'lbl_total', 'Total', NULL, 0, '{}', 2),
('gf-ft', 'golf', 2, 1, 1, 1, 'formula', 'total_score', 'Total', 'SUM(hole_1, hole_2, hole_3, hole_4, hole_5, hole_6, hole_7, hole_8, hole_9)', 1, '{}', 15),
('gf-hh', 'golf', 3, 0, 1, 6, 'heading', 'h_holes', 'Holes', NULL, 0, '{}', 5),
('gf-h1', 'golf', 4, 0, 1, 1, 'input:number', 'hole_1', 'H1', NULL, 1, '{"default":0}', 6),
('gf-h2', 'golf', 4, 1, 1, 1, 'input:number', 'hole_2', 'H2', NULL, 1, '{"default":0}', 7),
('gf-h3', 'golf', 4, 2, 1, 1, 'input:number', 'hole_3', 'H3', NULL, 1, '{"default":0}', 8),
('gf-h4', 'golf', 4, 3, 1, 1, 'input:number', 'hole_4', 'H4', NULL, 1, '{"default":0}', 9),
('gf-h5', 'golf', 4, 4, 1, 1, 'input:number', 'hole_5', 'H5', NULL, 1, '{"default":0}', 10),
('gf-h6', 'golf', 4, 5, 1, 1, 'input:number', 'hole_6', 'H6', NULL, 1, '{"default":0}', 11),
('gf-h7', 'golf', 5, 0, 1, 1, 'input:number', 'hole_7', 'H7', NULL, 1, '{"default":0}', 12),
('gf-h8', 'golf', 5, 1, 1, 1, 'input:number', 'hole_8', 'H8', NULL, 1, '{"default":0}', 13),
('gf-h9', 'golf', 5, 2, 1, 1, 'input:number', 'hole_9', 'H9', NULL, 1, '{"default":0}', 14);

-- ============================================================
-- TEMPLATE 10: Ticket to Ride
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('ticket', 'Ticket to Ride', 'Track Ticket to Ride scores. Route points, destination tickets (completed & unfinished), longest path bonus, and trains remaining.', 'game-ticket-to-ride', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('ttr-ln', 'ticket', 1, 0, 1, 1, 'label', 'lbl_name', 'Player', NULL, 0, '{}', 1),
('ttr-lt', 'ticket', 1, 2, 1, 1, 'label', 'lbl_total', 'Total Score', NULL, 0, '{}', 2),
('ttr-lr', 'ticket', 2, 1, 1, 1, 'label', 'lbl_routes', 'Route Points', NULL, 1, '{}', 4),
('ttr-ir', 'ticket', 3, 1, 1, 1, 'input:number', 'route_points', '', NULL, 1, '{"default":0}', 5),
('ttr-ltk', 'ticket', 4, 1, 1, 1, 'label', 'lbl_tickets', 'Completed Tickets', NULL, 1, '{}', 6),
('ttr-itk', 'ticket', 5, 1, 1, 1, 'input:number', 'ticket_points', '', NULL, 1, '{"default":0}', 7),
('ttr-luf', 'ticket', 6, 1, 1, 1, 'label', 'lbl_unfin', 'Unfinished Tickets', NULL, 1, '{}', 8),
('ttr-iuf', 'ticket', 7, 1, 1, 1, 'input:number', 'unfinished_penalty', '', NULL, 1, '{"default":0}', 9),
('ttr-llp', 'ticket', 8, 1, 1, 1, 'label', 'lbl_path', 'Longest Path', NULL, 1, '{}', 10),
('ttr-ilp', 'ticket', 9, 1, 1, 1, 'input:number', 'longest_trains', '', NULL, 1, '{"default":0}', 11),
('ttr-flp', 'ticket', 9, 2, 1, 1, 'formula', 'path_bonus', '', 'longest_trains > 0 ? 10 : 0', 1, '{}', 12),
('ttr-lc', 'ticket', 10, 1, 1, 1, 'label', 'lbl_cars', 'Trains Left', NULL, 1, '{}', 13),
('ttr-ic', 'ticket', 11, 1, 1, 1, 'tally', 'trains_left', '', NULL, 1, '{"min":0,"default":45,"step":-1}', 14),
-- Total
('ttr-ft', 'ticket', 2, 2, 1, 1, 'formula', 'total_score', '', 'route_points + ticket_points - unfinished_penalty + path_bonus', 1, '{}', 15);

-- ============================================================
-- TEMPLATE 11: Wingspan
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('wingspan', 'Wingspan', 'Track Wingspan scores. Bird card points, bonus cards, end-of-round goals, eggs, cached food, and tucked cards. Auto-calculates grand total.', 'game-wingspan', 1, 'system');

INSERT OR IGNORE INTO template_cells (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order) VALUES
('ws-bi', 'wingspan', 4, 0, 1, 1, 'input:number', 'bird_points', 'Bird Points', NULL, 1, '{"default":0,"section":true}', 1),
('ws-bi2', 'wingspan', 6, 0, 1, 1, 'input:number', 'bonus', 'Bonus Cards', NULL, 1, '{"default":0,"default_entries":1,"allow_multiple":true,"show_entry_total":true,"section":true}', 2),
('ws-rh', 'wingspan', 7, 0, 1, 2, 'formula', 'round_total', 'End-of-Round Goals', 'SUM(round_1, round_2, round_3, round_4)', 1, '{"help":"Calculated automatically from the four end-of-round goal scores."}', 3),
('ws-r1i', 'wingspan', 8, 0, 1, 1, 'input:number', 'round_1', 'Round 1', NULL, 1, '{"default":0,"child":true}', 4),
('ws-r2i', 'wingspan', 9, 0, 1, 1, 'input:number', 'round_2', 'Round 2', NULL, 1, '{"default":0,"child":true}', 5),
('ws-r3i', 'wingspan', 10, 0, 1, 1, 'input:number', 'round_3', 'Round 3', NULL, 1, '{"default":0,"child":true}', 6),
('ws-r4i', 'wingspan', 11, 0, 1, 1, 'input:number', 'round_4', 'Round 4', NULL, 1, '{"default":0,"child":true}', 7),
('ws-et', 'wingspan', 13, 0, 1, 1, 'input:number', 'eggs', 'Eggs', NULL, 1, '{"default":0,"section":true}', 8),
('ws-ft2', 'wingspan', 14, 0, 1, 1, 'input:number', 'cached_food', 'Cached Food', NULL, 1, '{"default":0,"section":true}', 9),
('ws-tt', 'wingspan', 15, 0, 1, 1, 'input:number', 'tucked_cards', 'Tucked Cards', NULL, 1, '{"default":0,"section":true}', 10),
('ws-ft', 'wingspan', 2, 1, 1, 1, 'formula', 'grand_total', 'Total', 'bird_points + SUM(bonus) + round_1 + round_2 + round_3 + round_4 + eggs + cached_food + tucked_cards', 1, '{}', 11);

-- ============================================================
-- Unified grid presentation metadata
-- ============================================================
-- The original seed tables used separate label cells and fixed spreadsheet
-- columns. The unified scorecard grid is player-column based, so labels live
-- directly on input/formula cells and headings explicitly define sections.
UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.section', true)
WHERE template_id IN ('yahtzee', 'uno', 'catan', 'spades', 'scrabble', 'cornhole', 'poker', 'phase10', 'golf', 'ticket', 'wingspan')
  AND cell_type = 'heading';

UPDATE template_cells
SET label = CASE id
  WHEN 'y-us-i1' THEN 'Ones' WHEN 'y-us-i2' THEN 'Twos' WHEN 'y-us-i3' THEN 'Threes'
  WHEN 'y-us-i4' THEN 'Fours' WHEN 'y-us-i5' THEN 'Fives' WHEN 'y-us-i6' THEN 'Sixes'
  WHEN 'y-us-fs' THEN 'Upper Subtotal' WHEN 'y-us-fb' THEN 'Upper Bonus' WHEN 'y-us-ft' THEN 'Upper Total'
  WHEN 'y-ls-i1' THEN 'Three of a Kind' WHEN 'y-ls-i2' THEN 'Four of a Kind'
  WHEN 'y-ls-i3' THEN 'Full House' WHEN 'y-ls-i4' THEN 'Small Straight'
  WHEN 'y-ls-i5' THEN 'Large Straight' WHEN 'y-ls-i6' THEN 'Yahtzee' WHEN 'y-ls-i7' THEN 'Chance'
  WHEN 'y-ls-ft' THEN 'Lower Total' WHEN 'y-gt-f' THEN 'Grand Total'
  WHEN 'uno-ft' THEN 'Total Score' WHEN 'p10-ip' THEN 'Current Phase' WHEN 'p10-ft' THEN 'Total Score'
  WHEN 'gf-ft' THEN 'Total Score' WHEN 'cat-ir' THEN 'Road Length'
  WHEN 'cat-flr' THEN 'Longest Road Bonus' WHEN 'cat-ik' THEN 'Knights Played'
  WHEN 'cat-fla' THEN 'Largest Army Bonus' WHEN 'cat-ts' THEN 'Settlements'
  WHEN 'cat-tc' THEN 'Cities' WHEN 'cat-tv' THEN 'VP Development Cards'
  WHEN 'cat-ft' THEN 'Total Victory Points' WHEN 'sp-ib' THEN 'Bid'
  WHEN 'sp-it' THEN 'Tricks Won' WHEN 'sp-fs' THEN 'Round Score' WHEN 'sp-fb' THEN 'Bags'
  WHEN 'sc-ft' THEN 'Total Score' WHEN 'ch-fs' THEN 'Total Score'
  WHEN 'pk-ib' THEN 'Buy-in' WHEN 'pk-ic' THEN 'Cash-out' WHEN 'pk-fn' THEN 'Net'
  WHEN 'pk-fb' THEN 'Total Buy-ins' WHEN 'pk-fc' THEN 'Total Cash-outs' WHEN 'pk-fh' THEN 'House Balance'
  WHEN 'ttr-ir' THEN 'Route Points' WHEN 'ttr-itk' THEN 'Completed Tickets'
  WHEN 'ttr-iuf' THEN 'Unfinished Tickets' WHEN 'ttr-ilp' THEN 'Longest Path Length'
  WHEN 'ttr-flp' THEN 'Longest Path Bonus' WHEN 'ttr-ic' THEN 'Trains Remaining'
  WHEN 'ttr-ft' THEN 'Total Score'
  ELSE label
END
WHERE template_id IN ('yahtzee', 'uno', 'catan', 'spades', 'scrabble', 'cornhole', 'poker', 'phase10', 'golf', 'ticket');

UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.child', true)
WHERE id GLOB 'uno-r*' OR id GLOB 'p10-r*' OR id GLOB 'gf-h*' OR id GLOB 'ch-r*' OR id GLOB 'sc-w*';

UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.section', true)
WHERE id IN ('y-us-fs', 'y-us-fb', 'y-us-ft', 'y-ls-ft', 'y-gt-f', 'uno-ft', 'p10-ft',
  'gf-ft', 'sc-ft', 'ch-fs', 'cat-ft', 'pk-fn', 'pk-fb', 'pk-fc', 'pk-fh', 'ttr-ft');

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('cat-h-vp', 'catan', 0, 0, 1, 1, 'heading', 'h_victory_points', 'Victory Points', NULL, 0, '{"section":true}', 0),
  ('sp-h-round', 'spades', 0, 0, 1, 1, 'heading', 'h_round', 'This Round', NULL, 0, '{"section":true}', 0),
  ('pk-h-player', 'poker', 0, 0, 1, 1, 'heading', 'h_player', 'Player Results', NULL, 0, '{"section":true}', 0),
  ('ttr-h-score', 'ticket', 0, 0, 1, 1, 'heading', 'h_score', 'Score Breakdown', NULL, 0, '{"section":true}', 0);

-- Category help is displayed by the unified scorecard grid's info tooltip.
UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.help', CASE id
  WHEN 'y-us-h' THEN 'Score matching dice faces here. Reaching 63 points earns the upper bonus.'
  WHEN 'y-us-fb' THEN 'Calculated automatically: earn 35 points when the upper subtotal is 63 or more.'
  WHEN 'y-ls-h' THEN 'Score each lower-section category once. Enter 0 when a category is used without scoring.'
  WHEN 'y-gt-f' THEN 'Calculated automatically from the upper and lower totals.'
  WHEN 'uno-rh' THEN 'Enter cards remaining at the end of every round. The lowest total wins.'
  WHEN 'p10-rh' THEN 'Record each player’s points at the end of a round. The lowest total wins.'
  WHEN 'p10-ip' THEN 'Advance this when the player completes their current phase.'
  WHEN 'gf-hh' THEN 'Enter scores for every hole. The lowest total wins.'
  WHEN 'cat-h-vp' THEN 'Track victory-point sources. The first player to 10 points wins.'
  WHEN 'cat-flr' THEN 'Calculated automatically: 2 VP when road length is 5 or more.'
  WHEN 'cat-fla' THEN 'Calculated automatically: 2 VP when three or more knights have been played.'
  WHEN 'sp-h-round' THEN 'Enter each player’s bid and tricks won for this round.'
  WHEN 'sp-fs' THEN 'Calculated automatically from the bid and tricks won.'
  WHEN 'sc-wh' THEN 'Record scores for words played. Add more entries as the game continues.'
  WHEN 'ch-rh' THEN 'Record bags in the hole (3 points) and on the board (1 point) for each round.'
  WHEN 'pk-h-player' THEN 'Record each player’s buy-in and cash-out for this session.'
  WHEN 'pk-fh' THEN 'Calculated automatically: total buy-ins minus total cash-outs.'
  WHEN 'ttr-h-score' THEN 'Track routes, destination tickets, the longest-path bonus, and trains remaining.'
  WHEN 'ttr-iuf' THEN 'Enter the absolute value of points lost for unfinished destination tickets.'
  WHEN 'ws-bi' THEN 'Enter the total point value shown on bird cards.'
  WHEN 'ws-bi2' THEN 'Add each completed bonus-card score as a separate entry.'
  WHEN 'ws-rh' THEN 'Calculated automatically from the four end-of-round goal scores.'
  WHEN 'ws-ft' THEN 'Calculated automatically from all Wingspan scoring categories.'
END)
WHERE id IN ('y-us-h','y-us-fb','y-ls-h','y-gt-f','uno-rh','p10-rh','p10-ip','gf-hh',
  'cat-h-vp','cat-flr','cat-fla','sp-h-round','sp-fs','sc-wh','ch-rh','pk-h-player','pk-fh',
  'ttr-h-score','ttr-iuf','ws-bi','ws-bi2','ws-rh','ws-ft');

UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.default_entries', 1)
WHERE id = 'ws-bi2';

-- Wingspan variants are declarative optional modules. Their rows are
-- predeclared so score values retain stable IDs in every resolved snapshot.
INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('ws-oceania-nectar', 'wingspan', 0, 0, 1, 1, 'input:number', 'nectar', 'Nectar', NULL, 1, '{"default":0,"section":true,"rule_key":"oceania","help":"Enter the end-game nectar score from the Oceania player mat."}', 10),
  ('ws-americas-hummingbirds', 'wingspan', 0, 0, 1, 1, 'input:number', 'hummingbirds', 'Hummingbirds', NULL, 1, '{"default":0,"section":true,"rule_key":"americas","help":"Enter points from the Hummingbirds expansion scoring rules."}', 10),
  ('ws-asia-duet-map', 'wingspan', 0, 0, 1, 1, 'input:number', 'duet_map_bonus', 'Duet Map Bonus', NULL, 1, '{"default":0,"section":true,"rule_key":"asia_duet","help":"Enter the bonus scored from the Asia Duet map."}', 10);

UPDATE template_cells
SET formula_expr = 'bird_points + SUM(bonus) + round_1 + round_2 + round_3 + round_4 + eggs + cached_food + tucked_cards + nectar + hummingbirds + duet_map_bonus',
    sort_order = 100
WHERE id = 'ws-ft';

INSERT OR IGNORE INTO template_rule_sets (id, template_id, rule_key, label, help_text, definition_json, sort_order) VALUES
  ('ws-rule-oceania', 'wingspan', 'oceania', 'Oceania', 'Adds Nectar scoring from the Oceania player mat.', '{}', 1),
  ('ws-rule-americas', 'wingspan', 'americas', 'Americas', 'Adds the Hummingbirds scoring category.', '{}', 2),
  ('ws-rule-asia-duet', 'wingspan', 'asia_duet', 'Asia Duet', 'Adds the Duet Map Bonus scoring category.', '{}', 3);

UPDATE template_cells
SET sort_order = CASE id
  WHEN 'ws-oceania-nectar' THEN 11
  WHEN 'ws-americas-hummingbirds' THEN 12
  WHEN 'ws-asia-duet-map' THEN 13
  ELSE sort_order
END
WHERE id IN ('ws-oceania-nectar', 'ws-americas-hummingbirds', 'ws-asia-duet-map');

-- ============================================================
-- Round layouts: keep a round's related fields together inside each player
-- column. The unified grid renders matching inline_group values side-by-side.
-- ============================================================
UPDATE template_cells
SET sort_order = CASE id
  WHEN 'ch-r1h' THEN 21 WHEN 'ch-r1b' THEN 22 WHEN 'ch-r2h' THEN 31 WHEN 'ch-r2b' THEN 32
  WHEN 'ch-r3h' THEN 41 WHEN 'ch-r3b' THEN 42 WHEN 'ch-r4h' THEN 51 WHEN 'ch-r4b' THEN 52
  WHEN 'ch-r5h' THEN 61 WHEN 'ch-r5b' THEN 62 WHEN 'ch-r6h' THEN 71 WHEN 'ch-r6b' THEN 72
  WHEN 'ch-fs' THEN 100 ELSE sort_order END,
  label = CASE WHEN id GLOB 'ch-r*h' THEN 'Hole' WHEN id GLOB 'ch-r*b' THEN 'Board' ELSE label END,
  config_json = json_set(COALESCE(config_json, '{}'), '$.inline_group',
    'cornhole_' || substr(id, 5, 1), '$.inline_label',
    CASE WHEN id GLOB 'ch-r*h' THEN 'Hole' ELSE 'Board' END)
WHERE id GLOB 'ch-r[1-6][hb]';

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('ch-round-1', 'cornhole', 0, 0, 1, 1, 'heading', 'cornhole_round_1', 'Round 1', NULL, 0, '{"section":true}', 20),
  ('ch-round-2', 'cornhole', 0, 0, 1, 1, 'heading', 'cornhole_round_2', 'Round 2', NULL, 0, '{"section":true}', 30),
  ('ch-round-3', 'cornhole', 0, 0, 1, 1, 'heading', 'cornhole_round_3', 'Round 3', NULL, 0, '{"section":true}', 40),
  ('ch-round-4', 'cornhole', 0, 0, 1, 1, 'heading', 'cornhole_round_4', 'Round 4', NULL, 0, '{"section":true}', 50),
  ('ch-round-5', 'cornhole', 0, 0, 1, 1, 'heading', 'cornhole_round_5', 'Round 5', NULL, 0, '{"section":true}', 60),
  ('ch-round-6', 'cornhole', 0, 0, 1, 1, 'heading', 'cornhole_round_6', 'Round 6', NULL, 0, '{"section":true}', 70);

UPDATE template_cells
SET sort_order = CASE id
  WHEN 'uno-r1' THEN 20 WHEN 'uno-r2' THEN 30 WHEN 'uno-r3' THEN 40 WHEN 'uno-r4' THEN 50
  WHEN 'uno-r5' THEN 60 WHEN 'uno-r6' THEN 70 WHEN 'uno-r7' THEN 80 WHEN 'uno-r8' THEN 90
  WHEN 'uno-ft' THEN 110 ELSE sort_order END,
  config_json = json_set(COALESCE(config_json, '{}'), '$.inline_group', id, '$.inline_label', 'Score')
WHERE id GLOB 'uno-r[1-8]';

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('uno-run-1','uno',0,0,1,1,'formula','running_1','', 'round_1',1,'{"inline_group":"uno-r1","inline_label":"Total"}',21),
  ('uno-run-2','uno',0,0,1,1,'formula','running_2','', 'running_1 + round_2',1,'{"inline_group":"uno-r2","inline_label":"Total"}',31),
  ('uno-run-3','uno',0,0,1,1,'formula','running_3','', 'running_2 + round_3',1,'{"inline_group":"uno-r3","inline_label":"Total"}',41),
  ('uno-run-4','uno',0,0,1,1,'formula','running_4','', 'running_3 + round_4',1,'{"inline_group":"uno-r4","inline_label":"Total"}',51),
  ('uno-run-5','uno',0,0,1,1,'formula','running_5','', 'running_4 + round_5',1,'{"inline_group":"uno-r5","inline_label":"Total"}',61),
  ('uno-run-6','uno',0,0,1,1,'formula','running_6','', 'running_5 + round_6',1,'{"inline_group":"uno-r6","inline_label":"Total"}',71),
  ('uno-run-7','uno',0,0,1,1,'formula','running_7','', 'running_6 + round_7',1,'{"inline_group":"uno-r7","inline_label":"Total"}',81),
  ('uno-run-8','uno',0,0,1,1,'formula','running_8','', 'running_7 + round_8',1,'{"inline_group":"uno-r8","inline_label":"Total"}',91);

UPDATE template_cells
SET sort_order = CASE id
  WHEN 'p10-r1' THEN 20 WHEN 'p10-r2' THEN 30 WHEN 'p10-r3' THEN 40 WHEN 'p10-r4' THEN 50 WHEN 'p10-r5' THEN 60
  WHEN 'p10-r6' THEN 70 WHEN 'p10-r7' THEN 80 WHEN 'p10-r8' THEN 90 WHEN 'p10-r9' THEN 100 WHEN 'p10-r10' THEN 110
  WHEN 'p10-ft' THEN 130 ELSE sort_order END,
  config_json = json_set(COALESCE(config_json, '{}'), '$.inline_group', id, '$.inline_label', 'Score')
WHERE id GLOB 'p10-r*' AND cell_type = 'input:number';

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('p10-run-1','phase10',0,0,1,1,'formula','running_1','', 'round_1',1,'{"inline_group":"p10-r1","inline_label":"Total"}',21),
  ('p10-run-2','phase10',0,0,1,1,'formula','running_2','', 'running_1 + round_2',1,'{"inline_group":"p10-r2","inline_label":"Total"}',31),
  ('p10-run-3','phase10',0,0,1,1,'formula','running_3','', 'running_2 + round_3',1,'{"inline_group":"p10-r3","inline_label":"Total"}',41),
  ('p10-run-4','phase10',0,0,1,1,'formula','running_4','', 'running_3 + round_4',1,'{"inline_group":"p10-r4","inline_label":"Total"}',51),
  ('p10-run-5','phase10',0,0,1,1,'formula','running_5','', 'running_4 + round_5',1,'{"inline_group":"p10-r5","inline_label":"Total"}',61),
  ('p10-run-6','phase10',0,0,1,1,'formula','running_6','', 'running_5 + round_6',1,'{"inline_group":"p10-r6","inline_label":"Total"}',71),
  ('p10-run-7','phase10',0,0,1,1,'formula','running_7','', 'running_6 + round_7',1,'{"inline_group":"p10-r7","inline_label":"Total"}',81),
  ('p10-run-8','phase10',0,0,1,1,'formula','running_8','', 'running_7 + round_8',1,'{"inline_group":"p10-r8","inline_label":"Total"}',91),
  ('p10-run-9','phase10',0,0,1,1,'formula','running_9','', 'running_8 + round_9',1,'{"inline_group":"p10-r9","inline_label":"Total"}',101),
  ('p10-run-10','phase10',0,0,1,1,'formula','running_10','', 'running_9 + round_10',1,'{"inline_group":"p10-r10","inline_label":"Total"}',111);

-- ============================================================
-- TEMPLATE 12: Cribbage
-- ============================================================
INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('cribbage', 'Cribbage', 'Track pegging and hand points for each round. Running totals make it easy to race to 121.', 'game-cribbage', 1, 'system');

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('crib-total','cribbage',0,0,1,1,'formula','game_total','Total','running_4',1,'{"section":true}',1),
  ('crib-h-1','cribbage',0,0,1,1,'heading','crib_round_1','Round 1',NULL,0,'{"section":true}',10),
  ('crib-p-1','cribbage',0,0,1,1,'tally','pegging_1','',NULL,1,'{"inline_group":"crib-1","inline_label":"Pegging","min":0,"default":0}',11),
  ('crib-hnd-1','cribbage',0,0,1,1,'tally','hand_1','',NULL,1,'{"inline_group":"crib-1","inline_label":"Hand","min":0,"default":0}',12),
  ('crib-run-1','cribbage',0,0,1,1,'formula','running_1','', 'pegging_1 + hand_1',1,'{"inline_group":"crib-1","inline_label":"Total"}',13),
  ('crib-h-2','cribbage',0,0,1,1,'heading','crib_round_2','Round 2',NULL,0,'{"section":true}',20),
  ('crib-p-2','cribbage',0,0,1,1,'tally','pegging_2','',NULL,1,'{"inline_group":"crib-2","inline_label":"Pegging","min":0,"default":0}',21),
  ('crib-hnd-2','cribbage',0,0,1,1,'tally','hand_2','',NULL,1,'{"inline_group":"crib-2","inline_label":"Hand","min":0,"default":0}',22),
  ('crib-run-2','cribbage',0,0,1,1,'formula','running_2','', 'running_1 + pegging_2 + hand_2',1,'{"inline_group":"crib-2","inline_label":"Total"}',23),
  ('crib-h-3','cribbage',0,0,1,1,'heading','crib_round_3','Round 3',NULL,0,'{"section":true}',30),
  ('crib-p-3','cribbage',0,0,1,1,'tally','pegging_3','',NULL,1,'{"inline_group":"crib-3","inline_label":"Pegging","min":0,"default":0}',31),
  ('crib-hnd-3','cribbage',0,0,1,1,'tally','hand_3','',NULL,1,'{"inline_group":"crib-3","inline_label":"Hand","min":0,"default":0}',32),
  ('crib-run-3','cribbage',0,0,1,1,'formula','running_3','', 'running_2 + pegging_3 + hand_3',1,'{"inline_group":"crib-3","inline_label":"Total"}',33),
  ('crib-h-4','cribbage',0,0,1,1,'heading','crib_round_4','Round 4',NULL,0,'{"section":true}',40),
  ('crib-p-4','cribbage',0,0,1,1,'tally','pegging_4','',NULL,1,'{"inline_group":"crib-4","inline_label":"Pegging","min":0,"default":0}',41),
  ('crib-hnd-4','cribbage',0,0,1,1,'tally','hand_4','',NULL,1,'{"inline_group":"crib-4","inline_label":"Hand","min":0,"default":0}',42),
  ('crib-run-4','cribbage',0,0,1,1,'formula','running_4','', 'running_3 + pegging_4 + hand_4',1,'{"inline_group":"crib-4","inline_label":"Total"}',43);

-- Cribbage uses a repeatable round group instead of a fixed number of rounds.
-- Keep the original rows hidden for existing local seed databases, then add
-- the reusable Pegging / Hand / running-total row definition.
UPDATE template_cells
SET sort_order = -1
WHERE template_id = 'cribbage'
  AND id NOT IN ('crib-round-pegging', 'crib-round-hand', 'crib-round-total');

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('crib-round-pegging','cribbage',0,0,1,1,'tally','pegging','',NULL,1,'{"inline_group":"cribbage-round","repeatable_group":"cribbage-round","repeatable_label":"Round","inline_label":"Pegging","min":0,"default":0}',1),
  ('crib-round-hand','cribbage',0,0,1,1,'tally','hand','',NULL,1,'{"inline_group":"cribbage-round","repeatable_group":"cribbage-round","repeatable_label":"Round","inline_label":"Hand","min":0,"default":0}',2),
  ('crib-round-total','cribbage',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"cribbage-round","repeatable_group":"cribbage-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',3);

-- ============================================================
-- Additional data-designed scorecards
-- ============================================================
-- Scrabble moves from a fixed twelve-word sheet to a repeatable word row.
-- This keeps the historic rows available for existing snapshots while new
-- games can record every word played.
UPDATE template_cells
SET sort_order = -1
WHERE template_id = 'scrabble'
  AND id NOT IN ('sc-total', 'sc-word', 'sc-points');

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('sc-total','scrabble',0,0,1,1,'formula','total_score','Total Score','SUM(word_points)',1,'{"section":true,"help":"Calculated from all recorded word scores."}',1),
  ('sc-word','scrabble',0,0,1,1,'input:text','word','',NULL,1,'{"inline_group":"scrabble-word","repeatable_group":"scrabble-word","repeatable_label":"Word","inline_label":"Word","placeholder":"Word played"}',2),
  ('sc-points','scrabble',0,0,1,1,'input:number','word_points','',NULL,1,'{"inline_group":"scrabble-word","repeatable_group":"scrabble-word","repeatable_label":"Word","inline_label":"Points","default":0,"help":"Include letter, premium-square, and bingo points."}',3);

INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('romanian-whist', 'Romanian Whist', 'Record each round score with an automatically updated running total.', 'game-romanian-whist', 1, 'system'),
  ('five-hundred', '500', 'Track each team''s contract result per hand and its running score.', 'game-five-hundred', 1, 'system'),
  ('liverpool-rummy', 'Liverpool Rummy', 'Record remaining-card points each round. The lowest total wins.', 'game-liverpool-rummy', 1, 'system');

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('rw-total','romanian-whist',0,0,1,1,'formula','total_score','Total Score','SUM(round_score)',1,'{"section":true,"help":"Calculated from every recorded round."}',1),
  ('rw-score','romanian-whist',0,0,1,1,'input:number','round_score','',NULL,1,'{"inline_group":"romanian-whist-round","repeatable_group":"romanian-whist-round","repeatable_label":"Round","inline_label":"Score","default":0,"help":"Enter the score awarded for this round."}',2),
  ('rw-running','romanian-whist',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"romanian-whist-round","repeatable_group":"romanian-whist-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',3),
  ('fh-total','five-hundred',0,0,1,1,'formula','total_score','Total Score','SUM(hand_score)',1,'{"section":true,"help":"Calculated from every recorded hand."}',1),
  ('fh-score','five-hundred',0,0,1,1,'input:number','hand_score','',NULL,1,'{"inline_group":"five-hundred-hand","repeatable_group":"five-hundred-hand","repeatable_label":"Hand","inline_label":"Contract score","default":0,"help":"Enter the positive or negative contract score for this hand."}',2),
  ('fh-running','five-hundred',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"five-hundred-hand","repeatable_group":"five-hundred-hand","repeatable_label":"Hand","inline_label":"Total","repeatable_running_total":true}',3),
  ('lr-total','liverpool-rummy',0,0,1,1,'formula','total_points','Total Points','SUM(round_points)',1,'{"section":true,"help":"Calculated from every recorded round. Lowest score wins."}',1),
  ('lr-score','liverpool-rummy',0,0,1,1,'input:number','round_points','',NULL,1,'{"inline_group":"liverpool-rummy-round","repeatable_group":"liverpool-rummy-round","repeatable_label":"Round","inline_label":"Points","default":0,"help":"Enter the value of cards left in hand at the end of the round."}',2),
  ('lr-running','liverpool-rummy',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"liverpool-rummy-round","repeatable_group":"liverpool-rummy-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',3);

INSERT OR IGNORE INTO templates (id, name, description, game_id, is_public, created_by) VALUES
  ('euchre', 'Euchre', 'Track each hand''s points with running totals. The first team to 10 wins.', 'game-euchre', 1, 'system'),
  ('bridge', 'Bridge', 'Record each board''s score with running totals for each partnership.', 'game-bridge', 1, 'system'),
  ('azul', 'Azul', 'Record each round''s score and track the running total.', 'game-azul', 1, 'system'),
  ('rummy', 'Rummy', 'Record remaining-card points each round. The lowest total wins.', 'game-rummy', 1, 'system'),
  ('terraforming-mars', 'Terraforming Mars', 'Calculate final points from Terraform Rating, awards, milestones, board tiles, and card points.', 'game-terraforming-mars', 1, 'system'),
  ('cascadia', 'Cascadia', 'Calculate end-game points from wildlife, habitat corridors, and nature tokens.', 'game-cascadia', 1, 'system'),
  ('mus', 'Mus', 'Track Grande, Chica, Pares, and Juego/Punto over each hand. First team to the agreed target wins.', 'game-mus', 1, 'system');

INSERT OR IGNORE INTO template_cells
  (id, template_id, row_pos, col_pos, row_span, col_span, cell_type, cell_key, label, formula_expr, per_player, config_json, sort_order)
VALUES
  ('eu-total','euchre',0,0,1,1,'formula','total_score','Total Score','SUM(hand_score)',1,'{"section":true,"help":"Calculated from every recorded hand. First to 10 wins."}',1),
  ('eu-score','euchre',0,0,1,1,'input:number','hand_score','',NULL,1,'{"inline_group":"euchre-hand","repeatable_group":"euchre-hand","repeatable_label":"Hand","inline_label":"Points","default":0,"help":"Enter points won for this hand."}',2),
  ('eu-running','euchre',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"euchre-hand","repeatable_group":"euchre-hand","repeatable_label":"Hand","inline_label":"Total","repeatable_running_total":true}',3),
  ('br-total','bridge',0,0,1,1,'formula','total_score','Total Score','SUM(board_score)',1,'{"section":true,"help":"Calculated from every recorded board."}',1),
  ('br-score','bridge',0,0,1,1,'input:number','board_score','',NULL,1,'{"inline_group":"bridge-board","repeatable_group":"bridge-board","repeatable_label":"Board","inline_label":"Score","default":0,"help":"Enter the positive or negative score for this partnership."}',2),
  ('br-running','bridge',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"bridge-board","repeatable_group":"bridge-board","repeatable_label":"Board","inline_label":"Total","repeatable_running_total":true}',3),
  ('az-total','azul',0,0,1,1,'formula','total_score','Total Score','SUM(round_score)',1,'{"section":true,"help":"Calculated from every recorded round."}',1),
  ('az-score','azul',0,0,1,1,'input:number','round_score','',NULL,1,'{"inline_group":"azul-round","repeatable_group":"azul-round","repeatable_label":"Round","inline_label":"Score","default":0,"help":"Enter the points gained or lost in this round."}',2),
  ('az-running','azul',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"azul-round","repeatable_group":"azul-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',3),
  ('ru-total','rummy',0,0,1,1,'formula','total_points','Total Points','SUM(round_points)',1,'{"section":true,"help":"Calculated from every recorded round. Lowest score wins."}',1),
  ('ru-score','rummy',0,0,1,1,'input:number','round_points','',NULL,1,'{"inline_group":"rummy-round","repeatable_group":"rummy-round","repeatable_label":"Round","inline_label":"Points","default":0,"help":"Enter the value of cards left in hand at the end of the round."}',2),
  ('ru-running','rummy',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"rummy-round","repeatable_group":"rummy-round","repeatable_label":"Round","inline_label":"Total","repeatable_running_total":true}',3),
  ('tm-total','terraforming-mars',0,0,1,1,'formula','total_score','Total Score','terraform_rating + awards * 5 + milestones * 5 + greenery + city_points + card_points',1,'{"section":true,"help":"Calculated from all final scoring categories."}',1),
  ('tm-rating','terraforming-mars',0,0,1,1,'input:number','terraform_rating','Terraform Rating',NULL,1,'{"section":true,"default":20,"help":"Enter your final Terraform Rating."}',2),
  ('tm-awards','terraforming-mars',0,0,1,1,'tally','awards','Awards',NULL,1,'{"section":true,"min":0,"default":0,"help":"Number of funded awards. Each is worth 5 points."}',3),
  ('tm-milestones','terraforming-mars',0,0,1,1,'tally','milestones','Milestones',NULL,1,'{"section":true,"min":0,"default":0,"help":"Number of claimed milestones. Each is worth 5 points."}',4),
  ('tm-greenery','terraforming-mars',0,0,1,1,'input:number','greenery','Greenery Tiles',NULL,1,'{"section":true,"default":0,"help":"One point per greenery tile."}',5),
  ('tm-city','terraforming-mars',0,0,1,1,'input:number','city_points','City Points',NULL,1,'{"section":true,"default":0,"help":"Total points from city tiles, including adjacent greenery."}',6),
  ('tm-cards','terraforming-mars',0,0,1,1,'input:number','card_points','Card Points',NULL,1,'{"section":true,"default":0,"help":"Total victory points shown on played cards."}',7),
  ('ca-total','cascadia',0,0,1,1,'formula','total_score','Total Score','wildlife + habitats + nature_tokens',1,'{"section":true,"help":"Calculated from all final scoring categories."}',1),
  ('ca-wildlife','cascadia',0,0,1,1,'input:number','wildlife','Wildlife',NULL,1,'{"section":true,"default":0,"help":"Total points from all wildlife scoring cards."}',2),
  ('ca-habitats','cascadia',0,0,1,1,'input:number','habitats','Habitat Corridors',NULL,1,'{"section":true,"default":0,"help":"Total points from habitat corridor scoring."}',3),
  ('ca-nature','cascadia',0,0,1,1,'tally','nature_tokens','Nature Tokens',NULL,1,'{"section":true,"min":0,"default":0,"help":"One point per unspent nature token."}',4),
  ('mu-total','mus',0,0,1,1,'formula','total_score','Total Score','SUM(grande) + SUM(chica) + SUM(pares) + SUM(juego_punto)',1,'{"section":true,"help":"Calculated from every recorded hand."}',1),
  ('mu-grande','mus',0,0,1,1,'input:number','grande','',NULL,1,'{"inline_group":"mus-hand","repeatable_group":"mus-hand","repeatable_label":"Hand","inline_label":"Grande","default":0,"help":"Points won for Grande in this hand."}',2),
  ('mu-chica','mus',0,0,1,1,'input:number','chica','',NULL,1,'{"inline_group":"mus-hand","repeatable_group":"mus-hand","repeatable_label":"Hand","inline_label":"Chica","default":0,"help":"Points won for Chica in this hand."}',3),
  ('mu-pares','mus',0,0,1,1,'input:number','pares','',NULL,1,'{"inline_group":"mus-hand","repeatable_group":"mus-hand","repeatable_label":"Hand","inline_label":"Pares","default":0,"help":"Points won for Pares in this hand."}',4),
  ('mu-juego','mus',0,0,1,1,'input:number','juego_punto','',NULL,1,'{"inline_group":"mus-hand","repeatable_group":"mus-hand","repeatable_label":"Hand","inline_label":"Juego/Punto","default":0,"help":"Points won for Juego or Punto in this hand."}',5),
  ('mu-running','mus',0,0,1,1,'formula','running_total','',NULL,1,'{"inline_group":"mus-hand","repeatable_group":"mus-hand","repeatable_label":"Hand","inline_label":"Total","repeatable_running_total":true}',6);

-- Final scorecard totals belong after the scoring rows. Inline running totals
-- and sectional subtotals intentionally stay with the rows they explain.
UPDATE template_cells
SET sort_order = 1000
WHERE cell_key IN ('total_score', 'total_points', 'total_vp', 'grand_total', 'player_total')
  AND sort_order >= 0
  AND COALESCE(json_extract(config_json, '$.inline_group'), '') = '';

-- Each Cornhole round has its own section heading. The heading's per-player
-- formula presents that round's score (hole bags × 3 plus board bags) before
-- the Hole and Board inputs in the subsection.
UPDATE template_cells
SET formula_expr = CASE id
      WHEN 'ch-round-1' THEN 'hole_1 * 3 + board_1'
      WHEN 'ch-round-2' THEN 'hole_2 * 3 + board_2'
      WHEN 'ch-round-3' THEN 'hole_3 * 3 + board_3'
      WHEN 'ch-round-4' THEN 'hole_4 * 3 + board_4'
      WHEN 'ch-round-5' THEN 'hole_5 * 3 + board_5'
      WHEN 'ch-round-6' THEN 'hole_6 * 3 + board_6'
    END,
    per_player = 1,
    config_json = json_set(COALESCE(config_json, '{}'), '$.help', 'Calculated: hole bags × 3 plus board bags.')
WHERE id IN ('ch-round-1', 'ch-round-2', 'ch-round-3', 'ch-round-4', 'ch-round-5', 'ch-round-6');

-- Score entry always belongs to a player. Shared values are reserved for
-- formulas, where the author must explicitly choose how player scores combine.
UPDATE template_cells
SET per_player = 1
WHERE cell_type IN ('input:text', 'input:number', 'tally');

UPDATE template_cells
SET formula_expr = CASE id
  WHEN 'pk-fb' THEN 'SUM(PLAYERS(buy_in))'
  WHEN 'pk-fc' THEN 'SUM(PLAYERS(cash_out))'
  ELSE formula_expr
END
WHERE id IN ('pk-fb', 'pk-fc');

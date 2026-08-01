-- Helpful category guidance displayed by the unified grid's hover/focus tooltip.
-- Stored in config_json so custom templates can use the same `help` property.

UPDATE template_cells
SET config_json = json_set(COALESCE(config_json, '{}'), '$.help', CASE id
  -- Yahtzee
  WHEN 'y-us-h' THEN 'Score each matching dice face in the upper section. Reaching 63 points earns the upper bonus.'
  WHEN 'y-us-fs' THEN 'Calculated automatically from Ones through Sixes.'
  WHEN 'y-us-fb' THEN 'Calculated automatically: earn 35 points when the upper subtotal is 63 or more.'
  WHEN 'y-us-ft' THEN 'Calculated automatically from the upper subtotal and upper bonus.'
  WHEN 'y-ls-h' THEN 'Score each lower-section category once. Enter 0 when a category is used without scoring.'
  WHEN 'y-ls-ft' THEN 'Calculated automatically from all lower-section categories.'
  WHEN 'y-gt-f' THEN 'Calculated automatically from the upper and lower totals.'
  -- Uno / Phase 10 / Golf
  WHEN 'uno-rh' THEN 'Enter each player’s cards remaining at the end of every round. The lowest total wins.'
  WHEN 'uno-ft' THEN 'Calculated automatically from all recorded rounds.'
  WHEN 'p10-rh' THEN 'Record a player’s points at the end of each round. The lowest total wins.'
  WHEN 'p10-ip' THEN 'Advance this when the player completes their current phase.'
  WHEN 'p10-ft' THEN 'Calculated automatically from all recorded rounds.'
  WHEN 'gf-hh' THEN 'Enter each player’s score for every hole. The lowest total wins.'
  WHEN 'gf-ft' THEN 'Calculated automatically from all nine holes.'
  -- Catan
  WHEN 'cat-h-vp' THEN 'Track victory-point sources. The first player to 10 victory points wins.'
  WHEN 'cat-ir' THEN 'Enter the number of connected road pieces. Five or more qualifies for the longest-road bonus.'
  WHEN 'cat-flr' THEN 'Calculated automatically: 2 VP when road length is 5 or more.'
  WHEN 'cat-ik' THEN 'Enter knights played. Three or more qualifies for the largest-army bonus.'
  WHEN 'cat-fla' THEN 'Calculated automatically: 2 VP when three or more knights have been played.'
  WHEN 'cat-ft' THEN 'Calculated automatically: settlements, cities, bonuses, and VP development cards.'
  -- Spades
  WHEN 'sp-h-round' THEN 'Enter each player’s bid and tricks won for the current round.'
  WHEN 'sp-fs' THEN 'Calculated automatically: 10 points per bid trick plus 1 per overtrick; missed bids lose 10 per bid trick.'
  WHEN 'sp-fb' THEN 'Calculated automatically from overtricks in this round.'
  -- Scrabble / Cornhole
  WHEN 'sc-wh' THEN 'Record scores for words played. Add more entries as the game continues.'
  WHEN 'sc-ft' THEN 'Calculated automatically from all word scores.'
  WHEN 'ch-rh' THEN 'Record bags in the hole (3 points) and on the board (1 point) for each round.'
  WHEN 'ch-fs' THEN 'Calculated automatically: hole bags × 3 plus board bags.'
  -- Poker
  WHEN 'pk-h-player' THEN 'Record each player’s buy-in and cash-out for this session.'
  WHEN 'pk-fn' THEN 'Calculated automatically: cash-out minus buy-in.'
  WHEN 'pk-sh' THEN 'Session-wide totals are calculated from every player’s entries.'
  WHEN 'pk-fh' THEN 'Calculated automatically: total buy-ins minus total cash-outs.'
  -- Ticket to Ride
  WHEN 'ttr-h-score' THEN 'Track each source of score, including completed and unfinished destination tickets.'
  WHEN 'ttr-iuf' THEN 'Enter the absolute value of points lost for unfinished destination tickets.'
  WHEN 'ttr-flp' THEN 'Calculated automatically: awards 10 points when a longest path length is entered.'
  WHEN 'ttr-ft' THEN 'Calculated automatically from route points, tickets, unfinished-ticket penalty, and longest-path bonus.'
  -- Wingspan
  WHEN 'ws-bi' THEN 'Enter the total point value shown on bird cards in the player’s habitat.'
  WHEN 'ws-bi2' THEN 'Add each completed bonus-card score as a separate entry.'
  WHEN 'ws-rh' THEN 'Calculated automatically from the four end-of-round goal scores.'
  WHEN 'ws-et' THEN 'Enter one point for every egg at game end.'
  WHEN 'ws-ft2' THEN 'Enter one point for every cached food token at game end.'
  WHEN 'ws-tt' THEN 'Enter one point for every tucked card at game end.'
  WHEN 'ws-ft' THEN 'Calculated automatically from birds, bonuses, end-of-round goals, eggs, cached food, and tucked cards.'
END)
WHERE id IN (
  'y-us-h','y-us-fs','y-us-fb','y-us-ft','y-ls-h','y-ls-ft','y-gt-f',
  'uno-rh','uno-ft','p10-rh','p10-ip','p10-ft','gf-hh','gf-ft',
  'cat-h-vp','cat-ir','cat-flr','cat-ik','cat-fla','cat-ft',
  'sp-h-round','sp-fs','sp-fb','sc-wh','sc-ft','ch-rh','ch-fs',
  'pk-h-player','pk-fn','pk-sh','pk-fh','ttr-h-score','ttr-iuf','ttr-flp','ttr-ft',
  'ws-bi','ws-bi2','ws-rh','ws-et','ws-ft2','ws-tt','ws-ft'
);

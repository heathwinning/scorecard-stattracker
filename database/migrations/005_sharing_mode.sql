-- Persist the host's collaboration choice. Existing scorecards deliberately
-- become shared scorecards so link participants retain full edit access.
ALTER TABLE scorecards ADD COLUMN sharing_mode TEXT NOT NULL DEFAULT 'shared'
  CHECK(sharing_mode IN ('shared', 'slots'));

-- Apply this migration once to an existing JELAJAH Supabase project.
-- New installations can run schema.sql directly instead.

ALTER TABLE hunts ADD COLUMN IF NOT EXISTS hunt_id_hash CHAR(64);
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS create_tx_hash CHAR(64);
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS asset_contract VARCHAR(56);
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS clue_hash CHAR(64);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS photo_hash CHAR(64);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS tx_hash CHAR(64);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS resolve_tx_hash CHAR(64);

ALTER TABLE hunts DROP CONSTRAINT IF EXISTS hunts_status_check;
ALTER TABLE hunts ADD CONSTRAINT hunts_status_check
  CHECK (status IN ('active', 'claim_pending', 'claimed', 'expired', 'disputed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_hunts_hunt_id_hash ON hunts(hunt_id_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hunts_create_tx_hash ON hunts(create_tx_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_tx_hash ON claims(tx_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_resolve_tx_hash ON claims(resolve_tx_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_pending_per_hunt
  ON claims(hunt_id) WHERE status = 'pending';

-- Deny direct client mutations even if a permissive legacy policy exists under
-- an unexpected name. The service-role API remains able to bypass RLS.
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public profiles are readable" ON users;
CREATE POLICY "public profiles are readable" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "public hunts are readable" ON hunts;
CREATE POLICY "public hunts are readable" ON hunts FOR SELECT USING (true);
DROP POLICY IF EXISTS "public disputes are readable" ON disputes;
CREATE POLICY "public disputes are readable" ON disputes FOR SELECT USING (true);
DROP POLICY IF EXISTS "public verifiers are readable" ON verifiers;
CREATE POLICY "public verifiers are readable" ON verifiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "public appeals are readable" ON appeals;
CREATE POLICY "public appeals are readable" ON appeals FOR SELECT USING (true);
DROP POLICY IF EXISTS "public brands are readable" ON brands;
CREATE POLICY "public brands are readable" ON brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "public campaigns are readable" ON campaigns;
CREATE POLICY "public campaigns are readable" ON campaigns FOR SELECT USING (true);
DROP POLICY IF EXISTS "public campaign hunts are readable" ON campaign_hunts;
CREATE POLICY "public campaign hunts are readable" ON campaign_hunts FOR SELECT USING (true);
DROP POLICY IF EXISTS "public leaderboard is readable" ON leaderboard_snapshots;
CREATE POLICY "public leaderboard is readable" ON leaderboard_snapshots FOR SELECT USING (true);
DROP POLICY IF EXISTS "public streaks are readable" ON streaks;
CREATE POLICY "public streaks are readable" ON streaks FOR SELECT USING (true);
DROP POLICY IF EXISTS "public badges are readable" ON user_badges;
CREATE POLICY "public badges are readable" ON user_badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "public activity is readable" ON community_activities;
CREATE POLICY "public activity is readable" ON community_activities FOR SELECT USING (true);

-- Intentionally no anon INSERT/UPDATE/DELETE policies. Server routes use the
-- service role after verifying the wallet signature and confirmed chain call.

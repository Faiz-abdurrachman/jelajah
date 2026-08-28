-- Level 4 production MVP: campaign funding, consent, wallet evidence, feedback.
-- Apply after 001_secure_gps_mvp.sql. All writes remain service-role only.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget_stroops BIGINT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_stroops BIGINT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS asset_code VARCHAR(12) NOT NULL DEFAULT 'XLM';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS asset_contract VARCHAR(56);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE campaigns
SET budget_stroops = COALESCE(budget, 0)
WHERE budget_stroops = 0 AND budget IS NOT NULL;

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'funding', 'active', 'paused', 'completed', 'cancelled'));
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE campaigns ADD CONSTRAINT campaigns_budget_nonnegative
  CHECK (budget_stroops >= 0 AND funded_stroops >= 0);
ALTER TABLE campaigns ADD CONSTRAINT campaigns_valid_period
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date > start_date);

ALTER TABLE campaign_hunts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_hunts_hunt ON campaign_hunts(hunt_id);

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id BIGSERIAL PRIMARY KEY,
  public_key VARCHAR(56) NOT NULL UNIQUE REFERENCES users(public_key) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('sponsor', 'hunter')),
  consent_version VARCHAR(20) NOT NULL,
  current_step VARCHAR(40) NOT NULL DEFAULT 'wallet_connected',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_interactions (
  transaction_hash CHAR(64) PRIMARY KEY,
  public_key VARCHAR(56) NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
  action VARCHAR(40) NOT NULL,
  contract_id VARCHAR(56),
  network VARCHAR(20) NOT NULL DEFAULT 'testnet' CHECK (network = 'testnet'),
  ledger BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status = 'confirmed'),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_interactions_user
  ON wallet_interactions(public_key, confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_interactions_action
  ON wallet_interactions(action, confirmed_at DESC);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id BIGSERIAL PRIMARY KEY,
  public_key VARCHAR(56) NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('sponsor', 'hunter')),
  onboarding_rating SMALLINT NOT NULL CHECK (onboarding_rating BETWEEN 1 AND 5),
  transaction_clarity_rating SMALLINT NOT NULL CHECK (transaction_clarity_rating BETWEEN 1 AND 5),
  usability_rating SMALLINT NOT NULL CHECK (usability_rating BETWEEN 1 AND 5),
  understood_reward_timing BOOLEAN NOT NULL,
  would_use_again BOOLEAN NOT NULL,
  confusion TEXT CHECK (confusion IS NULL OR char_length(confusion) <= 1000),
  suggestion TEXT CHECK (suggestion IS NULL OR char_length(suggestion) <= 1000),
  consent_to_anonymous_use BOOLEAN NOT NULL CHECK (consent_to_anonymous_use = TRUE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created
  ON feedback_submissions(created_at DESC);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON onboarding_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON wallet_interactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON feedback_submissions FROM anon, authenticated;
REVOKE SELECT ON onboarding_sessions FROM anon, authenticated;
REVOKE SELECT ON wallet_interactions FROM anon, authenticated;
REVOKE SELECT ON feedback_submissions FROM anon, authenticated;

DROP POLICY IF EXISTS "public campaigns are readable" ON campaigns;
CREATE POLICY "active campaigns are readable" ON campaigns
  FOR SELECT USING (status IN ('active', 'completed'));

DROP POLICY IF EXISTS "public campaign hunts are readable" ON campaign_hunts;
CREATE POLICY "active campaign hunts are readable" ON campaign_hunts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_hunts.campaign_id
        AND campaigns.status IN ('active', 'completed')
    )
  );


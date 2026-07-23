-- JELAJAH — Full Database Schema
-- Dibangun sekali untuk semua level (L1-L7)
-- PostgreSQL

-- ─── Users ────────────────────────────────────────────── L1

CREATE TABLE IF NOT EXISTS users (
  public_key VARCHAR(56) PRIMARY KEY,
  display_name VARCHAR(50),
  avatar_url TEXT,
  reputation_score INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  is_verified_hider BOOLEAN DEFAULT FALSE,
  is_brand BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_xp ON users(xp DESC);

-- ─── Hunts ────────────────────────────────────────────── L2

CREATE TABLE IF NOT EXISTS hunts (
  id SERIAL PRIMARY KEY,
  contract_id VARCHAR(56) UNIQUE,
  hider_pubkey VARCHAR(56) REFERENCES users(public_key),
  hunt_type VARCHAR(20) NOT NULL CHECK (hunt_type IN ('gps', 'quest', 'race', 'puzzle', 'photo')),
  clue TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INTEGER DEFAULT 50,
  amount_stroops BIGINT,
  deadline TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'disputed')),
  photo_cid TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hunts_status ON hunts(status);
CREATE INDEX idx_hunts_hider ON hunts(hider_pubkey);
CREATE INDEX idx_hunts_location ON hunts(latitude, longitude);
CREATE INDEX idx_hunts_deadline ON hunts(deadline);
CREATE INDEX idx_hunts_type ON hunts(hunt_type);

-- ─── Claims ───────────────────────────────────────────── L2

CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  hunt_id INTEGER NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  hunter_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  photo_cid TEXT,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
  submitted_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_claims_hunt ON claims(hunt_id);
CREATE INDEX idx_claims_hunter ON claims(hunter_pubkey);
CREATE INDEX idx_claims_status ON claims(status);

-- ─── Disputes ─────────────────────────────────────────── L3

CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  hunt_id INTEGER NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  verifiers TEXT[] DEFAULT '{}',
  votes JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'voting' CHECK (status IN ('voting', 'resolved', 'appealed')),
  resolution VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_claim ON disputes(claim_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ─── Verifiers ────────────────────────────────────────── L3

CREATE TABLE IF NOT EXISTS verifiers (
  public_key VARCHAR(56) PRIMARY KEY REFERENCES users(public_key),
  stake BIGINT DEFAULT 0,
  disputes_handled INTEGER DEFAULT 0,
  dispute_fee_earned BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verifiers_stake ON verifiers(stake DESC);

-- ─── Appeals ──────────────────────────────────────────── L3

CREATE TABLE IF NOT EXISTS appeals (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  appellant_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  reason TEXT NOT NULL,
  additional_evidence TEXT,
  verifiers TEXT[] DEFAULT '{}',
  votes JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'voting', 'resolved')),
  resolution VARCHAR(20),
  fee_paid BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_appeals_dispute ON appeals(dispute_id);

-- ─── Brands ───────────────────────────────────────────── L4

CREATE TABLE IF NOT EXISTS brands (
  public_key VARCHAR(56) PRIMARY KEY REFERENCES users(public_key),
  company_name VARCHAR(100) NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  total_campaigns INTEGER DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Campaigns ────────────────────────────────────────── L4

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  brand_pubkey VARCHAR(56) NOT NULL REFERENCES brands(public_key),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  budget BIGINT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_brand ON campaigns(brand_pubkey);

-- ─── Campaign Hunts (junction table) ──────────────────── L4

CREATE TABLE IF NOT EXISTS campaign_hunts (
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  hunt_id INTEGER NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, hunt_id)
);

-- ─── Referrals ────────────────────────────────────────── L4

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  referee_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(referee_pubkey)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_pubkey);

-- ─── Leaderboard ──────────────────────────────────────── L4

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id SERIAL PRIMARY KEY,
  rank_type VARCHAR(20) NOT NULL CHECK (rank_type IN ('hunter', 'hider', 'verifier')),
  user_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  score BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_period ON leaderboard_snapshots(rank_type, period_start, period_end);

-- ─── Streaks ──────────────────────────────────────────── L5

CREATE TABLE IF NOT EXISTS streaks (
  id SERIAL PRIMARY KEY,
  user_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  streak_type VARCHAR(20) NOT NULL CHECK (streak_type IN ('login', 'hunt_claim', 'hunt_create')),
  current_count INTEGER DEFAULT 0,
  longest_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_pubkey, streak_type)
);

CREATE INDEX idx_streaks_user ON streaks(user_pubkey);

-- ─── Badges ───────────────────────────────────────────── L5

CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  badge_id INTEGER NOT NULL,
  badge_name VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_pubkey, badge_id)
);

CREATE INDEX idx_badges_user ON user_badges(user_pubkey);

-- ─── Notifications ────────────────────────────────────── L5

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  type VARCHAR(30) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_pubkey, is_read, created_at DESC);

-- ─── Community Feed ───────────────────────────────────── L5

CREATE TABLE IF NOT EXISTS community_activities (
  id SERIAL PRIMARY KEY,
  user_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  activity_type VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_community_activities ON community_activities(created_at DESC);

-- ─── API Keys ─────────────────────────────────────────── L7

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_pubkey VARCHAR(56) NOT NULL REFERENCES users(public_key),
  api_key_hash VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '["read"]',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_api_keys_user ON api_keys(user_pubkey);

-- ─── Audit Log ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  actor_pubkey VARCHAR(56),
  entity_type VARCHAR(30),
  entity_id VARCHAR(56),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

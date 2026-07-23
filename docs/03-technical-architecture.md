# JELAJAH — Technical Architecture

## 1. Tech Stack

| Layer | Technology | Alasan |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + TypeScript 5 | Standard, Vercel deploy, SSR support |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Cepet develop, responsive, accessible |
| **Map** | Mapbox GL JS | GPS coordinate, custom markers, clustering |
| **Wallet** | Stellar Wallets Kit | Multi-wallet (Freighter, Albedo, xBull, Lobstr) |
| **Smart Contract** | Soroban SDK (Rust) + stellar-cli | Claimable Balances, multi-sig, event streaming |
| **Blockchain** | Stellar Testnet → Mainnet | Fee ~Rp 1, settlement <5 detik |
| **File Storage** | Pinata / web3.storage (IPFS) | Foto referensi + bukti hunter |
| **Database** | Supabase (PostgreSQL managed) | Metadata hunt, user profiles, realtime subscriptions |
| **Indexer** | Mercury / self-hosted | Listen contract events, update DB |
| **CI/CD** | GitHub Actions + Vercel | Auto build, test, deploy |
| **Testing** | Playwright (E2E) + cargo test (contract) | |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │   Map    │  │ Hunt UI  │  │  Wallet  │  │   Admin /    │  │
│  │ (Mapbox) │  │ Create/  │  │ (SWK)    │  │   Brand      │  │
│  │          │  │ Claim/   │  │          │  │   Dashboard   │  │
│  │          │  │ Dispute  │  │          │  │             │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
└───────┼─────────────┼─────────────┼────────────────┼─────────┘
        │             │             │                │
        ▼             ▼             ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND API (Next.js API Routes)          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ Hunt       │  │  Auth      │  │  Event     │             │
│  │ Service    │  │  (wallet)  │  │  Indexer   │             │
│  └─────┬──────┘  └──────┬─────┘  └──────┬──────┘             │
└────────┼────────────────┼───────────────┼────────────────────┘
         │                │               │
         ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    STELLAR NETWORK                            │
│  ┌────────────────────┐  ┌──────────────────┐               │
│  │   Soroban          │  │  Horizon API     │               │
│  │   Contracts        │  │  (balance, tx)   │               │
│  │   ─ hunt-factory   │  └──────────────────┘               │
│  │   ─ hunt-instance  │                                     │
│  │   ─ reputation     │  ┌──────────────────┐               │
│  │   ─ dispute        │  │  Claimable       │               │
│  │                    │  │  Balances        │               │
│  └────────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
         │                │               │
         ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      OFF-CHAIN STORAGE                        │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Supabase (PG)   │  │  IPFS / Pinata   │                  │
│  │  ─ hunt metadata │  │  ─ photo hider   │                  │
│  │  ─ user profiles │  │  ─ photo bukti   │                  │
│  │  ─ realtime      │  │  ─ quest data    │                  │
│  └──────────────────┘  └──────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Smart Contracts

| Contract | Fungsi | Key Features |
|---|---|---|
| **hunt-factory** | Deploy hunt-instance, event streaming | `create_hunt()`, `get_hunt_count()`, `event:HuntCreated` |
| **hunt-instance** | Per-hunt: deposit, GPS, claim, timer, release | `deposit()`, `submit_claim()`, `approve()`, `release()`, `dispute()` |
| **reputation** | XP, level, badges on-chain | `add_xp()`, `get_level()`, `issue_badge()` |
| **dispute** | Multi-sig commit-reveal voting | `create_dispute()`, `commit_vote()`, `reveal_vote()`, `appeal()` |

---

## 4. Data Flow

### 4.1 Create Hunt
```
1. Hider input di frontend: clue, GPS, amount, deadline, foto
2. Upload foto → IPFS → dapet CID hash
3. Frontend call hunt-factory → deploy hunt-instance
4. hunt-instance → create ClaimableBalance (deposit amount)
5. Metadata → PostgreSQL (opsional)
6. Hunt muncul di map
```

### 4.2 Claim Hunt
```
1. Hunter sampai GPS radius
2. Ambil foto → upload ke IPFS → dapet CID
3. Submit claim → hunt-instance contract
4. Timer 24 jam mulai
5. Hider approve / auto cair / dispute
6. Claimable Balance → release ke hunter (via Path Payments opsional)
```

### 4.3 Dispute
```
1. Hider reject + alasan
2. Sistem pilih 3 verifikator dari pool
3. Masing-masing commit vote (hash)
4. Semua commit → reveal vote
5. 2-of-3 decide → duit cair atau balik
6. Fee dispute → 60% verifikator, 25% platform, 15% treasury
```

---

## 5. Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  public_key VARCHAR(56) PRIMARY KEY,
  display_name VARCHAR(50),
  avatar_url TEXT,
  reputation_score INT DEFAULT 0,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  is_verified_hider BOOLEAN DEFAULT FALSE,
  is_brand BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hunts
CREATE TABLE hunts (
  id SERIAL PRIMARY KEY,
  contract_id VARCHAR(56) UNIQUE,
  hider_pubkey VARCHAR(56) REFERENCES users(public_key),
  hunt_type VARCHAR(20), -- gps, quest, race, puzzle, photo
  clue TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  radius_meters INT DEFAULT 50,
  amount_stroops BIGINT,
  deadline TIMESTAMP,
  status VARCHAR(20), -- active, claimed, expired, disputed
  photo_cid TEXT, -- IPFS CID
  created_at TIMESTAMP DEFAULT NOW()
);

-- Claims
CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  hunt_id INT REFERENCES hunts(id),
  hunter_pubkey VARCHAR(56) REFERENCES users(public_key),
  photo_cid TEXT,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  status VARCHAR(20), -- pending, approved, rejected, disputed
  submitted_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Disputes
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  claim_id INT REFERENCES claims(id),
  reason TEXT,
  verifiers TEXT[], -- array of 3 public keys
  votes TEXT[], -- approve/reject
  status VARCHAR(20), -- voting, resolved, appealed
  resolution VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Verifiers
CREATE TABLE verifiers (
  public_key VARCHAR(56) PRIMARY KEY,
  stake BIGINT DEFAULT 0,
  disputes_handled INT DEFAULT 0,
  dispute_fee_earned BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Brands
CREATE TABLE brands (
  public_key VARCHAR(56) PRIMARY KEY REFERENCES users(public_key),
  company_name VARCHAR(100),
  subscription_tier VARCHAR(20), -- basic, pro, enterprise
  subscription_end TIMESTAMP,
  total_campaigns INT DEFAULT 0
);
```

---

## 6. Environment Variables

```env
# Network
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contracts
NEXT_PUBLIC_HUNT_FACTORY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_REPUTATION_CONTRACT=YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

# Storage
IPFS_GATEWAY=https://gateway.pinata.cloud
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx

# Map
NEXT_PUBLIC_MAPBOX_TOKEN=xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://user:pass@host:5432/postgres
```

---

## 7. Full Architecture (Scalable ke Level 7)

JELAJAH dibangun sebagai **full architecture dari Level 1**. Artinya:

- **Database schema** udah include tables untuk brand, verifier, dispute, appeal — dari awal
- **Smart contract** udah support: multi-step quest, multi-sig voting, commit-reveal, reputation
- **Frontend routing** udah siap untuk: brand dashboard, verifier panel, community feed
- **Lock mechanism:** Tiap level fitur di-lock, bukan di-build ulang

Ini berarti:
- ✅ Gak perlu refactor besar-besaran antar level
- ✅ Level 6-7 tinggal unlock + deploy mainnet
- ✅ Kode sama dari L1 sampe L7

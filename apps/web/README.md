# JELAJAH — Hidden. Hunted. Claimed.

> Real-world treasure hunt platform di **Stellar blockchain**. Siapa aja bisa bikin harta karun di lokasi fisik, orang lain cari, nemu, dan klaim hadiahnya — semuanya otomatis dan trustless.

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-000000?logo=stellar)](https://stellar.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📸 Screenshots

> Screenshots diambil menggunakan Freighter wallet di Stellar Testnet.

| Wallet Connected | Balance Displayed |
|---|---|
| ![Wallet Connected](./public/screenshots/wallet-connected.png) | ![Balance](./public/screenshots/balance.png) |

| Successful Transaction | Transaction Result |
|---|---|
| ![Transaction](./public/screenshots/transaction.png) | ![Result](./public/screenshots/transaction-result.png) |

---

## 🎯 Core Loop

```
CREATE → HIDE → HUNT → CLAIM → REPEAT
```

| Step | Actor | Detail |
|---|---|---|
| **CREATE** | Hider | Bikin hunt: pilih jenis, set clue, GPS lokasi, upload foto, set reward + deadline |
| **HIDE** | Smart Contract | Reward dikunci di Claimable Balance Stellar |
| **HUNT** | Hunter | Lihat map, baca clue, navigasi ke lokasi |
| **CLAIM** | Hunter | GPS verified → upload foto bukti → hider approve / auto cair 24 jam |

---

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 + React 19 + TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui + Lucide icons |
| **Blockchain** | Stellar (Soroban SDK 27.0.2, RPC + Horizon) |
| **Smart Contracts** | 5 Rust contracts (hunt-factory, hunt-instance, reputation, dispute, quest-chain) |
| **Database** | Supabase (PostgreSQL managed, 17 tables, realtime) |
| **Wallet** | Freighter API (Stellar Wallets Kit menyusul) |
| **Map** | Mapbox GL JS (CDN load, token opsional) |
| **Storage** | IPFS via Pinata (service siap, butuh API key) |

---

## 📦 Smart Contracts — Testnet

Semua contract udah di-**deploy ke Stellar Testnet**:

| Contract | Address | Explorer |
|---|---|---|
| **hunt-factory** | `CDJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3` | [🔗](https://stellar.expert/explorer/testnet/contract/CDJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3) |
| **reputation** | `CDBXC2HQPL6EV7NSQXGQZ6FIX52ZJCRSEGPG5BYZL7KMU2ATOYN32XS3` | [🔗](https://stellar.expert/explorer/testnet/contract/CDBXC2HQPL6EV7NSQXGQZ6FIX52ZJCRSEGPG5BYZL7KMU2ATOYN32XS3) |
| **dispute** | `CA2T25TDCILD2AUTBGLDASTTXTQCA7A5XVASWATDRJ7WS5FF3TKXTWWB` | [🔗](https://stellar.expert/explorer/testnet/contract/CA2T25TDCILD2AUTBGLDASTTXTQCA7A5XVASWATDRJ7WS5FF3TKXTWWB) |
| **quest-chain** | `CC67Y27UHKO752HXKKW2KX4JIK5QNFDFZT5CDCNZ4AT6MRE3BONVYVMJ` | [🔗](https://stellar.expert/explorer/testnet/contract/CC67Y27UHKO752HXKKW2KX4JIK5QNFDFZT5CDCNZ4AT6MRE3BONVYVMJ) |
| **hunt-instance** | WASM uploaded (factory deploy per hunt) | `8e292f95...` |

---

## 🗺️ Level Roadmap

| Level | Belt | Routes | Status |
|---|---|---|---|
| **L1** | White | Landing, Map, Profile, Wallet | ✅ Selesai |
| **L2** | Yellow | Create Hunt, Claim Hunt | ✅ Selesai |
| **L3** | Orange | Quest Chain, Verifier, Dispute, Settings | ⬜ |
| **L4** | Green | Brand Dashboard, Leaderboard | ⬜ |
| **L5** | Blue | Community Feed, Streaks, Badges | ⬜ |
| **L6** | Black | Mainnet Migration, Security Audit | ⬜ |
| **L7** | Master | API/SDK, Enterprise | ⬜ |

---

## 🚀 Cara Mulai

### Prerequisites

```bash
node >= 20
npm >= 10
Rust >= 1.84 (untuk contracts)
wasm32v1-none target (rustup target add wasm32v1-none)
```

### 1. Clone & Install

```bash
git clone https://github.com/Faiz-abdurrachman/jelajah.git
cd jelajah/apps/web
npm install
```

### 2. Setup Environment

Buat file `.env.local`:

```env
# Network (testnet)
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract addresses (lihat table di atas)
NEXT_PUBLIC_HUNT_FACTORY=<hunt-factory-address>
NEXT_PUBLIC_REPUTATION_CONTRACT=<reputation-address>
NEXT_PUBLIC_DISPUTE_CONTRACT=<dispute-address>
NEXT_PUBLIC_QUEST_CHAIN_CONTRACT=<quest-chain-address>
NEXT_PUBLIC_HUNT_INSTANCE_WASM_HASH=<wasm-hash>

# Level (feature gate)
NEXT_PUBLIC_CURRENT_LEVEL=2

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://vzohtezrdhselrommvcm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Install & Connect Freighter Wallet

1. Install [Freighter Wallet](https://freighter.app/) extension
2. Buka extension → Create wallet / Import existing
3. Settings → Network → **Testnet**
4. Fund via [Stellar Lab Friendbot](https://lab.stellar.org/account/create?network=testnet)

### 4. Run Development Server

```bash
cd apps/web
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 5. (Opsional) Build Smart Contracts

```bash
cd contracts
cargo build --target wasm32v1-none
```

---

## 📋 Commands Reference

```bash
# ── Frontend ──
cd apps/web && npm run dev          # Dev server (localhost:3000)
npx tsc --noEmit                    # TypeScript check
npx eslint . --max-warnings=0       # ESLint check
npx next build                      # Production build

# ── Contracts ──
cd contracts && cargo build --target wasm32v1-none  # Build all contracts
cargo test                          # Run contract tests (reputation)

# ── Deploy Contract ──
stellar contract deploy \
  --wasm contracts/target/wasm32v1-none/release/<contract>.wasm \
  --source <YOUR_SECRET_KEY> \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# ── Git ──
git add -A && git commit -m "feat: what was done"
git push origin main
```

---

## 🏗️ Project Structure

```
jelajah/
├── apps/web/                     # Next.js 16 Frontend
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── map/page.tsx          # Map view
│   │   ├── profile/page.tsx      # User profile
│   │   ├── wallet/page.tsx       # Wallet + balance
│   │   ├── hunt/
│   │   │   ├── create/page.tsx   # Create Hunt wizard
│   │   │   └── [id]/page.tsx     # Hunt detail + Claim
│   │   ├── quest/                # Quest Chain (L3)
│   │   ├── dispute/              # Dispute (L3)
│   │   ├── verify/               # Verifier (L3)
│   │   ├── brand/                # Brand Dashboard (L4)
│   │   ├── leaderboard/          # Leaderboard (L4)
│   │   └── community/            # Community (L5)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── hunt/                 # Create + Claim components
│   │   ├── map/                  # Mapbox map component
│   │   ├── wallet/               # Wallet provider
│   │   └── feature-gate/         # <RequireLevel> component
│   ├── config/                   # Constants, contracts, levels
│   ├── lib/
│   │   ├── stellar/              # Soroban SDK helpers
│   │   ├── ipfs/                 # Pinata upload service
│   │   └── supabase/             # Client + queries + types
│   └── types/                    # TypeScript type definitions
├── contracts/                    # Rust Soroban Contracts
│   ├── hunt-factory/             # Factory contract
│   ├── hunt-instance/            # Hunt lifecycle
│   ├── reputation/               # XP + badges
│   ├── dispute/                  # Multi-sig voting
│   └── quest-chain/              # Multi-step quests
└── docs/                         # Dokumentasi
```

---

## 🧪 Fitur per Level

### Level 1 — White Belt (✅)
| Fitur | Status |
|---|---|
| Landing page + Connect Wallet | ✅ |
| Map (read-only, Mapbox fallback) | ✅ |
| Profile (public key, balance, badges) | ✅ |
| Wallet (balance XLM/USDC, tx history) | ✅ |

### Level 2 — Yellow Belt (✅)
| Fitur | Status |
|---|---|
| Create Hunt (6-step wizard) | ✅ |
| Claim Hunt (GPS + foto + submit) | ✅ |
| Contracts deployed to testnet | ✅ |
| Multi-wallet | ⬜ |

### Level 3 — Orange Belt (⬜)
| Fitur | Status |
|---|---|
| Quest Chain (multi-step) | ⬜ |
| Verifier Dashboard | ⬜ |
| Dispute + Appeal | ⬜ |
| Settings (network, language) | ⬜ |

---

## 📄 Dokumentasi Lengkap

Semua dokumentasi ada di folder `docs/`:

| File | Description |
|---|---|
| [01-prd.md](docs/01-prd.md) | Product Requirement Document |
| [02-game-rules.md](docs/02-game-rules.md) | Aturan main game |
| [03-technical-architecture.md](docs/03-technical-architecture.md) | Arsitektur teknis |
| [04-smart-contract-spec.md](docs/04-smart-contract-spec.md) | Spesifikasi smart contract |
| [05-user-flow-screens.md](docs/05-user-flow-screens.md) | User flow & screens |
| [06-economics.md](docs/06-economics.md) | Ekonomi & revenue |
| [07-belt-submission-guide.md](docs/07-belt-submission-guide.md) | Panduan submission belt |
| [08-scale-architecture.md](docs/08-scale-architecture.md) | Arsitektur skalabilitas |

---

## 🤝 Kontribusi

Project ini dikerjakan oleh **Faiz Abdurrachman** untuk Stellar Belt Challenge.

---

## 📜 Lisensi

MIT

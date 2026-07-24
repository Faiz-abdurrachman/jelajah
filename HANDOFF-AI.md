# JELAJAH — Handoff untuk AI Berikutnya

> Prompt ini adalah **full context transfer**. Baca SEBELUM nulis 1 baris kode pun.

---

## 1. Siapa Lo

Lo adalah **Sisyp-Sr** — Senior Full-Stack + Blockchain Engineer. Lo kerja di project **JELAJAH** — real-world treasure hunt platform di Stellar blockchain.

**Bahasa:**
- Kode → English (variable, function, comment, commit messages)
- Dokumentasi → Indonesian
- Komunikasi dengan user → Indonesian

---

## 2. Project Context

| Item | Value |
|---|---|
| **Nama** | JELAJAH |
| **Tagline** | "Hidden. Hunted. Claimed." |
| **Stack** | Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui |
| **Blockchain** | Stellar (Soroban SDK 27.0.2, Soroban CLI 27.0.0) |
| **Database** | Supabase (17 tables, realtime subscriptions) |
| **Map** | Mapbox GL JS (CDN fallback, token optional) |
| **Wallet** | Freighter API (multi-wallet via Stellar Wallets Kit menyusul) |
| **Storage** | IPFS via Pinata (service siap, butuh API key) |
| **Smart Contract** | 5 Rust contracts — deployed to testnet |
| **Repo** | https://github.com/Faiz-abdurrachman/jelajah |

### Filosofi Utama

**BUILD ONCE FOR ALL LEVELS (L1-L7).** Bukan build step-by-step per level.

- Database schema FULL dari awal (17 tabel)
- Smart contract ditulis LENGKAP dari awal
- Frontend routing LENGKAP dari awal (feature gate, bukan 404)
- Yang beda antar level cuma FEATURE GATE + network (testnet → mainnet)

**TIDAK ADA REFACTOR.** Tidak ada build ulang. Tidak ada kerja 2 kali.

---

## 3. Arsitektur Full

```
jelajah/
├── apps/web/                     # Next.js 16 Frontend
│   ├── app/
│   │   ├── page.tsx              # Landing (L1) ✅
│   │   ├── map/page.tsx          # Map + HuntMap component (L1) ✅
│   │   ├── profile/page.tsx      # Profile + stats (L1) ✅
│   │   ├── wallet/page.tsx       # Wallet + tx history (L1) ✅
│   │   ├── hunt/
│   │   │   ├── [id]/page.tsx     # Hunt detail + Claim flow (L2) ✅
│   │   │   └── create/page.tsx   # Create Hunt wizard (L2) ✅
│   │   ├── quest/[id]/           # Quest chain (L3) ⬜
│   │   ├── dispute/[id]/         # Dispute flow (L3) ⬜
│   │   ├── verify/               # Verifier dashboard (L3) ⬜
│   │   ├── settings/             # Settings (L3) ⬜
│   │   ├── brand/                # Brand dashboard (L4) ⬜
│   │   │   ├── page.tsx          # Brand landing ⬜
│   │   │   └── dashboard/        # Brand dashboard ⬜
│   │   ├── leaderboard/          # Leaderboard (L4) ⬜
│   │   ├── community/            # Community feed (L5) ⬜
│   │   └── api/                  # Developer API (L7) ⬜
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (button, card, input, badge, sheet, dll)
│   │   ├── layout/navbar.tsx     # Navbar + mobile menu ✅
│   │   ├── map/hunt-map.tsx      # Mapbox CDN + fallback ✅
│   │   ├── hunt/
│   │   │   ├── create-hunt-wizard.tsx  # 6-step wizard ✅
│   │   │   └── claim-hunt-view.tsx     # GPS + foto + submit ✅
│   │   ├── wallet/wallet-provider.tsx  # Freighter + Horizon ✅
│   │   └── feature-gate/         # RequireLevel component ✅
│   ├── config/
│   │   ├── constants.ts          # Magic numbers, rules ✅
│   │   ├── contracts.ts          # Contract addresses ✅
│   │   ├── levels.ts             # Feature gate definitions ✅
│   │   └── hunt-types.ts         # HuntType enum + helpers ✅
│   ├── lib/
│   │   ├── stellar/soroban.ts    # Soroban SDK helpers ✅
│   │   ├── ipfs/pinata.ts        # IPFS Pinata upload ✅
│   │   ├── supabase/             # Client + queries + types ✅
│   │   └── utils.ts              # cn() helper ✅
│   └── types/index.ts            # TypeScript types ✅
├── contracts/                    # Rust Soroban Contracts
│   ├── Cargo.toml                # Workspace
│   ├── hunt-factory/             # Factory contract — deployed ✅
│   ├── hunt-instance/            # Full lifecycle — WASM uploaded ✅
│   ├── reputation/               # XP + level + badges — deployed ✅
│   ├── dispute/                  # Multi-sig voting — deployed ✅
│   └── quest-chain/              # Multi-step quests — deployed ✅
├── docs/                         # Dokumentasi lengkap (8 file)
├── .env.local                    # Environment (jangan commit! ada di .gitignore)
├── HANDOFF-AI.md                 # ← lo baca ini
├── JELAJAH-HANDOFF.md            # Handoff asli (placeholder — isi lama)
├── PLAN.md                       # Build plan
└── .omo/plans/fase-02-l3-infra-deploy.md  # Plan detail L3 + infra
```

---

## 4. Commit History (11 commits)

| Hash | Message | File |
|---|---|---|
| `ccb22f1` | `feat: init next.js project with tailwind, shadcn/ui, wallet provider and feature gate` | 50 files |
| `748153b` | `feat: complete phase 0 foundation - contracts, db schema, configs, ui` | 16 files |
| `f85de25` | `feat: migrate from local postgres to supabase with realtime support` | 7 files |
| `f65b536` | `feat: setup supabase project cariin with full jelajah schema (17 tables)` | 1 file |
| `99120c4` | `fix: audit fixes - panic_with_error, cascade render, unused deps, gitignore, error handling` | 16 files |
| `bcd8e10` | `feat: fix smart contracts for soroban sdk 27 and add contracts/target to gitignore` | 9 files |
| `d266ce7` | `feat: add create hunt wizard, claim hunt view, and mapbox map component` | 6 files |
| `eabb9d4` | `feat: add soroban sdk helpers, ipfs upload service, and wire create hunt to contract` | 3 files |
| `9347440` | `feat: wire claim hunt flow to contract and ipfs upload` | 1 file |
| `9b5a348` | `feat: deploy 5 smart contracts to testnet and update config` | 2 files |

---

## 5. Smart Contracts — Testnet (Deployed ✅)

| Contract | Address | Explorer |
|---|---|---|
| **hunt-factory** | `CDJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3` | [🔗](https://stellar.expert/explorer/testnet/contract/CDJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3) |
| **hunt-instance** | WASM uploaded (factory deploys instances) | hash: `8e292f95...` |
| **reputation** | `CDBXC2HQPL6EV7NSQXGQZ6FIX52ZJCRSEGPG5BYZL7KMU2ATOYN32XS3` | [🔗](https://stellar.expert/explorer/testnet/contract/CDBXC2HQPL6EV7NSQXGQZ6FIX52ZJCRSEGPG5BYZL7KMU2ATOYN32XS3) |
| **dispute** | `CA2T25TDCILD2AUTBGLDASTTXTQCA7A5XVASWATDRJ7WS5FF3TKXTWWB` | [🔗](https://stellar.expert/explorer/testnet/contract/CA2T25TDCILD2AUTBGLDASTTXTQCA7A5XVASWATDRJ7WS5FF3TKXTWWB) |
| **quest-chain** | `CC67Y27UHKO752HXKKW2KX4JIK5QNFDFZT5CDCNZ4AT6MRE3BONVYVMJ` | [🔗](https://stellar.expert/explorer/testnet/contract/CC67Y27UHKO752HXKKW2KX4JIK5QNFDFZT5CDCNZ4AT6MRE3BONVYVMJ) |

### Fungsi Contract

| Contract | Key Functions |
|---|---|
| **hunt-factory** | `create_hunt()`, `get_hunt_count()`, `get_hunt()` |
| **hunt-instance** | `__constructor()`, `submit_claim()`, `approve()`, `reject()`, `auto_release()`, `commit_vote()`, `reveal_vote()`, `resolve_dispute()`, `claim_expired()` |
| **reputation** | `add_xp()`, `get_level()`, `get_xp()`, `issue_badge()`, `has_badge()` |
| **dispute** | `create_dispute()`, `commit_vote()`, `reveal_vote()`, `resolve()`, `appeal()`, `stake()`, `slash()` |
| **quest-chain** | `set_quest_steps()`, `complete_step()`, `claim_quest()` |

---

## 6. Bug — Solved

### 6.1 Contract: `panic!("string")` (17x occurrence)
- **Issue**: Panic with string literal instead of `panic_with_error!` macro
- **Fix**: Replace all `panic!("...")` → `panic_with_error!(&env, Error::Variant)`
- **File**: All 5 contract `lib.rs` files

### 6.2 Contract: Magic number `24 * 60 * 60` hardcoded 2x
- **Issue**: Claim timer seconds hardcoded in 2 places
- **Fix**: Extract to `const CLAIM_TIMER_SECONDS: u64` at module level
- **File**: `contracts/hunt-instance/src/lib.rs`

### 6.3 Frontend: Cascade render wallet (`setState` in `useEffect`)
- **Issue**: WalletProvider triggered multiple re-renders because `setState` was in `useEffect` without proper guards
- **Fix**: Inline logic di effect + `useRef` guard for `prevPubKey`
- **File**: `apps/web/components/wallet/wallet-provider.tsx`

### 6.4 Contract: SDK 27 breaking changes (5 contracts affected)
- **Issue**: Contracts written for older Soroban SDK, v27.0.2 changed APIs
- **Fixes applied**:
  - Rename `Error` → `ContractError` (bentrok sama SDK built-in Error type)
  - Add `contracterror` attribute import for custom error enums
  - Add `xdr::ToXdr` trait import untuk hashing input
  - Replace `into_val(&env)` → `to_xdr(&env)` untuk sha256 input
  - Fix `Hash<32>` (dari `sha256`) conversion ke `BytesN<32>` via `.into()`
  - Fix `votes.len() - approve_count` (u32 vs usize) — cast `as u32`
  - Fix `Vec` iterator deref — soroban SDK 27 iter yield value bukan reference
  - Fix `sqrt()` gak available di no_std → ganti Babylonian integer sqrt
  - Change build target from `wasm32-unknown-unknown` to `wasm32v1-none`
  - Remove unused imports (`Map`, `Bytes`, `Vec`)
- **File**: All 5 `contracts/*/src/lib.rs`, `Cargo.toml`

### 6.5 Git: target/ tracked di git
- **Issue**: `contracts/target/` build artifacts ikut tercommit
- **Fix**: Tambah `target/` dan `contracts/target/` ke `.gitignore`, `git rm --cached`
- **File**: `.gitignore`

### 6.6 Git: Secrets in HANDOFF-AI.md
- **Issue**: Supabase token dan service role key ada di commit history
- **Fix**: `git filter-branch --index-filter` hapus `HANDOFF-AI.md` dari semua commit
- **File**: di-rewrite dari history

### 6.7 NPM: `@creit.tech/stellar-wallets-kit` 30MB+ gak dipake
- **Issue**: Dependency besar tapi gak pernah diimport
- **Fix**: `npm uninstall @creit.tech/stellar-wallets-kit`
- **File**: `apps/web/package.json`

### 6.8 Frontend: Error state gak ditampilkan ke user
- **Issue**: WalletProvider simpan error state tapi gak pernah auto-clear
- **Fix**: Auto-clear error setelah 5 detik via `useEffect` cleanup
- **File**: `apps/web/components/wallet/wallet-provider.tsx`

---

## 7. Critical Rules — Wajib Dibaca

### RULE 1: Clean Code (ZERO TOLERANCE)
- **NO `any`, NO `@ts-ignore`, NO `@ts-expect-error`** — ever
- **NO magic numbers** — semua di `config/constants.ts`
- **NO empty catch blocks** — `catch(e) {}` = pelanggaran
- **NO `as` type casting** kecuali `as const` atau `satisfies`
- Error handling wajib untuk semua async operation

### RULE 2: Checkpoint = Commit
Lo bakal DIGANTI AI LAIN kapan aja. Karena itu:
- **Commit SETIAP selesai 1 fitur logis** (bisa per-file atau per-small-feature)
- Commit message: `feat: what was done` (conventional commit)
- **JANGAN commit**: `wip`, `update`, `fix`, `asdf`
- **JANGAN `git push`** — cukup commit lokal (user yang push)
- Setiap commit harus lulus `npx tsc --noEmit` + `npx eslint . --max-warnings=0` + `npx next build`

### RULE 3: Feature Gate Pattern
Semua halaman dibangun dari awal. Yang gak sesuai level di-lock, bukan 404:
```tsx
import { RequireLevel } from "@/components/feature-gate";

export default function BrandPage() {
  return (
    <RequireLevel level={4}>
      {/* konten brand dashboard */}
    </RequireLevel>
  );
}
```

### RULE 4: Build Sekali untuk Semua Level
Jangan tanya "ini buat level berapa?" — semua kode ditulis untuk full architecture dari awal. Yang ngebedain cuma feature gate + network.

### RULE 5: Wallet Pattern
Gunakan `useWallet()` hook:
```tsx
const { isConnected, publicKey, balance, connect, disconnect } = useWallet();
```

### RULE 6: Contract Error Pattern
Gunakan `panic_with_error!()` + `#[contracterror]` BUKAN `panic!("string")`:
```rust
#[contracterror]
pub enum ContractError {
    NotAuthorized = 1,
}

// Usage:
panic_with_error!(&env, ContractError::NotAuthorized);
```

---

## 8. Level Feature Gate

| Level | Belt | Routes Unlocked |
|---|---|---|
| **L1** | White | `/`, `/map`, `/profile`, `/wallet` |
| **L2** | Yellow | `/hunt/[id]`, `/hunt/create` |
| **L3** | Orange | `/quest/[id]`, `/verify`, `/dispute/[id]`, `/settings` |
| **L4** | Green | `/brand/*`, `/leaderboard` |
| **L5** | Blue | `/community` |
| **L6** | Black | Mainnet migration |
| **L7** | Master | `/api/*` |

**Current level**: `L2` (NEXT_PUBLIC_CURRENT_LEVEL=2)

---

## 9. Routes & Pages Status

### L1 — White Belt (✅ Selesai)
| Route | Page | Status |
|---|---|---|
| `/` | Landing + Connect Wallet | ✅ |
| `/map` | Full-screen map (Mapbox CDN + fallback) | ✅ |
| `/profile` | Profile + public key + stats + badges | ✅ |
| `/wallet` | Wallet balance + tx history | ✅ |

### L2 — Yellow Belt (✅ Selesai)
| Route | Page | Status |
|---|---|---|
| `/hunt/create` | 6-step wizard (type → clue → GPS → reward → deadline → review/sign) | ✅ |
| `/hunt/[id]` | Hunt detail + GPS check + photo capture + claim submit | ✅ |

### L3 — Orange Belt (⬜ Belum)
| Route | Page | Status |
|---|---|---|
| `/quest/[id]` | Quest Chain (multi-step) | ⬜ |
| `/verify` | Verifier Dashboard | ⬜ |
| `/dispute/[id]` | Dispute Detail + Appeal | ⬜ |
| `/settings` | Network, Language, Currency | ⬜ |

### L4 — Green Belt (⬜ Belum)
| Route | Page | Status |
|---|---|---|
| `/brand/*` | Brand Dashboard | ⬜ |
| `/leaderboard` | Leaderboard | ⬜ |

### L5 — Blue Belt (⬜ Belum)
| Route | Page | Status |
|---|---|---|
| `/community` | Community Feed + Notifications | ⬜ |

### L7 — Master Belt (⬜ Belum)
| Route | Page | Status |
|---|---|---|
| `/api/*` | Developer API | ⬜ |

---

## 10. Build Status

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint . --max-warnings=0` | ✅ 0 errors, 0 warnings |
| `npx next build` | ✅ Compiled, 7 routes |
| `cargo build --target wasm32v1-none` | ✅ 5 contracts, 0 errors, warnings only |
| `git status` | ✅ Clean working tree |
| `grep -r "@ts-ignore" apps/web/ --include="*.ts" --include="*.tsx"` | ✅ 0 hits |
| `grep -r "as any" apps/web/ --include="*.ts" --include="*.tsx"` | ✅ 0 hits |

---

## 11. Database (Supabase — 17 Tables)

Semua tabel udah ada di project Supabase `jelajah` (ref: `vzohtezrdhselrommvcm`).

**Tables**: `users`, `hunts`, `claims`, `disputes`, `verifiers`, `appeals`, `brands`, `campaigns`, `campaign_hunts`, `referrals`, `leaderboard_snapshots`, `streaks`, `user_badges`, `notifications`, `community_activities`, `api_keys`, `audit_log`

MCP Supabase tools: bisa query langsung via `skill_mcp`.

---

## 12. Environment Variables (.env.local)

Ada di `.env.local` (jangan commit!):

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract addresses (deployed testnet)
NEXT_PUBLIC_HUNT_FACTORY=CDJLNOVGLXU4...
NEXT_PUBLIC_REPUTATION_CONTRACT=CDBXC2HQPL6E...
NEXT_PUBLIC_DISPUTE_CONTRACT=CA2T25TDCILD2...
NEXT_PUBLIC_QUEST_CHAIN_CONTRACT=CC67Y27UHKO75...
NEXT_PUBLIC_HUNT_INSTANCE_WASM_HASH=8e292f95...

NEXT_PUBLIC_CURRENT_LEVEL=2

NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## 13. Commands Reference

```bash
cd apps/web && npm run dev           # Development server
npx tsc --noEmit                     # Type check
npx eslint . --max-warnings=0        # Lint check
npx next build                       # Full build
cd contracts && cargo build --target wasm32v1-none  # Build contracts
cd contracts/reputation && cargo test  # Contract tests
git add -A && git commit -m "feat: what was done"  # Checkpoint
```

---

## 14. Next Steps (Dari Plan)

### Batch 2: Quest Chain UI (L3)
- `app/quest/[id]/page.tsx` + `components/quest/quest-progress.tsx`
- Multi-step: progres timeline, GPS per step, foto per step, final claim
- Wire ke contract `complete_step()`, `claim_quest()`

### Batch 3: Verifier + Dispute (L3)
- `app/verify/page.tsx` + `components/dispute/*`
- Dashboard stats, dispute list, commit-reveal voting, stake management
- `app/dispute/[id]/page.tsx` + detail + appeal form

### Batch 4: Settings + Brand (L3-L4)
- `app/settings/page.tsx` — network, language, currency
- `app/brand/*` — register, dashboard, campaign CRUD

### Batch 5: Leaderboard + Community (L4-L5)
- `app/leaderboard/page.tsx` — hunter + hider rankings
- `app/community/page.tsx` — activity feed, notifications

### Batch 6: Infrastructure
- GitHub Actions CI/CD
- Playwright E2E tests
- Mobile responsive audit
- README.md lengkap

---

## 15. Remote

```bash
git remote -v
origin  https://github.com/Faiz-abdurrachman/jelajah.git (fetch)
origin  https://github.com/Faiz-abdurrachman/jelajah.git (push)
```

Push setelah commit: `git push origin main`

---

Good luck, Sr. 🚀 Build JELAJAH, gak ada refactor, gak ada kerja 2 kali.

# JELAJAH — Handoff untuk AI Berikutnya (v2)

> **Full context transfer**. Baca SELURUH file ini sebelum nulis 1 baris kode.
> Ini hasil dari multiple AI session. Jangan ulangi kesalahan yang udah disolve.

---

## 1. Siapa Lo

Lo adalah **Senior Full-Stack + Blockchain Engineer** di project **JELAJAH** — real-world treasure hunt platform di Stellar blockchain.

**Bahasa:**
- Kode → English (variable, function, comment, commit)
- Dokumentasi → Indonesian
- Komunikasi user → Indonesian

---

## 2. Project Context

| Item | Value |
|---|---|
| **Nama** | JELAJAH |
| **Stack** | Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui |
| **Blockchain** | Stellar (Soroban SDK 27.0.2, Soroban CLI 27.0.0) |
| **Database** | Supabase (17 tables, realtime, project: `vzohtezrdhselrommvcm`) |
| **Map** | Mapbox (needs token) + Leaflet/OpenStreetMap fallback (no token) |
| **Wallet** | Freighter API v6 (Stellar Wallets Kit NOT installed) |
| **Storage** | IPFS via Pinata |
| **Smart Contract** | 5 Rust contracts deployed to **testnet** |
| **Repo** | https://github.com/Faiz-abdurrachman/jelajah |
| **Dev server** | `cd apps/web && npm run dev` → localhost:3000 |

---

## 3. Critical Rules — ZERO TOLERANCE

| Rule | Detail |
|---|---|
| **NO `any`** | Never. Ever. |
| **NO `@ts-ignore`** | Never. |
| **NO `@ts-expect-error`** | Never. |
| **NO magic numbers** | All in `config/constants.ts` |
| **NO empty catch** | `catch(e) {}` = violation |
| **NO `as` type cast** | Except `as const` or `satisfies` |
| **Commit per fitur** | Conventional commit: `feat:` / `fix:` / `test:` / `docs:` |
| **JANGAN `git push`** | Commit lokal aja, user yang push |
| **Check build sebelum commit** | `tsc --noEmit` + `eslint --max-warnings=0` + `next build` |
| **Feature gate** | `<RequireLevel level={N}>` — BUKAN 404 |
| **Never import `isConnected` from Freighter v6** | See Bug #9 below |
| **Comments: hanya yang necessary** | Algorithm explanation, workaround reason |

---

## 4. Build Verification Commands

```bash
cd apps/web
npx tsc --noEmit                     # TypeScript check
npx eslint . --max-warnings=0        # ESLint check
npx next build                       # Production build
npx playwright test --project=chromium  # E2E tests (10 tests)
```

---

## 5. Current Build Status

```
tsc --noEmit       ✅ 0 errors
eslint --max=0     ✅ 0 errors, 0 warnings
next build         ✅ 13 routes
@ts-ignore         ✅ 0 hits
as any             ✅ 0 hits
playwright         ✅ 10/10 passing
git status         ✅ Clean
```

---

## 6. Git Log (this session — 12 commits)

```
b7af886 test: fix e2e test selectors to match actual page content
eae2ed3 feat: add leaflet openstreetmap fallback when mapbox token is not set
893849e fix: skip freighter isConnected check, call requestAccess directly for v6 compatibility
981f4ec fix: wallet provider isConnected returns object not boolean in freighter v6
bc889a9 feat: wire quest chain contract helpers with mock fallback
c3eb673 feat: wire brand registration and fix dashboard structural bug
a116954 feat: wire verifier registration and stake contract call
7822981 feat: seed supabase test data, wire hunt detail to real query, make ClaimHuntView accept hunt prop
04f2ab0 fix: testnet completion - add missing supabase types, remove mock data, fix column mappings
9dda51a feat: add CI/CD pipeline, playwright e2e tests, and mobile responsive audit
2bbea0f fix: audit fixes - useEffect cleanup, dead code removal, RequireLevel consolidation, extract getTimeAgo
84b711a fix: critical vote hash bug - compute sha256(xdr(verifier,vote,salt)) instead of raw salt
```

---

## 7. 🐛 ALL BUGS SOLVED — Root Cause + Solution

### Bug #1: Contract `panic!("string")` (17x)
- **Root cause**: String literal instead of `panic_with_error!` macro
- **Fix**: Replace all `panic!("...")` → `panic_with_error!(&env, Error::Variant)`
- **Files**: All 5 contract `lib.rs` files

### Bug #2: Magic number `24 * 60 * 60` (2x)
- **Root cause**: Claim timer seconds hardcoded
- **Fix**: Extract to `const CLAIM_TIMER_SECONDS: u64`

### Bug #3: Wallet cascade render
- **Root cause**: `setState` in `useEffect` without proper guards
- **Fix**: `useRef` guard for `prevPubKey`

### Bug #4: Soroban SDK 27 breaking changes
- **Root cause**: Old SDK APIs (Error → ContractError, into_val → to_xdr, Hash<32> conversion, sqrt no_std)
- **Fix**: Multiple API updates across all contracts

### Bug #5: `contracts/target/` in git
- **Fix**: Add to `.gitignore`, `git rm --cached`

### Bug #6: Secrets in HANDOFF-AI.md history
- **Fix**: `git filter-branch` to remove from all commits

### Bug #7: `@creit.tech/stellar-wallets-kit` 30MB unused
- **Fix**: `npm uninstall`

### Bug #8: Error state not auto-cleared
- **Fix**: Auto-clear after 5s via `useEffect` cleanup

### Bug #9: 🔴 CRITICAL — Commit-Reveal Vote Hash (session ini)
- **Root cause**: `isConnected()` in Freighter v6 returns `{ isConnected: object }`, not `boolean`. JS passed raw salt as `vote_hash`, but contract computes `sha256(xdr_encode(verifier, vote, salt))`. Hash mismatch = `InvalidReveal` every time.
- **Fix**: 
  1. Skip `isConnected()` entirely — call `requestAccess()` directly
  2. Add `computeVoteHash()` using `xdr.ScVal.scvVec()` + Web Crypto `sha256`
  3. 32-byte salt (not 16-byte) for `BytesN<32>` compatibility
  ```typescript
  // computeVoteHash in lib/stellar/soroban.ts
  const vecScVal = xdr.ScVal.scvVec([verifierScVal, voteScVal, saltScVal]);
  const xdrBytes = vecScVal.toXDR();
  const xdrArrayBuf = xdrBytes.buffer.slice(...) as ArrayBuffer;
  const hashBuf = await crypto.subtle.digest("SHA-256", xdrArrayBuf);
  ```

### Bug #10: Freighter Wallet Connect not working (session ini)
- **Root cause**: `isConnected()` returns `{ isConnected: window.freighter }` (API object = always truthy). So `requestAccess()` was never triggered.
- **Fix**: Skip `isConnected()` call. Call `requestAccess()` directly, fallback to `getAddress()` if already authorized.
- **NEVER import `isConnected` from Freighter v6 again.**

### Bug #11: Mapbox token empty — map not showing (session ini)
- **Root cause**: `NEXT_PUBLIC_MAPBOX_TOKEN=` empty in `.env.local`
- **Fix**: Added Leaflet + OpenStreetMap fallback (free, no token). Component in `components/map/leaflet-fallback.tsx`, dynamically imported with `ssr: false`.

### Bug #12: `brandRowToData` inserted inside useEffect (session ini)
- **Root cause**: Edit placed function definition inside useEffect body, breaking the try/catch structure
- **Fix**: Rewrote entire file, moved function to module level

### Bug #13: Supabase types only 7/17 tables (session ini)
- **Root cause**: Missing 10 table type definitions
- **Fix**: Added all 17 tables to `lib/supabase/types.ts`

### Bug #14: Community activities wrong column names (session ini)
- **Root cause**: Component used `type`/`title`/`message` but schema has `activity_type`/`description`
- **Fix**: Updated mapping in `activity-feed.tsx` to use correct columns

---

## 8. Smart Contracts — Testnet

| Contract | Address |
|---|---|
| **hunt-factory** | `CDJLNOVGLXU4FLUWX7TLYER25UET5YNXPYI3TBNNSBWFDBZ5E6SLILF3` |
| **hunt-instance** | WASM uploaded (factory deploys instances) — hash: `8e292f95...` |
| **reputation** | `CDBXC2HQPL6EV7NSQXGQZ6FIX52ZJCRSEGPG5BYZL7KMU2ATOYN32XS3` |
| **dispute** | `CA2T25TDCILD2AUTBGLDASTTXTQCA7A5XVASWATDRJ7WS5FF3TKXTWWB` |
| **quest-chain** | `CC67Y27UHKO752HXKKW2KX4JIK5QNFDFZT5CDCNZ4AT6MRE3BONVYVMJ` |

---

## 9. Supabase — Seed Data

| Table | Count | Notes |
|---|---|---|
| users | 3 | Budi Hunter (2500xp), Sita Hider (1200xp), Veri Master (5000xp) |
| hunts | 3 | GPS Monas, Puzzle Bundaran HI, Quest Chain Jakarta |
| claims | 1 | Budi claims GPS hunt (pending) |
| disputes | 1 | Hider rejects claim (voting) |
| verifiers | 2 | Veri Master, Budi Hunter |
| brands | 1 | Sita Adventures (pro tier) |
| community_activities | 5 | Various activities for feed demo |

---

## 10. Routes & Status (13 routes)

### ✅ REAL DATA (Supabase)
| Route | Level | Status | Real Data? |
|---|---|---|---|
| `/` | L1 | ✅ | N/A (static) |
| `/map` | L1 | ✅ | Leaflet OSM + Supabase marker |
| `/profile` | L1 | ✅ | Supabase user |
| `/wallet` | L1 | ✅ | Horizon API real |
| `/hunt/[id]` | L2 | ✅ | Supabase hunt by ID |
| `/leaderboard` | L4 | ✅ | Supabase users ranked |
| `/community` | L5 | ✅ | Supabase activities + realtime |

### ⚠️ MOCK/FALLBACK
| Route | Level | Status | Issue |
|---|---|---|---|
| `/hunt/create` | L2 | ⚠️ | UI works, `createHuntTx` is **simulate only** (not real tx) |
| `/quest/[id]` | L3 | ⚠️ | Contract wired but `generateMockSteps()` fallback |
| `/verify` | L3 | ⚠️ | Apply verifier works (Supabase), vote panel works (UI+contract wired), but **never tested with real tx** |
| `/dispute/[id]` | L3 | ⚠️ | UI complete, contract wired, but **no real dispute flow tested** |
| `/settings` | L3 | ✅ | localStorage works |
| `/brand` | L4 | ✅ | Register works (Supabase) |
| `/brand/dashboard` | L4 | ⚠️ | Campaign create UI not persisted |

---

## 11. What Needs Real Flow Testing (NOT DONE)

| Flow | Status |
|---|---|
| Create Hunt → real tx → appear on map | ❌ simulate only |
| Claim Hunt → GPS → photo → submit tx | ❌ MOCK_HUNT |
| Hider approve/reject claim | ❌ No UI |
| Dispute → commit vote → reveal vote → resolve | ❌ Never tested |
| Stake via contract | ⚠️ Wired, not tested |
| Quest chain complete_step → claim_quest | ❌ Mock steps |
| Campaign create → persist to Supabase | ❌ UI only |

---

## 12. Architecture

```
jelajah/
├── apps/web/
│   ├── app/                          # 13 routes
│   │   ├── page.tsx                  # Landing
│   │   ├── map/page.tsx              # Map (Leaflet OSM fallback)
│   │   ├── profile/page.tsx          # Profile
│   │   ├── wallet/page.tsx           # Wallet + balance
│   │   ├── hunt/
│   │   │   ├── create/page.tsx       # Create wizard
│   │   │   └── [id]/page.tsx         # Hunt detail → ClaimHuntView
│   │   ├── quest/[id]/page.tsx       # Quest chain (mock steps)
│   │   ├── verify/page.tsx           # Verifier dashboard
│   │   ├── dispute/[id]/page.tsx     # Dispute detail
│   │   ├── settings/page.tsx         # Settings
│   │   ├── brand/page.tsx            # Brand landing
│   │   ├── brand/dashboard/page.tsx  # Brand dashboard
│   │   ├── leaderboard/page.tsx      # Leaderboard
│   │   └── community/page.tsx        # Community feed
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (button, card, input, badge, sheet, separator, dropdown-menu)
│   │   ├── layout/navbar.tsx         # Navbar with feature-gated links
│   │   ├── map/
│   │   │   ├── hunt-map.tsx          # Mapbox (token) + Leaflet fallback
│   │   │   └── leaflet-fallback.tsx  # OSM map (dynamic import, ssr:false)
│   │   ├── hunt/
│   │   │   ├── create-hunt-wizard.tsx # 6-step wizard (Type→Clue→GPS→Reward→Deadline→Review)
│   │   │   └── claim-hunt-view.tsx    # MOCK_HUNT fallback, accepts hunt prop
│   │   ├── quest/
│   │   │   ├── quest-progress.tsx     # Step timeline
│   │   │   └── quest-step-view.tsx    # Per-step GPS+photo
│   │   ├── dispute/
│   │   │   ├── dispute-list.tsx       # Dispute table
│   │   │   ├── dispute-result.tsx     # Vote results
│   │   │   ├── vote-panel.tsx         # Commit-reveal voting
│   │   │   ├── stake-manage.tsx       # Stake form (wired to contract)
│   │   │   ├── verifier-stats.tsx     # Stats cards
│   │   │   └── appeal-form.tsx        # Appeal form
│   │   ├── brand/
│   │   │   ├── brand-dashboard.tsx    # Brand stats
│   │   │   └── campaign-create.tsx    # Campaign wizard
│   │   ├── leaderboard/
│   │   │   └── leaderboard-table.tsx  # Ranked table
│   │   ├── community/
│   │   │   ├── activity-feed.tsx      # Realtime feed
│   │   │   └── notification-bell.tsx  # Notification dropdown
│   │   ├── wallet/
│   │   │   └── wallet-provider.tsx    # Freighter v6 (NO isConnected import!)
│   │   └── feature-gate/
│   │       └── require-level.tsx      # <RequireLevel level={N}>
│   ├── config/
│   │   ├── constants.ts               # All magical numbers
│   │   ├── contracts.ts               # Contract addresses
│   │   ├── levels.ts                  # Feature gate definitions
│   │   └── hunt-types.ts              # HuntType enum
│   ├── lib/
│   │   ├── stellar/soroban.ts         # Soroban SDK helpers (all tx functions)
│   │   ├── ipfs/pinata.ts             # IPFS upload
│   │   ├── supabase/
│   │   │   ├── client.ts              # All queries (getOrCreate, getHuntById, applyAsVerifier, registerBrand, etc.)
│   │   │   ├── types.ts               # 17/17 tables typed
│   │   │   └── schema.sql             # Full schema
│   │   ├── mapbox/                    # Mapbox helpers (not used when no token)
│   │   └── utils.ts                   # cn(), getTimeAgo()
│   ├── types/index.ts                 # Shared TypeScript types
│   ├── e2e/                           # Playwright tests (10 passing)
│   │   ├── landing.spec.ts
│   │   ├── map.spec.ts
│   │   └── hunt-flow.spec.ts
│   └── playwright.config.ts
├── contracts/                         # 5 Rust Soroban contracts
│   ├── hunt-factory/
│   ├── hunt-instance/
│   ├── reputation/
│   ├── dispute/
│   └── quest-chain/
├── .github/workflows/ci.yml           # CI/CD: tsc → eslint → build
├── docs/                              # Dokumentasi (8 files)
└── .env.local                         # Environment variables
```

---

## 13. Key Files to Read First

| Priority | File | Why |
|---|---|---|
| 1 | `lib/stellar/soroban.ts` | All contract helpers (createHuntTx, submitClaimTx, completeStepTx, commitVoteTx, revealVoteTx, stakeTx, computeVoteHash, etc.) |
| 2 | `lib/supabase/client.ts` | All Supabase queries |
| 3 | `components/wallet/wallet-provider.tsx` | Freighter v6 connection (NO isConnected!) |
| 4 | `config/constants.ts` | All rules, fees, thresholds |
| 5 | `config/levels.ts` | Feature gate definitions |
| 6 | `types/index.ts` | Shared types |
| 7 | `components/map/hunt-map.tsx` | Map component (Mapbox + Leaflet fallback) |
| 8 | `components/map/leaflet-fallback.tsx` | OSM fallback (ssr:false, dynamic import) |

---

## 14. Soroban Contract Helpers Available

```typescript
// lib/stellar/soroban.ts exports:
createHuntTx(pubKey, amountStroops, gpsLat, gpsLng, radius, deadlineUnix, clueHashHex, huntType) → TxResult
submitClaimTx(pubKey, instanceAddr, photoCidHex, lat, lng) → TxResult
completeStepTx(pubKey, questIdHex, step, photoCidHex) → TxResult
claimQuestTx(pubKey, questIdHex) → TxResult
commitVoteTx(pubKey, disputeIdHex, voteHashHex) → TxResult
revealVoteTx(pubKey, disputeIdHex, vote, saltHex) → TxResult
resolveDisputeTx(pubKey, disputeIdHex) → TxResult
appealTx(pubKey, disputeIdHex) → TxResult
stakeTx(pubKey, amount) → TxResult
computeVoteHash(pubKey, vote, saltHex) → Promise<string>  // MUST call before commit vote
getQuestStepsTx(pubKey, questIdHex) → TxResult
getCurrentStepTx(pubKey, questIdHex) → TxResult

// Converters:
toScAddress, toScI128, toScI64, toScU32, toScU64, toScBytesN32, toScBool, fromScVal
```

---

## 15. Feature Gate Levels

| Level | Belt | Routes |
|---|---|---|
| **L1** | White | `/`, `/map`, `/profile`, `/wallet` |
| **L2** | Yellow | `/hunt/[id]`, `/hunt/create` |
| **L3** | Orange | `/quest/[id]`, `/verify`, `/dispute/[id]`, `/settings` |
| **L4** | Green | `/brand/*`, `/leaderboard` |
| **L5** | Blue | `/community` |
| **L6** | Black | Mainnet migration |
| **L7** | Master | `/api/*` |

Current: `NEXT_PUBLIC_CURRENT_LEVEL=2` in `.env.local`

---

## 16. Next Plan (Belum Dikerjakan)

### Prioritas: Real Flow End-to-End
1. **ClaimHuntView**: Ganti MOCK_HUNT → data dari Supabase + real GPS + contract submit tx
2. **Hider approve/reject**: Bikin UI untuk approve/reject claim
3. **Create hunt real tx**: `createHuntTx` dari simulate → send real tx + track hash
4. **Dispute flow test**: End-to-end dari claim → reject → dispute → commit vote → reveal → resolve
5. **Quest chain**: Hapus `generateMockSteps`, wire `get_steps()` + `get_current_step()` dari contract
6. **Campaign persist**: Brand campaign create → insert ke Supabase
7. **Seed more data**: Lebih banyak hunt, claim, dispute untuk testing

### Mainnet (L6)
- Deploy contracts ke mainnet
- Update semua address di `config/contracts.ts`
- Set `NEXT_PUBLIC_CURRENT_LEVEL=6`
- Security audit
- Anchor integration

---

## 17. Wallet Pattern

```tsx
const { isConnected, publicKey, balance, connect, disconnect } = useWallet();
```

**CRITICAL**: JANGAN import `isConnected` dari `@stellar/freighter-api`. Gunakan `requestAccess()` + `getAddress()` dari hook. Lihat `wallet-provider.tsx`.

---

## 18. Supabase Query Pattern

```tsx
import { getActiveHunts, getHuntById, applyAsVerifier, registerBrand } from "@/lib/supabase/client";

// Read
const hunts = await getActiveHunts();
const hunt = await getHuntById(1);

// Write
await applyAsVerifier(publicKey);
await registerBrand(publicKey, "Company Name");
```

---

Good luck bro. Build JELAJAH, gak ada refactor, gak ada kerja 2 kali. 🚀

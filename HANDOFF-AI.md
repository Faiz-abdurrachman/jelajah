# JELAJAH — Handoff untuk AI Berikutnya (v3)

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
| **Comments: hanya yang necessary** | Algorithm explanation, workaround reason, complex pipeline |

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
next build         ✅ 14 routes
@ts-ignore         ✅ 0 hits
as any             ✅ 0 hits
playwright         ✅ 10/10 passing (8.7s)
git status         ✅ Clean
```

---

## 6. Git Log (session sebelumnya)

```
0162cfc docs: add mobile responsive screenshots, e2e test results, and CI/CD section to README
91e3c02 docs: add screenshots and contract transaction hash to README for submission checklist
1f523bc docs: rewrite handoff with full session context, bug history, solutions, checkpoints, and next plan
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

### Git Log (SESSION INI — 7 commits)

```
db965de fix: audit — extract HuntInfoCard to page level so hider also sees hunt details
cc6e6ae feat: seed additional test data — 5 hunts, 3 claims, 2 disputes, 3 activities
b9885dc fix: remove generateMockSteps() — wire quest chain to real contract call
3e4c3f3 feat: wire campaign create to Supabase — persist via createCampaign()
6f6fac7 feat: wire create hunt real tx — signAndSubmit + insertHunt persist
5a6b720 feat: add hider approve/reject UI for pending claims
04daa87 feat: wire claim hunt real flow — prepareContractTx + Freighter signAndSubmit + Supabase persist
```

---

## 7. 🐛 ALL BUGS SOLVED — Root Cause + Solution

### Bugs From Previous Sessions

### Bug #1: Contract `panic!("string")` (17x)
- **Root cause**: String literal instead of `panic_with_error!` macro
- **Fix**: Replace all `panic!("...")` → `panic_with_error!(&env, Error::Variant)`
- **Files**: All 5 contract `lib.rs` files

### Bug #2: Magic number `24 * 60 * 60` (2x)
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

### Bug #9: 🔴 CRITICAL — Commit-Reveal Vote Hash
- **Root cause**: `isConnected()` in Freighter v6 returns `{ isConnected: object }`, not `boolean`. JS passed raw salt as `vote_hash`, but contract computes `sha256(xdr_encode(verifier, vote, salt))`. Hash mismatch = `InvalidReveal` every time.
- **Fix**: 
  1. Skip `isConnected()` entirely — call `requestAccess()` directly
  2. Add `computeVoteHash()` using `xdr.ScVal.scvVec()` + Web Crypto `sha256`
  3. 32-byte salt (not 16-byte) for `BytesN<32>` compatibility

### Bug #10: Freighter Wallet Connect not working
- **Root cause**: `isConnected()` returns `{ isConnected: window.freighter }` (API object = always truthy). So `requestAccess()` was never triggered.
- **Fix**: Skip `isConnected()` call. Call `requestAccess()` directly, fallback to `getAddress()` if already authorized.
- **NEVER import `isConnected` from Freighter v6 again.**

### Bug #11: Mapbox token empty — map not showing
- **Fix**: Added Leaflet + OpenStreetMap fallback (free, no token). Component in `components/map/leaflet-fallback.tsx`, dynamically imported with `ssr: false`.

### Bug #12: `brandRowToData` inserted inside useEffect
- **Fix**: Rewrote entire file, moved function to module level

### Bug #13: Supabase types only 7/17 tables
- **Fix**: Added all 17 tables to `lib/supabase/types.ts`

### Bug #14: Community activities wrong column names
- **Fix**: Updated mapping in `activity-feed.tsx` to use correct columns

### Bugs From Session Ini

### Bug #15: 🔴 `prepareContractTx` — `TransactionBuilder.toXDR()` doesn't exist
- **Root cause**: `rpc.assembleTransaction()` returns `TransactionBuilder`, not `Transaction`. Cannot call `.toXDR()` directly.
- **Fix**: `assembled.build().toEnvelope().toXDR("base64")` — build first, then get envelope XDR.

### Bug #16: 🔴 Freighter `signTransaction` — wrong option key
- **Root cause**: Used `accountToSign` but Freighter v6 expects `address`.
- **Fix**: `signTransaction(xdr, { networkPassphrase, address: publicKey })`

### Bug #17: 🔴 Contract ID seed data — varchar(56) too long
- **Root cause**: Fake contract IDs exceeded 56 character limit or duplicated existing keys.
- **Fix**: Used unique 56-char IDs with consistent prefix, inserted one at a time.

### Bug #18: 🔴 Audit — Hider gak lihat info hunt
- **Root cause**: `hunt/[id]/page.tsx` conditionally showed HiderApproveView XOR ClaimHuntView. Hider saw no hunt info (clue, reward, GPS).
- **Fix**: Extracted `HuntInfoCard` to page level, shown for both hider and hunter. ClaimHuntView no longer duplicates the header.

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
| hunts | 8 | GPS Monas, Puzzle HI, Quest Jakarta + 5 new (jembatan, cipher, taman, quest 3-step, photo jumping) |
| claims | 4 | 3 pending, 1 approved |
| disputes | 3 | 2 voting, 1 resolved |
| verifiers | 2 | Veri Master, Budi Hunter |
| brands | 1 | Sita Adventures (pro tier) |
| community_activities | 8 | Various activities for feed demo |

Seed SQL: `apps/web/lib/supabase/seed.sql`

---

## 10. Routes & Status (14 routes)

### ✅ REAL DATA + REAL TX FLOW
| Route | Level | Status | Details |
|---|---|---|---|
| `/` | L1 | ✅ | Static landing |
| `/map` | L1 | ✅ | Leaflet OSM + Supabase markers |
| `/profile` | L1 | ✅ | Supabase user |
| `/wallet` | L1 | ✅ | Horizon API real |
| `/hunt/[id]` | L2 | ✅ | Supabase hunt + ClaimHuntView (real tx via signAndSubmit) + HiderApproveView (approve/reject) |
| `/hunt/create` | L2 | ✅ | 7-phase flow: IPFS → prepareContractTx → signAndSubmit → insertHunt |
| `/leaderboard` | L4 | ✅ | Supabase users ranked |
| `/community` | L5 | ✅ | Supabase activities + realtime |
| `/brand` | L4 | ✅ | Register + dashboard |

### ⚠️ UI WORKS, TX NEEDS CONTRACT DATA
| Route | Level | Status | Issue |
|---|---|---|---|
| `/quest/[id]` | L3 | ⚠️ | Contract wired, `generateMockSteps()` removed. Shows "belum tersedia on-chain" — needs contract to have real step data |
| `/verify` | L3 | ⚠️ | Apply verifier works (Supabase). Vote panel commit-reveal wired via prepareContractTx. **Never tested with real sign flow** |
| `/dispute/[id]` | L3 | ⚠️ | UI complete, contract wired. **Never tested with real sign flow** |
| `/settings` | L3 | ✅ | localStorage |
| `/brand/dashboard` | L4 | ✅ | Campaign create persists to Supabase via createCampaign() |

---

## 11. What DONE This Session (Real Flow End-to-End)

| Flow | Status |
|---|---|
| Create Hunt → prepare tx → Freighter sign → submit → Supabase persist | ✅ Done |
| Claim Hunt → GPS → photo upload (IPFS) → prepare tx → Freighter sign → submit → Supabase persist | ✅ Done |
| Hider approve/reject claim → Supabase updateClaimStatus | ✅ Done |
| Campaign create → Supabase createCampaign | ✅ Done |
| Quest chain — remove generateMockSteps, wire contract call | ✅ Done |
| Seed data: 8 hunts, 4 claims, 3 disputes, 8 activities | ✅ Done |
| Hunt info card visible for both hider and hunter | ✅ Fixed (audit) |

### What NOT DONE — Needs Real Wallet + Testnet

| Flow | Status |
|---|---|
| Dispute → commit vote → reveal vote → resolve | ⚠️ Wired, not tested with real sign |
| Stake via contract | ⚠️ Wired, not tested with real sign |
| Quest chain complete_step → claim_quest | ⚠️ Wired, contract needs step data |
| getQuestStepsTx / getCurrentStepTx — decode result from contract | ❌ Returns "Sim OK" — contract needs real data |
| Mainnet migration (L6) | ❌ Not started |

---

## 12. Architecture

```
jelajah/
├── apps/web/
│   ├── app/                          # 14 routes
│   │   ├── page.tsx                  # Landing
│   │   ├── map/page.tsx              # Map (Leaflet OSM fallback)
│   │   ├── profile/page.tsx          # Profile
│   │   ├── wallet/page.tsx           # Wallet + balance
│   │   ├── hunt/
│   │   │   ├── create/page.tsx       # Create wizard (7-phase real tx)
│   │   │   └── [id]/page.tsx         # Hunt detail → HuntInfoCard + ClaimHuntView/HiderApproveView
│   │   ├── quest/[id]/page.tsx       # Quest chain (contract wired, no mock)
│   │   ├── verify/page.tsx           # Verifier dashboard
│   │   ├── dispute/[id]/page.tsx     # Dispute detail
│   │   ├── settings/page.tsx         # Settings
│   │   ├── brand/page.tsx            # Brand landing
│   │   ├── brand/dashboard/page.tsx  # Brand dashboard
│   │   ├── leaderboard/page.tsx      # Leaderboard
│   │   └── community/page.tsx        # Community feed
│   ├── components/
│   │   ├── ui/                       # shadcn/ui
│   │   ├── layout/navbar.tsx         # Navbar with feature-gated links
│   │   ├── map/
│   │   │   ├── hunt-map.tsx          # Mapbox + Leaflet fallback
│   │   │   └── leaflet-fallback.tsx  # OSM map (ssr:false)
│   │   ├── hunt/
│   │   │   ├── create-hunt-wizard.tsx # 6-step → 7-phase real tx
│   │   │   ├── claim-hunt-view.tsx    # GPS + photo + 4-phase tx
│   │   │   └── hider-approve-view.tsx # NEW: approve/reject claims
│   │   ├── quest/
│   │   │   ├── quest-progress.tsx     # Step timeline
│   │   │   └── quest-step-view.tsx    # Per-step GPS+photo
│   │   ├── dispute/
│   │   │   ├── dispute-list.tsx, dispute-result.tsx
│   │   │   ├── vote-panel.tsx         # Commit-reveal (wired to prepareContractTx)
│   │   │   ├── stake-manage.tsx       # Stake form (wired)
│   │   │   ├── verifier-stats.tsx
│   │   │   └── appeal-form.tsx
│   │   ├── brand/
│   │   │   ├── brand-dashboard.tsx
│   │   │   └── campaign-create.tsx    # Persists to Supabase
│   │   ├── leaderboard/
│   │   │   └── leaderboard-table.tsx
│   │   ├── community/
│   │   │   ├── activity-feed.tsx
│   │   │   └── notification-bell.tsx
│   │   ├── wallet/
│   │   │   └── wallet-provider.tsx    # Freighter v6 + signAndSubmit
│   │   └── feature-gate/
│   │       └── require-level.tsx
│   ├── config/
│   │   ├── constants.ts               # All magic numbers
│   │   ├── contracts.ts               # Contract addresses
│   │   ├── levels.ts                  # Feature gate definitions
│   │   └── hunt-types.ts              # HuntType enum
│   ├── lib/
│   │   ├── stellar/soroban.ts         # prepareContractTx + signAndSubmit + all contract helpers
│   │   ├── ipfs/pinata.ts             # IPFS upload
│   │   ├── supabase/
│   │   │   ├── client.ts              # All queries + write helpers (insertHunt, insertClaim, etc.)
│   │   │   ├── types.ts               # 17/17 tables typed
│   │   │   ├── schema.sql             # Full schema
│   │   │   └── seed.sql               # NEW: reproducible seed data
│   │   └── utils.ts                   # cn(), getTimeAgo()
│   ├── types/index.ts                 # Shared TypeScript types
│   ├── e2e/                           # Playwright tests (10 passing)
│   └── playwright.config.ts
├── contracts/                         # 5 Rust Soroban contracts
├── .github/workflows/ci.yml           # CI/CD: tsc → eslint → build
├── docs/                              # Dokumentasi (8 files)
└── .env.local                         # Environment variables
```

---

## 13. Key Files to Read First

| Priority | File | Why |
|---|---|---|
| 1 | `lib/stellar/soroban.ts` | `prepareContractTx` → build/simulate/assemble XDR. `submitSignedTx` for RPC. All mutation helpers use prepareContractTx. Read-only helpers (getQuestSteps, getCurrentStep) still use simulateTx. |
| 2 | `lib/supabase/client.ts` | All Supabase queries + write helpers: insertHunt, insertClaim, updateClaimStatus, createCampaign, getPendingClaims, getClaimsByHunt |
| 3 | `components/wallet/wallet-provider.tsx` | Freighter v6 + `signAndSubmit(xdr)` — sign via Freighter → submit to RPC |
| 4 | `config/constants.ts` | All rules, fees, thresholds |
| 5 | `config/contracts.ts` | Contract addresses (from .env.local) |
| 6 | `types/index.ts` | Shared types |
| 7 | `components/hunt/claim-hunt-view.tsx` | 4-phase flow: IPFS → prepareContractTx → signAndSubmit → insertClaim |
| 8 | `components/hunt/hider-approve-view.tsx` | NEW: approve/reject pending claims |
| 9 | `app/hunt/[id]/page.tsx` | HuntInfoCard for both hider + hunter, conditional HiderApproveView or ClaimHuntView |

---

## 14. Soroban Contract Helpers (UPDATED)

```typescript
// lib/stellar/soroban.ts exports:

// Core
prepareContractTx(pubKey, contract, method, args) → TxResult   // build → simulate → assemble → return XDR
submitSignedTx(signedXdr) → TxResult                           // submit signed XDR to RPC
simulateTx(pubKey, contract, method, args) → SimulationResult  // simulate only (for read-only calls)
pollTx(txHash, maxAttempts?) → TxResult                        // poll for tx confirmation

// Mutation (all use prepareContractTx — return XDR)
createHuntTx(pubKey, amountStroops, gpsLat, gpsLng, radius, deadlineUnix, clueHashHex, huntType) → TxResult
submitClaimTx(pubKey, instanceAddr, photoCidHex, lat, lng) → TxResult
completeStepTx(pubKey, questIdHex, step, photoCidHex) → TxResult
claimQuestTx(pubKey, questIdHex) → TxResult
commitVoteTx(pubKey, disputeIdHex, voteHashHex) → TxResult
revealVoteTx(pubKey, disputeIdHex, vote, saltHex) → TxResult
resolveDisputeTx(pubKey, disputeIdHex) → TxResult
appealTx(pubKey, disputeIdHex) → TxResult
stakeTx(pubKey, amount) → TxResult

// Read-only (still use simulateTx)
getQuestStepsTx(pubKey, questIdHex) → TxResult       // ⚠️ returns "Sim OK" — needs contract data
getCurrentStepTx(pubKey, questIdHex) → TxResult       // ⚠️ returns "Sim OK" — needs contract data

// Voting
computeVoteHash(pubKey, vote, saltHex) → Promise<string>  // MUST call before commit vote

// Converters
toScAddress, toScI128, toScI64, toScU32, toScU64, toScBytesN32, toScBool, fromScVal

// TxResult interface
interface TxResult {
  hash: string;       // tx hash after submit
  success: boolean;
  result?: string;    // human-readable
  error?: string;     // error message
  xdr?: string;       // assembled XDR for Freighter signing (from prepareContractTx)
}
```

### TX Flow Pattern (MUST FOLLOW)

```typescript
// 1. Prepare contract call → get XDR
const prep = await createHuntTx(pubKey, ...args);
if (!prep.success || !prep.xdr) { /* handle error */ }

// 2. Sign via Freighter → submit to network → get hash
const { signAndSubmit } = useWallet();
const submit = await signAndSubmit(prep.xdr);
if (!submit.success) { /* handle error */ }

// 3. Persist to Supabase (non-blocking)
try { await insertHunt({ ...params, contractId: submit.hash }); } catch { /* on-chain already */ }

// 4. Poll for confirmation (optional, fire-and-forget)
void pollTx(submit.hash);
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

## 16. Next Plan — Prioritas

### SESSION INI SUDAH KELAR:
- ✅ ClaimHuntView → real GPS + IPFS + prepareContractTx + signAndSubmit + insertClaim
- ✅ Hider approve/reject → HiderApproveView + updateClaimStatus
- ✅ Create hunt real tx → prepareContractTx + signAndSubmit + insertHunt
- ✅ Campaign persist → createCampaign ke Supabase
- ✅ Quest chain remove mock → generateMockSteps deleted, contract wired, empty-state message
- ✅ Seed data → 8 hunts, 4 claims, 3 disputes, 8 activities
- ✅ Audit — HuntInfoCard extracted, hider sees hunt info

### YANG BELUM — Next AI Session:

**Prioritas 1: Real Sign Flow Testing**
1. **Test dispute flow end-to-end**: commit vote → reveal vote → resolve via Freighter (prepareContractTx + signAndSubmit sudah wired, tinggal test dengan wallet asli)
2. **Test stake flow**: stake via contract dengan Freighter signing
3. **Test create hunt full flow**: dari wizard sampai muncul di map

**Prioritas 2: Quest Chain Data**
4. **Seed quest data ke contract**: Panggil `init_quest` atau method yang sesuai di quest-chain contract supaya `get_steps()` return data asli, bukan kosong
5. **Decode getQuestStepsTx result**: Dari "Sim OK" → decode `ScVal` response jadi `QuestStep[]`

**Prioritas 3: UX Polish**
6. **pollTx update UI**: Setelah tx confirmed on-chain, update status di UI (bukan cuma fire-and-forget)
7. **Hunter tracking**: Hunter bisa lihat history claim mereka (dari Supabase getUserClaims)

**Prioritas 4: Mainnet (L6)**
8. Deploy contracts ke mainnet
9. Update semua address di `config/contracts.ts` dan `.env.local`
10. Set `NEXT_PUBLIC_CURRENT_LEVEL=6`
11. Security audit (terutama commit-reveal flow)

### Submission Evidence (DONE)
- ✅ 8 desktop screenshots in `public/screenshots/`
- ✅ 6 mobile screenshots (375px) in `public/screenshots/mobile-*.png`
- ✅ E2E tests: 10/10 passing (8.7s)
- ✅ Transaction hash: `0d450bbf2a2a13896866c15215f894eb345d017e467d333ee98025cbf1d566b2`
- ✅ CI/CD: `.github/workflows/ci.yml` (tsc → eslint → build)
- ✅ Updated README with all screenshots, test results, CI/CD section

### What User Must Do (can't do from terminal)
1. **Push**: `git push origin main`
2. **CI/CD screenshot**: After push, screenshot GitHub Actions workflow passing
3. **Deploy Vercel**: Import repo, set env vars, deploy → get live URL
4. **Demo video**: Record 1-2 min with Loom/OBS showing all flows

---

## 17. Wallet Pattern (UPDATED)

```tsx
const { isConnected, publicKey, balance, connect, disconnect, signAndSubmit } = useWallet();

// Connect
await connect();

// Sign + submit contract tx
const result = await signAndSubmit(xdr);  // { hash, success, error }
```

**CRITICAL**: 
- JANGAN import `isConnected` dari `@stellar/freighter-api`. Gunakan `requestAccess()` + `getAddress()` dari hook.
- `signAndSubmit` internally calls `signTransaction(xdr, { networkPassphrase, address })` lalu `submitSignedTx`.
- Semua mutation helpers di `soroban.ts` return `TxResult` dengan field `xdr` — ini yang dipassing ke `signAndSubmit`.

---

## 18. Supabase Query Pattern (UPDATED)

```tsx
import { getActiveHunts, getHuntById, applyAsVerifier, registerBrand } from "@/lib/supabase/client";
import { insertHunt, insertClaim, updateClaimStatus, createCampaign, getPendingClaims } from "@/lib/supabase/client";

// Read
const hunts = await getActiveHunts();
const hunt = await getHuntById(1);
const pending = await getPendingClaims(huntId);

// Write
await applyAsVerifier(publicKey);
await registerBrand(publicKey, "Company Name");
await insertHunt({ contractId, hiderPubkey, huntType, clue, latitude, longitude, radiusMeters, amountStroops, deadline });
await insertClaim({ huntId, hunterPubkey, photoCid, gpsLat, gpsLng, txHash });
await updateClaimStatus(claimId, "approved");
await createCampaign({ brandPubkey, name, description, budget, startDate, endDate });
```

---

## 19. Common Pitfalls — JANGAN DIULANGI

| Pitfall | Detail |
|---|---|
| `rpc.assembleTransaction(tx, sim)` | Returns `TransactionBuilder`, NOT `Transaction`. Must call `.build()` first before `.toEnvelope().toXDR("base64")` |
| `signTransaction(xdr, { accountToSign })` | Freighter v6 uses `address`, NOT `accountToSign` |
| Contract ID varchar(56) | Must be EXACTLY 56 chars or less |
| `isConnected` from Freighter | Returns object `{ isConnected: window.freighter }`, always truthy. NEVER import. Use `getAddress()` instead |
| MOCK data | ClaimHuntView no longer has MOCK_HUNT. Hunt prop is required. Page must provide it via Supabase |
| Duplicate hunt info | HuntInfoCard lives in page. ClaimHuntView does NOT render its own header anymore |
| `as` cast in TypeScript | Only `as const` or `satisfies` allowed. Map Supabase rows via explicit mapping, not `as` |

---

Good luck bro. Build JELAJAH, gak ada refactor, gak ada kerja 2 kali. Semua konteks ada di sini. 🚀

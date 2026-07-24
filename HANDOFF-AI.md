# JELAJAH — Handoff untuk AI Berikutnya (v4)

> **Full context transfer**. Baca SELURUH file ini sebelum nulis 1 baris kode.
> Ini hasil dari multiple AI session (4 sessions). Jangan ulangi kesalahan yang udah disolve.

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
| **Dev server** | `cd apps/web && npm run dev` → **localhost:3001** (PORT DIGANTI — was 3000) |
| **E2E server** | localhost:3001 (playwright config updated) |

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
| **NO non-null assertion `!`** | Use guard pattern: `const pk = publicKey; if (!pk) return;` |
| **Commit per fitur** | Conventional commit: `feat:` / `fix:` / `test:` / `docs:` / `chore:` |
| **JANGAN `git push`** | Commit lokal aja, user yang push |
| **Check build sebelum commit** | `tsc --noEmit` + `eslint --max-warnings=0` + `next build` + Playwright |
| **Feature gate** | `<RequireLevel level={N}>` — BUKAN 404 |
| **Never import `isConnected` from Freighter v6** | See Bug #9 below |
| **Comments: hanya yang necessary** | Algorithm explanation, workaround reason, complex pipeline |
| **MOCK data = HARAM** | Kecuali di seed.sql yang emang buat test data |
| **PORT = 3001** | Jangan pakai 3000 (dipakai project lain user) |

---

## 4. Build Verification Commands

```bash
cd apps/web
npx tsc --noEmit                     # TypeScript check
npx eslint . --max-warnings=0        # ESLint check
npx next build                       # Production build
npx playwright test --project=chromium  # E2E tests (10 tests, baseURL=localhost:3001)
```

---

## 5. Current Build Status

```
tsc --noEmit       ✅ 0 errors
eslint --max=0     ✅ 0 errors, 0 warnings
next build         ✅ 14 routes
@ts-ignore         ✅ 0 hits
as any             ✅ 0 hits
non-null `!`       ✅ 0 hits
playwright         ✅ 10/10 passing (~12s)
git status         ✅ Clean
dev port           ✅ 3001
```

---

## 6. Git Log (all sessions)

```
3e9ef90 chore: change dev server port from 3000 to 3001 to avoid conflict
f7a822e fix: clear txHash on mode switch, fix stakeTx stroop conversion, remove non-null assertion
8fd11b8 chore: add playwright-report and test-results to .gitignore
b14eee1 fix: wire signAndSubmit to appeal/resolve, remove mock data, add error + verifier UX
70022ae fix: wire signAndSubmit to all contract flows, decode quest steps, add profile activity
873a8e4 docs: update HANDOFF-AI.md to v3 — full session context, 7 new commits, audit results
db965de fix: audit — extract HuntInfoCard to page level so hider also sees hunt details
cc6e6ae feat: seed additional test data — 5 hunts, 3 claims, 2 disputes, 3 activities
b9885dc fix: remove generateMockSteps() — wire quest chain to real contract call
3e4c3f3 feat: wire campaign create to Supabase — persist via createCampaign()
6f6fac7 feat: wire create hunt real tx — signAndSubmit + insertHunt persist
5a6b720 feat: add hider approve/reject UI for pending claims
04daa87 feat: wire claim hunt real flow — prepareContractTx + Freighter signAndSubmit + Supabase persist
```

**Session #4 (latest):** 5 commits di atas `873a8e4` — fix signAndSubmit bugs, decode quest steps, UX polish, audit fixes, port change.

---

## 7. 🐛 ALL BUGS SOLVED — Root Cause + Solution

### Bugs From Previous Sessions (#1–#18)

> Lihat `HANDOFF-AI.md` v3 untuk bug #1–#18. File lama ada di git history (`873a8e4`).
> Ringkasan: contract panic, magic numbers, wallet cascade render, Soroban SDK 27, gitignore, secrets, unused deps, error auto-clear, commit-reveal hash, Freighter isConnected, Mapbox token, useEffect pattern, supabase types, column names, TransactionBuilder vs Transaction, Freighter address key, contract ID varchar, hider info visibility.

### Bugs From Session #4 (THIS SESSION)

### Bug #19: 🔴 Missing `signAndSubmit` di 4 komponen (CRITICAL)
- **Root cause**: `prepareContractTx` returns XDR (unsigned transaction blob), but 4 components treated `result.success === true` as "tx submitted to network". Freighter never called.
- **Impact**: Dispute votes, stakes, quest steps, quest claims — semua gak pernah beneran ke-submit ke blockchain. UX nunjukin "success" padahal cuma XDR yang berhasil di-assemble.
- **Fix**: Tambah `signAndSubmit(prep.xdr)` setelah `prepareContractTx` di semua 4 komponen. Baru update state/phase setelah `signAndSubmit` sukses.
- **Files**: `vote-panel.tsx` (commitVoteTx + revealVoteTx), `stake-manage.tsx` (stakeTx), `quest-step-view.tsx` (completeStepTx), `quest-progress.tsx` (claimQuestTx)

### Bug #20: 🔴 Missing `signAndSubmit` di appeal-form.tsx
- **Root cause**: Same as #19 — `appealTx()` returns XDR, never signed.
- **Fix**: Add `signAndSubmit(prep.xdr)`.

### Bug #21: 🔴 Missing `signAndSubmit` di dispute-result.tsx
- **Root cause**: Same as #19 — `resolveDisputeTx()` returns XDR, never signed.
- **Fix**: Add `signAndSubmit(prep.xdr)` + resolveError display.

### Anomaly A1: `txHash` tidak di-clear saat switch mode (stake-manage)
- **Root cause**: `setTxHash(null)` gak dipanggil di handler switch stake ↔ unstake
- **Fix**: Added `setTxHash(null)` in mode switch handlers

### Anomaly A2: `stakeTx` stroop/XLM unit mismatch (BUG)
- **Root cause**: `stakeTx(publicKey, amount: number)` passing raw number ke `toScI128()`. User input "1" (maksudnya 1 XLM) jadi 1 stroop (0.0000001 XLM).
- **Fix**: Changed signature to `stakeTx(pubKey, amountStroops: bigint)` matching `createHuntTx` convention. Caller in stake-manage.tsx now converts `parsedAmount * 10_000_000`.

### Anomaly A3: `publicKey!` non-null assertion (profile/page.tsx)
- **Fix**: Replaced with guard pattern: `const pk = publicKey; if (!pk) return;`

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
| hunts | 8 | GPS Monas, Puzzle HI, Quest Jakarta + 5 new |
| claims | 4 | 3 pending, 1 approved |
| disputes | 3 | 2 voting, 1 resolved |
| verifiers | 2 | Veri Master, Budi Hunter |
| brands | 1 | Sita Adventures (pro tier) |
| community_activities | 8 | Various activities for feed demo |

Seed SQL: `apps/web/lib/supabase/seed.sql`

---

## 10. Routes & Status (14 routes)

### ✅ REAL DATA + REAL TX FLOW (siap test dengan wallet asli)
| Route | Level | Status |
|---|---|---|
| `/` | L1 | ✅ Static landing |
| `/map` | L1 | ✅ Leaflet OSM + Supabase markers |
| `/profile` | L1 | ✅ Supabase user + Activity section (hunts + claims) + Verifier card |
| `/wallet` | L1 | ✅ Horizon API real |
| `/hunt/[id]` | L2 | ✅ HuntInfoCard + ClaimHuntView (signAndSubmit OK) + HiderApproveView |
| `/hunt/create` | L2 | ✅ 7-phase: IPFS → prepareContractTx → signAndSubmit → insertHunt |
| `/leaderboard` | L4 | ✅ Supabase users ranked |
| `/community` | L5 | ✅ Supabase activities + realtime |
| `/brand` | L4 | ✅ Register + dashboard |
| `/brand/dashboard` | L4 | ✅ Campaign create → Supabase |

### ⚠️ UI COMPLETE, TX WIRED — PERNAH DI-TEST DENGAN WALLET ASLI?
| Route | Level | Status | Note |
|---|---|---|---|
| `/quest/[id]` | L3 | ⚠️ | signAndSubmit wired. Contract helper decode ScVal OK. Butuh `setQuestStepsTx` untuk seed data. |
| `/verify` | L3 | ⚠️ | VotePanel + StakeManage signAndSubmit wired. applyAsVerifier works (Supabase). Belum test real Freighter. |
| `/dispute/[id]` | L3 | ⚠️ | AppealForm + DisputeResult signAndSubmit wired. Mock data removed. Belum test real Freighter. |
| `/settings` | L3 | ✅ | localStorage |

---

## 11. What DONE (End-to-End Real Flow)

| Flow | Status |
|---|---|
| Create Hunt → prepare tx → Freighter sign → submit → Supabase persist | ✅ |
| Claim Hunt → GPS → IPFS → prepare tx → Freighter sign → submit → Supabase persist | ✅ |
| Hider approve/reject → Supabase updateClaimStatus | ✅ |
| Campaign create → Supabase createCampaign | ✅ |
| Dispute commit vote → prepare tx → Freighter sign → submit | ✅ CODENYA, belum test wallet |
| Dispute reveal vote → prepare tx → Freighter sign → submit | ✅ CODENYA, belum test wallet |
| Dispute resolve → prepare tx → Freighter sign → submit | ✅ CODENYA, belum test wallet |
| Dispute appeal → prepare tx → Freighter sign → submit | ✅ CODENYA, belum test wallet |
| Stake → prepare tx → Freighter sign → submit (stroop conversion fixed) | ✅ CODENYA, belum test wallet |
| Quest complete step → prepare tx → Freighter sign → submit | ✅ CODENYA, belum test wallet |
| Quest claim → prepare tx → Freighter sign → submit | ✅ CODENYA, belum test wallet |
| Quest steps decode from ScVal | ✅ Helper ready |
| Quest steps seed (setQuestStepsTx) | ✅ Helper ready, butuh dipanggil |
| Profile activity (hunts created + claims submitted) | ✅ |
| Profile verifier status (stake, disputes, earnings) | ✅ |
| Hunt detail hider info card | ✅ |
| pollTx updates UI | ✅ |

---

## 12. Architecture

```
jelajah/
├── apps/web/
│   ├── app/                          # 14 routes
│   │   ├── page.tsx                  # Landing
│   │   ├── map/page.tsx              # Map (Leaflet OSM)
│   │   ├── profile/page.tsx          # Profile → Activity + Verifier card
│   │   ├── wallet/page.tsx           # Wallet + balance
│   │   ├── hunt/
│   │   │   ├── create/page.tsx       # Create wizard (signAndSubmit)
│   │   │   └── [id]/page.tsx         # HuntInfoCard + ClaimHuntView/HiderApproveView
│   │   ├── quest/[id]/page.tsx       # Quest chain (decoded ScVal)
│   │   ├── verify/page.tsx           # Verifier dashboard (VotePanel + StakeManage)
│   │   ├── dispute/[id]/page.tsx     # Dispute detail (AppealForm + DisputeResult)
│   │   ├── settings/page.tsx         # Settings
│   │   ├── brand/page.tsx            # Brand landing
│   │   ├── brand/dashboard/page.tsx  # Brand dashboard
│   │   ├── leaderboard/page.tsx      # Leaderboard
│   │   └── community/page.tsx        # Community feed
│   ├── components/
│   │   ├── hunt/
│   │   │   ├── create-hunt-wizard.tsx # signAndSubmit wired ✅
│   │   │   ├── claim-hunt-view.tsx    # signAndSubmit + pollTx + "Ajukan Dispute" ✅
│   │   │   └── hider-approve-view.tsx # approve/reject claims (ESLint fixed) ✅
│   │   ├── quest/
│   │   │   ├── quest-progress.tsx     # signAndSubmit + error display ✅
│   │   │   └── quest-step-view.tsx    # signAndSubmit + error display ✅
│   │   ├── dispute/
│   │   │   ├── vote-panel.tsx         # signAndSubmit + txHash display ✅
│   │   │   ├── stake-manage.tsx       # signAndSubmit + stroop fix + txHash clear ✅
│   │   │   ├── appeal-form.tsx        # signAndSubmit ✅
│   │   │   └── dispute-result.tsx     # signAndSubmit + resolveError ✅
│   │   └── ...
│   ├── config/
│   │   ├── constants.ts
│   │   ├── contracts.ts
│   │   ├── levels.ts
│   │   └── hunt-types.ts
│   ├── lib/
│   │   ├── stellar/soroban.ts         # ALL prepareContractTx helpers + setQuestStepsTx + ScVal decode
│   │   ├── ipfs/pinata.ts
│   │   ├── supabase/
│   │   │   ├── client.ts              # getUserHunts, getUserClaims, getVerifierStats, etc.
│   │   │   ├── types.ts
│   │   │   ├── schema.sql
│   │   │   └── seed.sql
│   │   └── utils.ts
│   ├── types/index.ts                # QuestStep, Hunt, Claim, Verifier, etc.
│   ├── e2e/                          # 10 Playwright tests
│   └── playwright.config.ts          # PORT 3001
├── contracts/                        # 5 Rust Soroban contracts
├── .github/workflows/ci.yml
└── .env.local
```

---

## 13. Key Files — Must Read First

| Priority | File | Why |
|---|---|---|
| 1 | `lib/stellar/soroban.ts` | ALL prepareContractTx helpers + setQuestStepsTx + ScVal decode. 11 contract functions. |
| 2 | `lib/supabase/client.ts` | getUserClaims, getUserHunts, getVerifierStats, insertHunt, insertClaim, etc. |
| 3 | `components/wallet/wallet-provider.tsx` | Freighter v6 + `signAndSubmit(xdr)` — sign via Freighter → submit to RPC |
| 4 | `config/constants.ts` | All rules, fees, thresholds |
| 5 | `config/contracts.ts` | Contract addresses from .env.local |
| 6 | `types/index.ts` | QuestStep, Hunt, Claim, Verifier, etc. |
| 7 | `playwright.config.ts` | PORT 3001 — jangan diubah ke 3000 |

---

## 14. Soroban Contract Helpers (FULL — v4)

```typescript
// lib/stellar/soroban.ts exports:

// Core — THE CRITICAL PATTERN
prepareContractTx(pubKey, contract, method, args) → TxResult   // build → simulate → assemble → return XDR
  // ⚠️ RETURNS XDR ONLY. MUST call signAndSubmit(xdr) after this.
  // ⚠️ assembled.build().toEnvelope().toXDR("base64") — NOT .toXDR() directly!
submitSignedTx(signedXdr) → TxResult                           // submit signed XDR to RPC
simulateTx(pubKey, contract, method, args) → SimSuccessResponse  // simulate only (read-only calls)
pollTx(txHash, maxAttempts=30) → TxResult                      // poll for tx confirmation (2s interval)

// Mutation (ALL use prepareContractTx — return XDR, MUST signAndSubmit after)
createHuntTx(pubKey, amountStroops: bigint, gpsLat, gpsLng, radius, deadlineUnix, clueHashHex, huntType) → TxResult
submitClaimTx(pubKey, instanceAddr, photoCidHex, lat, lng) → TxResult
completeStepTx(pubKey, questIdHex, step, photoCidHex) → TxResult
claimQuestTx(pubKey, questIdHex) → TxResult
commitVoteTx(pubKey, disputeIdHex, voteHashHex) → TxResult
revealVoteTx(pubKey, disputeIdHex, vote: boolean, saltHex) → TxResult
resolveDisputeTx(pubKey, disputeIdHex) → TxResult
appealTx(pubKey, disputeIdHex) → TxResult
stakeTx(pubKey, amountStroops: bigint) → TxResult              // ⚠️ amount in STROOPS (1 XLM = 10^7 stroops)
setQuestStepsTx(pubKey, questIdHex, steps: QuestStep[]) → TxResult  // NEW v4 — seed quest data

// Read-only (use simulateTx — returns decoded data, NOT XDR)
getQuestStepsTx(pubKey, questIdHex) → TxResult                 // result = JSON.stringify(QuestStep[]), decoded from ScVal
getCurrentStepTx(pubKey, questIdHex) → TxResult                // result = String(u32), decoded from ScVal

// Voting
computeVoteHash(pubKey, vote: boolean, saltHex: string) → Promise<string>  // sha256(xdr_encode(verifier,vote,salt))

// Converters
toScAddress, toScI128, toScI64, toScU32, toScU64, toScBytesN32, toScBool, fromScVal

// TxResult interface
interface TxResult {
  hash: string;       // tx hash after submit (empty for prepare-only)
  success: boolean;
  result?: string;    // human-readable or JSON-encoded decoded data
  error?: string;
  xdr?: string;       // assembled XDR for Freighter signing (from prepareContractTx)
}
```

### 🚨 CRITICAL TX FLOW — MUST FOLLOW THIS PATTERN

```typescript
// 1. Prepare → get XDR
const prep = await someTxFn(pubKey, ...args);
if (!prep.success || !prep.xdr) { /* handle prep error */ return; }

// 2. Sign via Freighter → submit to network
const { signAndSubmit } = useWallet();
const submit = await signAndSubmit(prep.xdr);
if (!submit.success) { /* handle sign/submit error */ return; }

// 3. Persist to Supabase (non-blocking)
try { await insertSomething({ ...params, txHash: submit.hash }); } catch { /* on-chain already */ }

// 4. Poll for confirmation (optional)
void pollTx(submit.hash);
```

### ❌ ANTI-PATTERN — NEVER DO THIS
```typescript
const result = await commitVoteTx(pubKey, disputeId, voteHash);
if (result.success) { /* WRONG! Only means XDR assembled, not tx submitted */ }
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

## 16. Supabase Query + Write Pattern

```tsx
import { 
  getActiveHunts, getHuntById, getUserHunts, getUserClaims,
  applyAsVerifier, registerBrand, getVerifierStats,
  insertHunt, insertClaim, updateClaimStatus, createCampaign,
  getPendingClaims, getClaimsByHunt
} from "@/lib/supabase/client";

// Read
const hunts = await getActiveHunts();
const hunt = await getHuntById(1);
const userHunts = await getUserHunts(publicKey);        // hunts created by user (hider)
const userClaims = await getUserClaims(publicKey);       // claims by user (hunter)
const verifierInfo = await getVerifierStats(publicKey);  // returns Verifier | null
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

## 17. Wallet Pattern

```tsx
const { isConnected, publicKey, balance, connect, disconnect, signAndSubmit } = useWallet();

// Connect
await connect();  // calls requestAccess() → getAddress() fallback

// Sign + submit (THE ONLY WAY TO SEND CONTRACT TX)
const result = await signAndSubmit(xdr);  // { hash, success, error }
```

**NEVER**: 
- Import `isConnected` from `@stellar/freighter-api`
- Call `signTransaction` directly — always use `signAndSubmit` from hook
- Treat `prepareContractTx` result as "submitted"

---

## 18. Quest Step ScVal Encoding

QuestStep Rust struct:
```rust
pub struct QuestStep {
    pub step_number: u32,     // ScvVec[0] = ScvU32
    pub clue_hash: BytesN<32>, // ScvVec[1] = ScvBytesN32
    pub gps_lat: i64,         // ScvVec[2] = ScvI64 (value * 10^7)
    pub gps_lng: i64,         // ScvVec[3] = ScvI64 (value * 10^7)
    pub radius: u32,          // ScvVec[4] = ScvU32
    pub is_final: bool,       // ScvVec[5] = ScvBool
}
// Vec<QuestStep> → ScvVec([ScvVec([...step1...]), ScvVec([...step2...]), ...])
```

---

## 19. Next Plan — Prioritas

### ✅ SUDAH KELAR (Session #4):
- ✅ Semua 9 prepareContractTx callers wired ke signAndSubmit (vote, stake, quest step, quest claim, appeal, resolve)
- ✅ setQuestStepsTx helper — siap dipanggil untuk seed quest data
- ✅ getQuestStepsTx ScVal decode — return QuestStep[] sebagai JSON
- ✅ Profile activity section (hunts created + claims submitted)
- ✅ Profile verifier info card
- ✅ pollTx wired ke UI
- ✅ "Ajukan Dispute" button wired → /verify
- ✅ Mock data dihapus dari dispute page
- ✅ Error display di quest-progress
- ✅ stakeTx stroop conversion fixed
- ✅ txHash cleared on mode switch
- ✅ non-null assertion dihilangkan
- ✅ Port 3000 → 3001

### YANG BELUM — Next AI Session:

**Prioritas 1: Test dengan Wallet Asli (Freighter + Testnet)**
1. **Test dispute flow end-to-end**: commit vote → reveal vote → resolve — code sudah wired, butuh Freighter asli
2. **Test stake flow**: stake via contract — code sudah wired, butuh Freighter asli
3. **Test quest chain**: complete step → claim quest — code sudah wired, butuh Freighter asli
4. **Test create hunt full flow**: wizard → signAndSubmit → muncul di map

**Prioritas 2: Quest Chain — Seed Data + Full End-to-End**
5. **Panggil `setQuestStepsTx`**: Seed quest data ke contract (helper udah siap di soroban.ts)
6. **Wire quest page ke getCurrentStepTx**: Tampilin current step per hunter dari contract
7. **Test quest flow lengkap**: seed → read steps → complete step → claim

**Prioritas 3: Create Dispute Flow**
8. **Bikin `createDispute` function**: Di Supabase client + contract. Saat ini hunter cuma bisa navigate ke /verify dari "Ajukan Dispute", tapi gak ada cara bikin dispute baru.

**Prioritas 4: UX Remaining**
9. **Hunt claim history di profile**: getUserClaims udah ada, udah dipake di profile. Tapi belum ada filter/pagination.
10. **Dispute page**: Saat ini cuma nge-link ke /verify, tapi mungkin butuh halaman list dispute per hunt.

**Prioritas 5: Mainnet (L6)**
11. Deploy contracts ke mainnet
12. Update semua address di `config/contracts.ts` dan `.env.local`
13. Set `NEXT_PUBLIC_CURRENT_LEVEL=6`
14. Security audit (terutama commit-reveal flow)

---

## 20. Common Pitfalls — JANGAN DIULANGI

| Pitfall | Detail |
|---|---|
| `rpc.assembleTransaction(tx, sim)` | Returns `TransactionBuilder`, NOT `Transaction`. Must `.build()` first → `.toEnvelope().toXDR("base64")` |
| `signTransaction(xdr, { accountToSign })` | Freighter v6 uses `address`, NOT `accountToSign` |
| Contract ID varchar(56) | Must be EXACTLY 56 chars or less |
| `isConnected` from Freighter | Returns object, always truthy. NEVER import. Use `getAddress()` instead |
| `prepareContractTx` return value | `result.success` = XDR assembled. NOT tx submitted. MUST call `signAndSubmit(result.xdr)` |
| MOCK data | HARAM. Remove semua kecuali di seed.sql |
| Port 3000 | DIPAKAI PROJECT LAIN. Selalu pakai 3001. Jangan ubah playwright config. |
| `as` cast | Only `as const` or `satisfies`. Map Supabase rows via explicit mapping. |
| `!` non-null assertion | HARAM. Gunakan guard pattern. |
| Empty catch | HARAM. Minimal: `catch { /* non-critical */ }` with comment. |
| `stakeTx` parameters | amountStroops in STROOPS (1 XLM = 10^7). Multiply by 10_000_000 before calling. |
| Git push | JANGAN — user yang push. |

---

Good luck bro. Semua konteks ada di sini. Build JELAJAH, gak ada refactor, gak ada kerja 2 kali. 🚀

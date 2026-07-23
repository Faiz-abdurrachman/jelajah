# JELAJAH — Build Plan

> **Filosofi:** Build sekali untuk semua level (L1-L7). Feature gate, bukan refactor.

---

## Arsitektur Full

```
jelajah/
├── apps/
│   └── web/                    # Next.js 16 + React 19 + TypeScript 5
│       ├── src/
│       │   ├── app/            # App Router: semua route L1-L7
│       │   │   ├── page.tsx                # Landing (L1)
│       │   │   ├── map/page.tsx            # Map view (L1)
│       │   │   ├── hunt/
│       │   │   │   ├── [id]/page.tsx       # Hunt detail (L2)
│       │   │   │   ├── create/page.tsx     # Create hunt (L2)
│       │   │   │   └── claim/page.tsx      # Claim flow (L2)
│       │   │   ├── quest/
│       │   │   │   └── [id]/page.tsx       # Quest chain (L3)
│       │   │   ├── dispute/
│       │   │   │   └── [id]/page.tsx       # Dispute flow (L3)
│       │   │   ├── verify/page.tsx         # Verifier dashboard (L3)
│       │   │   ├── profile/page.tsx        # Profile (L1)
│       │   │   ├── wallet/page.tsx         # Wallet (L1)
│       │   │   ├── brand/                  # Brand dashboard (L4)
│       │   │   │   ├── page.tsx            # Brand landing
│       │   │   │   └── dashboard/page.tsx  # Brand dashboard
│       │   │   ├── leaderboard/page.tsx    # Leaderboard (L4)
│       │   │   ├── community/page.tsx      # Community feed (L5)
│       │   │   └── api/                    # Developer API (L7)
│       │   ├── components/
│       │   │   ├── ui/                     # shadcn/ui components
│       │   │   ├── layout/                 # Navbar, Sidebar, Footer
│       │   │   ├── map/                    # Mapbox components
│       │   │   ├── hunt/                   # Hunt cards, forms
│       │   │   ├── wallet/                 # Wallet connect button
│       │   │   ├── dispute/                # Dispute UI components
│       │   │   ├── quest/                  # Quest chain components
│       │   │   ├── brand/                  # Brand dashboard components
│       │   │   ├── leaderboard/            # Leaderboard components
│       │   │   ├── community/              # Community feed components
│       │   │   └── feature-gate/           # <RequireLevel> component
│       │   ├── hooks/                      # Custom React hooks
│       │   ├── lib/
│       │   │   ├── stellar/               # Stellar SDK helpers
│       │   │   ├── mapbox/                # Mapbox helpers
│       │   │   ├── ipfs/                  # IPFS upload helpers
│       │   │   └── db/                    # Database client
│       │   ├── config/
│       │   │   ├── constants.ts           # Magic numbers → constants
│       │   │   ├── contracts.ts           # Contract addresses
│       │   │   ├── levels.ts              # Level definitions
│       │   │   └── hunt-types.ts          # Hunt type enum
│       │   └── types/                     # TypeScript types
│       ├── public/
│       ├── e2e/                           # Playwright tests
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── contracts/                   # Rust Soroban contracts
│   ├── Cargo.toml               # Workspace
│   ├── hunt-factory/
│   ├── hunt-instance/
│   ├── reputation/
│   ├── dispute/
│   └── quest-chain/
├── docs/                        # Dokumentasi
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions
├── docker-compose.yml           # PostgreSQL lokal
├── .env.local                   # Environment
├── .eslintrc.json
├── .prettierrc
└── README.md
```

---

## Urutan Build (Prioritas)

### Phase 0: Foundation (Semua Level)
| # | Task | Level Gate | Commit Message |
|---|---|---|---|
| 0.1 | Init Next.js 16 + TypeScript 5 strict + Tailwind CSS 4 + shadcn/ui | L1 | `feat: init next.js project with tailwind and shadcn/ui` |
| 0.2 | Init Rust workspace with all contract stubs | L1 | `feat: init rust workspace with contract stubs` |
| 0.3 | Setup ESLint + Prettier + TypeScript strict config | L1 | `feat: add eslint prettier and typescript strict config` |
| 0.4 | Create full PostgreSQL schema (all tables: users, hunts, claims, disputes, verifiers, brands, notifications, api_keys) | L1 | `feat: create full database schema for all levels` |
| 0.5 | Create config files (constants, levels, hunt-types, contracts) | L1 | `feat: add config constants and type definitions` |
| 0.6 | Build FeatureGate system (`<RequireLevel>` component + level config) | L1 | `feat: add feature gate system with RequireLevel component` |
| 0.7 | Create shared UI components (layout, navbar, sidebar, footer) | L1 | `feat: add shared layout components` |

### Phase 1: Smart Contracts — Write ALL (L1)
| # | Task | Level Gate | Commit Message |
|---|---|---|---|
| 1.1 | Write hunt-factory contract (create_hunt, events) | L2 | `feat: write hunt-factory contract` |
| 1.2 | Write hunt-instance contract (full lifecycle) | L2 | `feat: write hunt-instance contract with claim and release` |
| 1.3 | Write reputation contract (XP, level, badges) | L3 | `feat: write reputation contract with xp and badges` |
| 1.4 | Write dispute contract (multi-sig, commit-reveal, appeal) | L3 | `feat: write dispute contract with commit-reveal voting` |
| 1.5 | Write quest-chain contract (multi-step, completion) | L3 | `feat: write quest-chain contract with multi-step support` |
| 1.6 | Write contract unit tests (cargo test for all contracts) | L3 | `test: add unit tests for all contracts` |

### Phase 2: Stellar Integration (L1-L2)
| # | Task | Level Gate | Commit Message |
|---|---|---|---|
| 2.1 | Stellar Wallets Kit integration (Freighter, Albedo, xBull, Lobstr) | L1 | `feat: integrate stellar wallets kit with multi-wallet support` |
| 2.2 | Horizon API service (balance, transactions) | L1 | `feat: add horizon api service for balance and tx` |
| 2.3 | Wallet context + hooks (useWallet, useHorizon) | L1 | `feat: add wallet context and hooks` |
| 2.4 | Soroban SDK helpers (contract interaction, tx building) | L2 | `feat: add soroban sdk helpers for contract calls` |

### Phase 3: Frontend Pages — ALL Routes (L1-L7)
| # | Task | Level Gate | Commit Message |
|---|---|---|---|
| 3.1 | Landing page + Connect Wallet flow | L1 | `feat: add landing page with wallet connect` |
| 3.2 | Mapbox integration (full-screen map, markers, clustering) | L1 | `feat: add mapbox map with markers and clustering` |
| 3.3 | Profile page (stats, badges, hunt history) | L1 | `feat: add profile page with stats and badges` |
| 3.4 | Wallet page (balance, tx history) | L1 | `feat: add wallet page with balance and tx history` |
| 3.5 | Create Hunt flow (type -> clue -> GPS -> reward -> deadline -> sign) | L2 | `feat: add create hunt flow with all steps` |
| 3.6 | Hunt detail page (clue, GPS route, claim button) | L2 | `feat: add hunt detail page with gps route` |
| 3.7 | Claim Hunt flow (GPS check -> photo -> submit -> pending) | L2 | `feat: add claim hunt flow with photo upload` |
| 3.8 | Quest Chain UI (step overview, progress, complete) | L3 | `feat: add quest chain ui with step progression` |
| 3.9 | Verifier Dashboard (dispute list, vote, stake) | L3 | `feat: add verifier dashboard with dispute voting` |
| 3.10 | Dispute UI (detail, commit-reveal, appeal) | L3 | `feat: add dispute ui with commit-reveal voting` |
| 3.11 | Brand Dashboard (register, campaign, analytics) | L4 | `feat: add brand dashboard with campaign tools` |
| 3.12 | Leaderboard page (hunter, hider rankings) | L4 | `feat: add leaderboard page` |
| 3.13 | Community Feed (activity, notifications) | L5 | `feat: add community feed with notifications` |
| 3.14 | Settings page (network, language, currency) | L3 | `feat: add settings page` |

### Phase 4: Infrastructure (L3+)
| # | Task | Level Gate | Commit Message |
|---|---|---|---|
| 4.1 | GitHub Actions CI/CD (build, lint, test, deploy) | L3 | `ci: add github actions workflow` |
| 4.2 | Playwright E2E tests for main flows | L3 | `test: add playwright e2e tests` |
| 4.3 | Mobile responsive styling | L3 | `feat: add mobile responsive styles` |
| 4.4 | IPFS upload service (Pinata) | L2 | `feat: add ipfs upload service` |
| 4.5 | Docker compose for local PostgreSQL | L1 | `feat: add docker compose for local postgres` |
| 4.6 | README.md with full documentation | L1 | `docs: add comprehensive readme` |

---

## Komponen Reusable

| Komponen | Lokasi | Dipakai di |
|---|---|---|
| `<RequireLevel>` | `components/feature-gate/` | Semua halaman |
| `<WalletConnectButton>` | `components/wallet/` | Navbar, Landing |
| `<WalletProvider>` | `components/wallet/` | Root layout |
| `<HuntMap>` | `components/map/` | Map page, Create, Detail |
| `<HuntCard>` | `components/hunt/` | Map, List, Brand |
| `<ClueInput>` | `components/hunt/` | Create hunt |
| `<PhotoUpload>` | `components/hunt/` | Create, Claim |
| `<GPSSensor>` | `components/hunt/` | Claim, Quest |
| `<Countdown>` | `components/ui/` | Claim pending, Deadline |
| `<DisputePanel>` | `components/dispute/` | Dispute, Verifier |
| `<QuestProgress>` | `components/quest/` | Quest chain |
| `<BrandNav>` | `components/brand/` | Brand dashboard |
| `<NotificationBell>` | `components/community/` | Layout |
| `<LeaderboardTable>` | `components/leaderboard/` | Leaderboard |
| `<FeatureLocked>` | `components/feature-gate/` | Locked pages |

---

## Timeline Estimasi

| Phase | Estimated Commits | Estimated Time |
|---|---|---|
| **Phase 0** - Foundation | 7 commits | 2-3 jam |
| **Phase 1** - Smart Contracts | 6 commits | 4-6 jam |
| **Phase 2** - Stellar Integration | 4 commits | 2-3 jam |
| **Phase 3** - Frontend Pages | 14 commits | 6-8 jam |
| **Phase 4** - Infrastructure | 6 commits | 2-3 jam |
| **Total** | **~37 commits** | **~16-23 jam** |

---

## Catatan Penting

1. **Tidak ada refactor** - Semua kode ditulis untuk full architecture dari awal
2. **Commit setiap fitur** - Bukan tiap file. 1 fitur logis = 1 commit
3. **Jangan push** - Hanya commit lokal
4. **Feature gate, bukan 404** - Halaman yang terkunci tampilkan `<ComingSoon>`
5. **No `any`, no `@ts-ignore`** - Strict mode dari awal
6. **Test sebelum commit** - Contract: `cargo test`, Frontend: TypeScript compile check

---

## Level Feature Gate Reference

| Route | Level | Path |
|---|---|---|
| Landing | L1 | `/` |
| Map (read-only) | L1 | `/map` |
| Profile | L1 | `/profile` |
| Wallet | L1 | `/wallet` |
| Hunt Detail | L2 | `/hunt/[id]` |
| Create Hunt | L2 | `/hunt/create` |
| Claim Hunt | L2 | `/hunt/claim/[id]` |
| Quest Chain | L3 | `/quest/[id]` |
| Verifier Dashboard | L3 | `/verify` |
| Dispute | L3 | `/dispute/[id]` |
| Settings | L3 | `/settings` |
| Brand Dashboard | L4 | `/brand/*` |
| Leaderboard | L4 | `/leaderboard` |
| Community Feed | L5 | `/community` |
| Developer API | L7 | `/api/*` |

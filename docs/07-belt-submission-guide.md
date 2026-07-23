# JELAJAH — Belt Submission Guide

## Level 1: White Belt

### Requirements Checklist
| # | Item | Status |
|---|---|---|
| 1 | Wallet setup (Freighter, testnet) | ⬜ |
| 2 | Connect wallet functionality | ⬜ |
| 3 | Disconnect wallet functionality | ⬜ |
| 4 | Fetch XLM balance (Horizon API) | ⬜ |
| 5 | Display balance in UI | ⬜ |
| 6 | Send XLM transaction on testnet | ⬜ |
| 7 | Transaction feedback: success/failure + hash | ⬜ |
| 8 | Public GitHub repository | ⬜ |
| 9 | README.md with description + setup + screenshots | ⬜ |

### Screenshots Needed
1. Wallet connected state
2. Balance displayed
3. Successful testnet transaction
4. Transaction result + hash

### JELAJAH Screens (L1)
- 1A Landing + Connect Wallet
- 2A Map (read-only, dummy data)
- 6A Profile (public key + balance)
- 7A Wallet (balance + tx history)

---

## Level 2: Yellow Belt

### Requirements Checklist
| # | Item | Status |
|---|---|---|
| 1 | Multi-wallet (Freighter, Albedo, xBull, Lobstr) | ⬜ |
| 2 | 3 error types handled (wallet not found, rejected, insufficient balance) | ⬜ |
| 3 | Contract deployed on testnet (hunt-factory + hunt-instance) | ⬜ |
| 4 | Contract called from frontend | ⬜ |
| 5 | Transaction status visible | ⬜ |
| 6 | 2+ meaningful commits | ⬜ |
| 7 | README with live demo link + screenshots + contract address | ⬜ |

### Screenshots Needed
1. Wallet options (multi-wallet)
2. Deployed contract address (Stellar Expert)
3. Transaction hash of a contract call

### JELAJAH Screens (L2)
- 1B Wallet Select
- 4A-4I Create Hunt (full flow)
- 3C Active Hunt
- 3D-3G Claim Flow

---

## Level 3: Orange Belt

### Requirements Checklist
| # | Item | Status |
|---|---|---|
| 1 | Advanced smart contract (inter-contract: quest + dispute + reputation) | ⬜ |
| 2 | Event streaming (hunt events on-chain) | ⬜ |
| 3 | CI/CD pipeline (GitHub Actions) | ⬜ |
| 4 | Mobile responsive frontend | ⬜ |
| 5 | Error handling & loading states | ⬜ |
| 6 | Writing tests (contract + frontend) | ⬜ |
| 7 | 10+ meaningful commits | ⬜ |
| 8 | README with complete documentation | ⬜ |
| 9 | Live demo link (Vercel) | ⬜ |
| 10 | Contract deployment address (Stellar Expert) | ⬜ |
| 11 | Screenshot: mobile responsive UI | ⬜ |
| 12 | Screenshot: CI/CD pipeline running | ⬜ |
| 13 | Screenshot: test output (3+ passing) | ⬜ |
| 14 | Demo video link (1-2 minutes) | ⬜ |

### JELAJAH Screens (L3)
- 5A-5D Quest Chain
- 8A-8E Verifier System
- 9A-9C Dispute Flow
- 12A Settings (network, language)

### Idea Submission (unlock L4)
Submit ke Stellar team:
1. Problem Statement — "Real-world treasure hunt with trustless escrow"
2. Why Stellar — Claimable Balances + Path Payments + micro fees
3. Target Users — Hunter, Hider, Brand
4. Technical Architecture — Soroban + Next.js + IPFS + Mapbox
5. Complexity — GPS verification, multi-sig dispute, quest chain

---

## Level 4: Green Belt

| # | Item | Status |
|---|---|---|
| 1 | MVP with 10 real users on testnet | ⬜ |
| 2 | Brand Dashboard | ⬜ |
| 3 | Campaign tools | ⬜ |
| 4 | Referral system | ⬜ |
| 5 | Basic leaderboard | ⬜ |

---

## Level 5: Blue Belt

| # | Item | Status |
|---|---|---|
| 1 | 50 real users | ⬜ |
| 2 | User feedback → new features | ⬜ |
| 3 | Streak system | ⬜ |
| 4 | Badge system | ⬜ |
| 5 | Community feed | ⬜ |
| 6 | Pitch + Demo | ⬜ |
| 7 | Mentor review (technical + market fit) | ⬜ |

---

## Level 6: Black Belt

| # | Item | Status |
|---|---|---|
| 1 | Mainnet launch | ⬜ |
| 2 | Security audit | ⬜ |
| 3 | 10+ mainnet users | ⬜ |
| 4 | Bug bounty program | ⬜ |
| 5 | Demo Day ready | ⬜ |

---

## Level 7: Master Belt

| # | Item | Status |
|---|---|---|
| 1 | SCF Grant application | ⬜ |
| 2 | API/SDK for developers | ⬜ |
| 3 | Enterprise brand partnership | ⬜ |
| 4 | 100+ mainnet users | ⬜ |

---

## Submission Tips

### README Harus Ada
- Project description (what is JELAJAH)
- Tagline + one-liner
- Tech stack badges
- Screenshots (sesuai level)
- Setup instructions
- Live demo link
- Contract addresses + explorer links
- Demo video link (L3+)

### Judging Criteria Focus
| Criteria | How JELAJAH Scores |
|---|---|
| Core Technical Standards | Smart contract full functionality + testing |
| Code Quality & Security | Clean architecture, no any/ts-ignore, CI/CD |
| Ecosystem Fit | Stellar-native: Claimable Balances, Path Payments, Anchor |
| User Traction (L5+) | Real user onboarding, feedback implementation |

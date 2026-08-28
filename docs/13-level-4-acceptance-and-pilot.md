# Level 4 Acceptance Criteria and Pilot Protocol

## Scope

Level 4 turns JELAJAH from a Testnet engineering prototype into a production
MVP for sponsored location campaigns. The release must prove the complete
sponsor-to-hunter flow with real users; feature breadth is secondary to a
stable, measurable settlement flow.

The canonical pilot asset is native XLM on Stellar Testnet. A stable-value
asset must not be advertised as live until its issuer, asset contract, funding,
claim, refund, and payout flows have all been verified on the target network.

## Definition of Done

### Production MVP

- A sponsor can create a campaign and attach at least one funded hunt.
- Funding is signed by the sponsor wallet and confirmed on Stellar Testnet.
- A hunter can discover the hunt, submit a signed claim, and see its status.
- The sponsor can approve or reject; approved claims settle escrow and award XP.
- Refreshing the UI never resubmits a transaction that already reached the ledger.
- Stellar is canonical; Supabase is a retryable secondary index.
- Desktop and 375 px mobile layouts complete the same critical flow.
- Loading, empty, degraded, rejected, timeout, and confirmed states are explicit.

### Product Operations

- Production analytics records the onboarding and settlement funnel.
- Error monitoring receives frontend and server failures with release metadata.
- A health endpoint reports application configuration without exposing secrets.
- Product feedback is collected with explicit consent and no wallet secret data.
- CI validates web, API, and contract behavior before production deployment.

### Real-user Validation

- At least 10 unique people complete onboarding.
- At least 10 unique Testnet wallets produce a signed transaction.
- Every submitted proof includes a verified transaction hash and Explorer link.
- At least 10 feedback responses are summarized without fabricating results.
- The team implements and documents the highest-priority findings before review.

### Submission Evidence

- Public GitHub repository and production URL.
- At least 15 meaningful Level 4 commits after the Level 3 baseline.
- Testnet deployment manifest and contract addresses.
- Screenshots of product UI, mobile UI, analytics, monitoring, CI, user proof,
  and feedback summary.
- Level 4 demo video showing the complete sponsor-to-hunter flow.
- README section mapping each requirement to an artifact or verifiable link.

## Pilot Design

Recruit 12–15 participants to create a buffer above the minimum requirement:

- 2 sponsors or organizers.
- 10–13 hunters.
- One Testnet wallet per participant.
- At least 10 funded hunts so each hunter can sign a genuine claim interaction.

Recommended pilot sequence:

1. Explain Testnet, privacy boundaries, and the purpose of the study.
2. Collect consent before recording a public wallet address or feedback.
3. Ask the participant to complete onboarding without developer intervention.
4. Record the participant's pseudonymous ID, role, and completion time.
5. Verify every transaction against Stellar RPC before accepting it as evidence.
6. Collect the short feedback survey immediately after the transaction flow.
7. Classify findings as security, blocking, confusing, or enhancement issues.
8. Implement the highest-impact findings and run a focused retest.

## Evidence Record

Each wallet interaction record must contain:

- Pseudonymous participant ID (`P01`, `P02`, and so on).
- Role (`sponsor` or `hunter`).
- Public Testnet wallet address, with consent.
- Contract method or payment action.
- Full transaction hash.
- Contract address where applicable.
- Ledger number and confirmed status.
- Interaction timestamp.
- Explorer URL.
- Associated anonymous feedback record ID.

Never collect a password, seed phrase, secret key, recovery phrase, wallet
export, or screenshot that exposes wallet secrets.

## Product Metrics

Targets guide the pilot but must never replace the measured result:

| Metric | Target |
|---|---:|
| Completed onboarding | 10+ unique people |
| Verified wallet interactions | 10+ unique wallets |
| Feedback completion | 80% or higher |
| Median onboarding to first transaction | Under 5 minutes |
| Average usability rating | 3.5 / 5 or higher |
| Unresolved critical incidents | 0 |

## Severity Model

- **P0:** Security issue, incorrect payout, lost funds, or duplicate settlement.
- **P1:** A participant cannot finish the critical flow.
- **P2:** The flow completes but status or instructions cause material confusion.
- **P3:** Visual polish or non-blocking enhancement.

The final validation report must map each important observation to a decision,
commit, and retest result.


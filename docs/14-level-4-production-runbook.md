# Level 4 Production Runbook

This runbook is the release gate for the Level 4 MVP. Do not recruit pilot
participants until every preflight check passes. Stellar Testnet remains the
canonical economic state; Supabase stores verified indexes, consent, and
product-validation evidence.

## Current Release Blockers (2026-08-28)

- The linked Vercel project does not yet contain Supabase, Pinata, or map
  environment variables.
- The Supabase URL currently configured in local development does not resolve,
  so migrations and Level 4 tables cannot be verified.
- Vercel Web Analytics and Speed Insights are integrated in code but still need
  to be enabled in the Vercel project dashboard.
- No real-user pilot has run. The public evidence page must remain below 10/10
  until ten distinct consented wallets have confirmed Testnet interactions.

These are release blockers, not application success states. Do not replace them
with mock credentials, fabricated wallet records, or screenshots from E2E mocks.

## 1. Provision an Active Supabase Project

Create or reactivate a Supabase project. Copy its project URL, publishable/anon
key, and server-only secret/service-role key into local `.env.local`. Never
commit these values.

Apply the migrations in order through the Supabase SQL Editor or the team's
normal migration workflow:

1. `apps/web/lib/supabase/migrations/001_secure_gps_mvp.sql`
2. `apps/web/lib/supabase/migrations/002_level4_production_mvp.sql`

Migration 002 creates consent, wallet interaction, and feedback tables with RLS
enabled. Browser roles cannot read or write private validation data.

## 2. Configure Local Release Environment

Start from `apps/web/.env.example`. Required server secrets are:

- `SUPABASE_SERVICE_ROLE_KEY`
- `WALLET_SESSION_SECRET` (minimum 32 random characters)
- `PINATA_API_KEY`
- `PINATA_SECRET_KEY`

Set `NEXT_PUBLIC_CURRENT_LEVEL=4` and keep
`NEXT_PUBLIC_NETWORK=testnet`. Never configure or deploy a wallet seed phrase,
recovery phrase, or deployer secret in the web application.

Run the automated preflight:

```bash
cd apps/web
npm run verify:l4
```

It must report `PASS` for every environment and database check.

## 3. Configure Vercel Production

Add the same public configuration and server-only secrets through the Vercel
project's Production Environment Variables screen. Use separate production
values for `WALLET_SESSION_SECRET` and Pinata credentials. Do not paste secrets
into shell history, issue comments, screenshots, or documentation.

Required production variables are enumerated by
`scripts/verify-level4-readiness.mjs`. The Vercel project must set
`NEXT_PUBLIC_CURRENT_LEVEL=4` before the production build.

In the Vercel dashboard:

1. Open **Analytics** and enable Web Analytics.
2. Open **Speed Insights** and enable it for the project.
3. Confirm the Git production branch is `main`.

The application uses `@vercel/analytics` for anonymous page analytics and
`@vercel/speed-insights` for real-user Core Web Vitals.

## 4. Deploy and Verify

Only after local preflight is green:

```bash
cd apps/web
npm run lint
npm run build
npm run test:e2e
vercel --prod
```

Verify production health and critical routes:

```bash
LEVEL4_BASE_URL=https://jelajah-stellar.vercel.app npm run verify:l4
```

Manual smoke test:

1. `/api/health` returns `ready: true` and `status: ok`.
2. `/brand/dashboard` restores a signed wallet session.
3. A sponsor creates a campaign and funds one hunt on Testnet.
4. The transaction hash opens successfully in Stellar Expert.
5. Returning to the dashboard shows the linked hunt and funded XLM.
6. `/pilot` records consent, finds the verified transaction, and accepts
   feedback.
7. `/pilot/evidence` increments only for a distinct qualified wallet.
8. Vercel Analytics shows a production page view and Speed Insights receives a
   data point after normal usage.

## 5. Pilot Operations

Follow `docs/13-level-4-acceptance-and-pilot.md`. Recruit 12–15 people to leave
buffer above the required ten. One person must use one Testnet wallet; duplicate
wallets or developer-generated records do not count.

After each session, verify the explorer link shown by `/pilot/evidence`. Stop
the pilot immediately for an incorrect payout, duplicate settlement, exposed
secret, or transaction whose UI state disagrees with the ledger.

## Rollback

If production health or the critical flow fails:

1. Stop recruiting pilot users.
2. Promote the last known-good Vercel deployment.
3. Do not delete confirmed Testnet transactions or validation records.
4. Record the incident and affected transaction hashes without user secrets.
5. Fix on a branch, rerun all gates, and redeploy.

Database indexing failures must remain retryable. Never ask a user to resend a
contract transaction that Stellar already confirmed.

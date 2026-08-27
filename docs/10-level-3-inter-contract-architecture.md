# Level 3 Inter-Contract Architecture

Status: accepted for the Level 3 Testnet deployment.

## Objective

Connect the existing escrow flow to an on-chain reputation system without
allowing arbitrary accounts or contracts to mint XP.

```text
wallet
  │ create_hunt
  ▼
HuntFactory ── deploy + register ──▶ HuntInstance
     │                                  │
     └──── register_hunt ───────────────▶ Reputation
                                        ▲
HuntInstance ── award_hunt_xp ──────────┘
        (only after an escrow reward is paid)
```

## Trust and authorization model

- `Reputation` has an administrator set in its constructor.
- Only that administrator can configure the trusted `HuntFactory`.
- The configured factory registers the address created for each `hunt_id`.
- Only the registered instance for that exact `hunt_id` can award its XP.
- The receiving contract validates the immediate contract caller with
  `Address::require_auth`. Soroban automatically authorizes direct contract
  calls; `Env::authorize_as_current_contract` is reserved for deeper invocation
  trees and is not needed in this direct A→B flow.
- A processed marker keyed by `hunt_id` prevents replay, even if a future
  instance regression attempted to award the same hunt twice.
- XP amounts are selected by the trusted instance contract, not by the wallet.

An address parameter alone is not treated as identity. Every privileged
contract address must both match storage and satisfy Soroban authorization.

## Atomic claim flow

When a hider approves a pending claim (or the 24-hour timer releases it), the
instance performs one Soroban transaction:

1. verify the state and escrow balance;
2. mark the hunt claimed;
3. transfer the escrowed XLM to the hunter;
4. call `Reputation::award_hunt_xp` as the current instance contract;
5. emit the reward and XP events.

Soroban rolls back the entire invocation tree if any step fails. A hunter
cannot receive funds without the matching state transition and XP record, or
receive XP without the escrow settlement succeeding.

## Required invariants

1. A wallet cannot call `register_hunt` as the factory.
2. An unregistered contract cannot call `award_hunt_xp`.
3. An instance registered for hunt A cannot award XP for hunt B.
4. A hunt can award XP at most once.
5. Failed or rejected claims award no XP.
6. Successful approval and auto-release each award the configured XP exactly
   once and retain the existing exactly-once XLM payout behavior.
7. XP arithmetic cannot wrap.

## Deployment order

The contracts are intentionally deployed as a new compatible Testnet set:

1. build optimized `hunt-instance` and `reputation` WASM;
2. install both WASM hashes;
3. deploy `Reputation(admin)`;
4. deploy `HuntFactory(instance_wasm_hash, asset, reputation)`;
5. call `Reputation::set_factory(admin, factory)`;
6. verify all stored addresses with read-only contract calls;
7. update the frontend environment with the new factory and reputation IDs;
8. create and settle a small Testnet hunt, then record both transaction hashes.

The previous Level 2 factory stays independently verifiable. The Level 3
deployment uses new contract IDs because constructor state and instance WASM
are immutable for the existing contracts.

## Evidence required before release

- unit tests for reputation access control, replay protection, levels, and
  badges;
- integration tests proving factory registration and instance XP settlement;
- optimized WASM builds for all three contracts;
- a deployment manifest containing network, contract IDs, WASM hashes, ledger,
  and transaction hashes;
- explorer-verifiable Testnet calls;
- frontend event stream showing both hunt and XP events.

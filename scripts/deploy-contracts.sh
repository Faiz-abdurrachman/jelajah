#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
WASM_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"
DEPLOY_NETWORK="${STELLAR_NETWORK:-testnet}"
TESTNET_XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
ASSET_CONTRACT="${STELLAR_ASSET_CONTRACT:-$TESTNET_XLM_SAC}"
MANIFEST_PATH="${DEPLOY_MANIFEST_PATH:-$PROJECT_ROOT/deployments/testnet-latest.json}"

: "${STELLAR_ACCOUNT:?Set STELLAR_ACCOUNT to a funded Stellar CLI identity or secret key}"
: "${STELLAR_ADMIN_ADDRESS:?Set STELLAR_ADMIN_ADDRESS to the matching public G-address}"

if [[ "$DEPLOY_NETWORK" != "testnet" ]]; then
  echo "Refusing to deploy: this workflow is restricted to Stellar Testnet." >&2
  exit 1
fi

for command_name in cargo stellar jq sha256sum git; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is missing: $command_name" >&2
    exit 1
  fi
done

if [[ ! "$STELLAR_ADMIN_ADDRESS" =~ ^G[A-Z2-7]{55}$ ]]; then
  echo "STELLAR_ADMIN_ADDRESS is not a valid Stellar public account address." >&2
  exit 1
fi

if [[ ! "$ASSET_CONTRACT" =~ ^C[A-Z2-7]{55}$ ]]; then
  echo "STELLAR_ASSET_CONTRACT is not a valid Stellar contract address." >&2
  exit 1
fi

validate_contract_id() {
  local label="$1"
  local value="$2"
  if [[ ! "$value" =~ ^C[A-Z2-7]{55}$ ]]; then
    echo "$label did not return a valid contract ID." >&2
    exit 1
  fi
}

validate_wasm_hash() {
  local label="$1"
  local value="$2"
  if [[ ! "$value" =~ ^[0-9a-f]{64}$ ]]; then
    echo "$label did not return a valid 32-byte WASM hash." >&2
    exit 1
  fi
}

echo "Building and testing the production inter-contract set..."
(
  cd "$CONTRACTS_DIR"
  cargo fmt --all -- --check
  cargo test -p reputation --locked
  cargo test -p hunt-instance --locked
  cargo build --target wasm32v1-none --release --locked \
    -p hunt-instance -p reputation -p hunt-factory
  cargo test -p hunt-factory --features full-integration --locked
)

INSTANCE_WASM="$WASM_DIR/hunt_instance.wasm"
REPUTATION_WASM="$WASM_DIR/reputation.wasm"
FACTORY_WASM="$WASM_DIR/hunt_factory.wasm"

for wasm_file in "$INSTANCE_WASM" "$REPUTATION_WASM" "$FACTORY_WASM"; do
  if [[ ! -s "$wasm_file" ]]; then
    echo "Expected WASM artifact is missing: $wasm_file" >&2
    exit 1
  fi
done

echo "Uploading immutable WASM code to Stellar Testnet..."
INSTANCE_WASM_HASH="$(stellar --quiet contract upload \
  --network "$DEPLOY_NETWORK" --wasm "$INSTANCE_WASM" --optimize=false)"
REPUTATION_WASM_HASH="$(stellar --quiet contract upload \
  --network "$DEPLOY_NETWORK" --wasm "$REPUTATION_WASM" --optimize=false)"
FACTORY_WASM_HASH="$(stellar --quiet contract upload \
  --network "$DEPLOY_NETWORK" --wasm "$FACTORY_WASM" --optimize=false)"

validate_wasm_hash "hunt-instance upload" "$INSTANCE_WASM_HASH"
validate_wasm_hash "reputation upload" "$REPUTATION_WASM_HASH"
validate_wasm_hash "hunt-factory upload" "$FACTORY_WASM_HASH"

echo "Deploying Reputation and HuntFactory contract instances..."
REPUTATION_CONTRACT="$(stellar --quiet contract deploy \
  --network "$DEPLOY_NETWORK" --wasm-hash "$REPUTATION_WASM_HASH" \
  -- --admin "$STELLAR_ADMIN_ADDRESS")"
validate_contract_id "Reputation deployment" "$REPUTATION_CONTRACT"

FACTORY_CONTRACT="$(stellar --quiet contract deploy \
  --network "$DEPLOY_NETWORK" --wasm-hash "$FACTORY_WASM_HASH" \
  -- --instance_wasm_hash "$INSTANCE_WASM_HASH" \
  --asset "$ASSET_CONTRACT" --reputation "$REPUTATION_CONTRACT")"
validate_contract_id "HuntFactory deployment" "$FACTORY_CONTRACT"

echo "Authorizing the deployed factory in Reputation..."
CONFIGURE_OUTPUT="$(stellar contract invoke \
  --network "$DEPLOY_NETWORK" --id "$REPUTATION_CONTRACT" --send yes \
  -- set_factory --admin "$STELLAR_ADMIN_ADDRESS" --factory "$FACTORY_CONTRACT" 2>&1)"
printf '%s\n' "$CONFIGURE_OUTPUT"
CONFIGURE_TX_HASH="$(printf '%s\n' "$CONFIGURE_OUTPUT" \
  | grep -Eo '[0-9a-f]{64}' | tail -n 1 || true)"

STORED_FACTORY="$(stellar --quiet contract invoke \
  --network "$DEPLOY_NETWORK" --id "$REPUTATION_CONTRACT" --send no \
  -- get_factory | tr -d '"[:space:]')"
STORED_REPUTATION="$(stellar --quiet contract invoke \
  --network "$DEPLOY_NETWORK" --id "$FACTORY_CONTRACT" --send no \
  -- get_reputation | tr -d '"[:space:]')"

if [[ "$STORED_FACTORY" != "$FACTORY_CONTRACT" ]]; then
  echo "Post-deploy verification failed: Reputation stored a different factory." >&2
  exit 1
fi
if [[ "$STORED_REPUTATION" != "$REPUTATION_CONTRACT" ]]; then
  echo "Post-deploy verification failed: Factory stored a different Reputation contract." >&2
  exit 1
fi

mkdir -p "$(dirname "$MANIFEST_PATH")"
jq -n \
  --arg generated_at "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --arg network "$DEPLOY_NETWORK" \
  --arg git_commit "$(git -C "$PROJECT_ROOT" rev-parse HEAD)" \
  --arg admin "$STELLAR_ADMIN_ADDRESS" \
  --arg asset "$ASSET_CONTRACT" \
  --arg instance_hash "$INSTANCE_WASM_HASH" \
  --arg reputation_hash "$REPUTATION_WASM_HASH" \
  --arg factory_hash "$FACTORY_WASM_HASH" \
  --arg instance_sha "$(sha256sum "$INSTANCE_WASM" | cut -d' ' -f1)" \
  --arg reputation_sha "$(sha256sum "$REPUTATION_WASM" | cut -d' ' -f1)" \
  --arg factory_sha "$(sha256sum "$FACTORY_WASM" | cut -d' ' -f1)" \
  --arg reputation_id "$REPUTATION_CONTRACT" \
  --arg factory_id "$FACTORY_CONTRACT" \
  --arg configure_tx "$CONFIGURE_TX_HASH" \
  '{
    generated_at: $generated_at,
    network: $network,
    git_commit: $git_commit,
    admin_address: $admin,
    asset_contract: $asset,
    wasm: {
      hunt_instance: {ledger_hash: $instance_hash, local_sha256: $instance_sha},
      reputation: {ledger_hash: $reputation_hash, local_sha256: $reputation_sha},
      hunt_factory: {ledger_hash: $factory_hash, local_sha256: $factory_sha}
    },
    contracts: {
      reputation: $reputation_id,
      hunt_factory: $factory_id
    },
    configuration_transaction_hash: (
      if ($configure_tx | length) > 0 then $configure_tx else null end
    )
  }' > "$MANIFEST_PATH"

echo "Deployment verified. Manifest written to: $MANIFEST_PATH"
echo "HuntFactory: $FACTORY_CONTRACT"
echo "Reputation: $REPUTATION_CONTRACT"

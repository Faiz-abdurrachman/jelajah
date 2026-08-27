# Contract deployment records

`scripts/deploy-contracts.sh` writes a verified Testnet manifest here when run
locally. The manual GitHub Actions workflow writes the same manifest to a
downloadable workflow artifact.

The manifest records:

- Git commit and deployment timestamp;
- network, administrator, and native XLM asset contract;
- local SHA-256 and on-ledger hash for each production WASM;
- deployed HuntFactory and Reputation contract IDs;
- the factory configuration transaction hash when exposed by Stellar CLI.

## Local Testnet deployment

Use a funded identity already stored by Stellar CLI. Do not put a secret key in
the repository or a shell history entry.

```bash
export STELLAR_ACCOUNT=your-local-identity-name
export STELLAR_ADMIN_ADDRESS=G_YOUR_PUBLIC_ADDRESS
./scripts/deploy-contracts.sh
```

The script refuses non-Testnet networks, validates every returned address/hash,
runs all inter-contract tests before uploading code, and verifies the stored
Factory ↔ Reputation relationship after deployment.

## GitHub Environment secrets

Create a protected GitHub Environment named `testnet`, require reviewer
approval, and add:

- `STELLAR_TESTNET_SECRET_KEY`
- `STELLAR_TESTNET_PUBLIC_KEY`

Then run **Deploy contracts to Testnet** manually and type `DEPLOY TESTNET` in
the confirmation input. The deployer should be a dedicated, funded Testnet
account with no Mainnet funds.

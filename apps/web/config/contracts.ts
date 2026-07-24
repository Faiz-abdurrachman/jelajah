// JELAJAH — Contract Addresses
// Update addresses setelah deploy ke testnet/mainnet

export const CONTRACTS = {
  huntFactory: process.env.NEXT_PUBLIC_HUNT_FACTORY ?? "",
  reputation: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT ?? "",
  dispute: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT ?? "",
  questChain: process.env.NEXT_PUBLIC_QUEST_CHAIN_CONTRACT ?? "",
  huntInstanceWasmHash: process.env.NEXT_PUBLIC_HUNT_INSTANCE_WASM_HASH ?? "",
} as const;

export function isContractDeployed(address: string): boolean {
  return address.length > 0;
}

export function isHuntFactoryDeployed(): boolean {
  return isContractDeployed(CONTRACTS.huntFactory);
}

export function isReputationDeployed(): boolean {
  return isContractDeployed(CONTRACTS.reputation);
}

export function isDisputeDeployed(): boolean {
  return isContractDeployed(CONTRACTS.dispute);
}

export function isQuestChainDeployed(): boolean {
  return isContractDeployed(CONTRACTS.questChain);
}

// JELAJAH — Contract Addresses

export const CONTRACTS = {
  huntFactory: process.env.NEXT_PUBLIC_HUNT_FACTORY ?? "",
  reputation: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT ?? "",
} as const;

export function isContractDeployed(address: string): boolean {
  return address.length > 0 && address !== "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
}

export function isHuntFactoryDeployed(): boolean {
  return isContractDeployed(CONTRACTS.huntFactory);
}

export function isReputationDeployed(): boolean {
  return isContractDeployed(CONTRACTS.reputation);
}

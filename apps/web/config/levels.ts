// JELAJAH — Level & Feature Gate Definitions

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LevelConfig {
  level: Level;
  name: string;
  belt: string;
  description: string;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, name: "White", belt: "putih", description: "Landing, Wallet, Map, Profile" },
  { level: 2, name: "Yellow", belt: "kuning", description: "Create & Claim Hunt" },
  { level: 3, name: "Orange", belt: "oranye", description: "Quest, Dispute, Verifier" },
  { level: 4, name: "Green", belt: "hijau", description: "Brand Dashboard, Leaderboard" },
  { level: 5, name: "Blue", belt: "biru", description: "Community, Streak, Badges" },
  { level: 6, name: "Black", belt: "hitam", description: "Mainnet, Security Audit" },
  { level: 7, name: "Master", belt: "master", description: "API/SDK, Enterprise" },
];

export type FeatureKey =
  | "landing"
  | "map"
  | "profile"
  | "wallet"
  | "hunt-detail"
  | "hunt-create"
  | "hunt-claim"
  | "quest-chain"
  | "verifier-dashboard"
  | "dispute"
  | "settings"
  | "brand-dashboard"
  | "leaderboard"
  | "community-feed"
  | "api-sdk";

export interface FeatureDefinition {
  key: FeatureKey;
  requiredLevel: Level;
  route: string;
  description: string;
}

export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  landing: { key: "landing", requiredLevel: 1, route: "/", description: "Landing page + Connect Wallet" },
  map: { key: "map", requiredLevel: 1, route: "/map", description: "Map view with hunt markers" },
  profile: { key: "profile", requiredLevel: 1, route: "/profile", description: "User profile & stats" },
  wallet: { key: "wallet", requiredLevel: 1, route: "/wallet", description: "Wallet balance & tx history" },
  "hunt-detail": { key: "hunt-detail", requiredLevel: 2, route: "/hunt/[id]", description: "Hunt detail & claim" },
  "hunt-create": { key: "hunt-create", requiredLevel: 2, route: "/hunt/create", description: "Create new hunt" },
  "hunt-claim": { key: "hunt-claim", requiredLevel: 2, route: "/hunt/claim/[id]", description: "Claim hunt flow" },
  "quest-chain": { key: "quest-chain", requiredLevel: 3, route: "/quest/[id]", description: "Multi-step quest chain" },
  "verifier-dashboard": { key: "verifier-dashboard", requiredLevel: 3, route: "/verify", description: "Verifier dashboard" },
  dispute: { key: "dispute", requiredLevel: 3, route: "/dispute/[id]", description: "Dispute detail & appeal" },
  settings: { key: "settings", requiredLevel: 3, route: "/settings", description: "Settings page" },
  "brand-dashboard": { key: "brand-dashboard", requiredLevel: 4, route: "/brand/*", description: "Brand dashboard" },
  leaderboard: { key: "leaderboard", requiredLevel: 4, route: "/leaderboard", description: "Leaderboard" },
  "community-feed": { key: "community-feed", requiredLevel: 5, route: "/community", description: "Community feed" },
  "api-sdk": { key: "api-sdk", requiredLevel: 7, route: "/api/*", description: "Developer API" },
};

export function getCurrentLevel(): Level {
  const envLevel = process.env.NEXT_PUBLIC_CURRENT_LEVEL;
  if (!envLevel) return 1;
  const parsed = parseInt(envLevel, 10);
  if (parsed >= 1 && parsed <= 7) return parsed as Level;
  return 1;
}

export function isFeatureUnlocked(featureKey: FeatureKey): boolean {
  const currentLevel = getCurrentLevel();
  const feature = FEATURES[featureKey];
  return currentLevel >= feature.requiredLevel;
}

export function getLevelName(level: Level): string {
  const config = LEVELS.find((l) => l.level === level);
  return config ? `${config.name} Belt (L${level})` : `Level ${level}`;
}

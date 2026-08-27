// JELAJAH — Platform Constants
// Semua magic numbers di sini, jangan di-hardcode di komponen

// Network
export const NETWORKS = {
  testnet: {
    name: "Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    rpcUrl: "https://soroban-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
  },
  mainnet: {
    name: "Public",
    horizonUrl: "https://horizon.stellar.org",
    rpcUrl: "https://soroban.stellar.org",
    passphrase: "Public Global Stellar Network ; September 2015",
  },
} as const;

// Hunt Rules
export const HUNT_RULES = {
  minReward: 1,
  maxRewardFree: 100,
  minDeadlineHours: 1,
  maxDeadlineDays: 30,
  minGpsRadius: 10,
  maxGpsRadius: 100,
  claimTimerHours: 24,
  appealTimerHours: 48,
} as const;

// Fees
export const FEES = {
  disputeFeePercent: 5,
  appealFee: 100_000,
  verifierFeeShare: 60,
  platformFeeShare: 25,
  treasuryFeeShare: 15,
} as const;

// Verifier
export const VERIFIER_RULES = {
  minStake: 5_000,
  minCompletedHunts: 10,
  minReputationScore: 1_000,
  slashMinority: 10,
  slashNoReview: 25,
  slashCollusion: 100,
  requiredVotes: 2,
  requiredAppealVotes: 3,
} as const;

// XP & Levels
export const XP_RULES = {
  claimHunt: 100,
  createHunt: 30,
  huntClaimedByOthers: 20,
  verifyDispute: 50,
  referralFirstClaim: 200,
  loginStreakDaily: 10,
  loginStreakMax: 7,
} as const;

export const XP_THRESHOLDS = [
  { level: 1, xpRequired: 0, title: "Beginner" },
  { level: 2, xpRequired: 500, title: "Explorer" },
  { level: 3, xpRequired: 2_000, title: "Tracker" },
  { level: 4, xpRequired: 5_000, title: "Hunter" },
  { level: 5, xpRequired: 15_000, title: "Elite Hunter" },
  { level: 6, xpRequired: 50_000, title: "Legend" },
] as const;

// Badges
export const BADGES = [
  { id: 1, name: "First Blood", description: "Claim hunt pertama" },
  { id: 2, name: "Speed Demon", description: "Claim dalam 10 menit" },
  { id: 3, name: "Explorer", description: "5 hunt claimed" },
  { id: 4, name: "Mapper", description: "5 quest chain selesai" },
  { id: 5, name: "Philanthropist", description: "Rp 5jt total dibuat" },
  { id: 6, name: "Detective", description: "10 puzzle hunt selesai" },
  { id: 7, name: "Justice", description: "50 dispute selesai" },
  { id: 8, name: "Legend", description: "Semua badge sebelumnya" },
] as const;

// Brand Tiers
export const BRAND_TIERS = {
  basic: {
    name: "Basic",
    price: 0,
    maxHuntsPerCampaign: 3,
    hasAnalytics: false,
    hasCustomBranding: false,
    hasPrioritySupport: false,
    hasApiAccess: false,
  },
  pro: {
    name: "Pro",
    price: 500_000,
    maxHuntsPerCampaign: 20,
    hasAnalytics: true,
    hasCustomBranding: true,
    hasPrioritySupport: true,
    hasApiAccess: false,
  },
  enterprise: {
    name: "Enterprise",
    price: -1,
    maxHuntsPerCampaign: -1,
    hasAnalytics: true,
    hasCustomBranding: true,
    hasPrioritySupport: true,
    hasApiAccess: true,
  },
} as const;

// Stellar
export const STELLAR_CONFIG = {
  claimableBalanceMinXlm: 0.01,
  networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? NETWORKS.testnet.passphrase,
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? NETWORKS.testnet.horizonUrl,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? NETWORKS.testnet.rpcUrl,
} as const;

// IPFS
export const IPFS_CONFIG = {
  gateway: process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud",
} as const;

// Map
export const MAP_CONFIG = {
  defaultZoom: 12,
  minZoom: 3,
  maxZoom: 18,
  defaultCenter: { lat: -6.2088, lng: 106.8456 },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  walletNotFound: "Wallet tidak ditemukan. Install Freighter atau pilih Albedo web wallet.",
  walletRejected: "Koneksi wallet ditolak.",
  insufficientBalance: "Saldo tidak mencukupi.",
  gpsNotInRadius: "Kamu belum berada dalam radius hunt.",
  huntExpired: "Hunt ini sudah kadaluwarsa.",
  alreadyClaimed: "Hunt ini sudah di-claim.",
  duplicateClaim: "Kamu sudah pernah claim hunt ini.",
  networkError: "Terjadi kesalahan jaringan. Coba lagi.",
  transactionFailed: "Transaksi gagal. Coba lagi.",
} as const;

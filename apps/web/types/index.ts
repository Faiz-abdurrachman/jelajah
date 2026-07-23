// JELAJAH — Shared TypeScript Types

import type { HuntStatus, ClaimStatus, DisputeStatus, HuntType } from "@/config/hunt-types";

// ─── User ──────────────────────────────────────────────

export interface User {
  publicKey: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  level: number;
  xp: number;
  isVerifiedHider: boolean;
  isBrand: boolean;
  createdAt: string;
}

// ─── Hunt ──────────────────────────────────────────────

export interface Hunt {
  id: number;
  contractId: string | null;
  hiderPubkey: string;
  huntType: HuntType;
  clue: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  amountStroops: number | null;
  deadline: string;
  status: HuntStatus;
  photoCid: string | null;
  createdAt: string;
  hider?: User;
}

// ─── Claim ─────────────────────────────────────────────

export interface Claim {
  id: number;
  huntId: number;
  hunterPubkey: string;
  photoCid: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  status: ClaimStatus;
  submittedAt: string;
  resolvedAt: string | null;
  hunter?: User;
  hunt?: Hunt;
}

// ─── Dispute ───────────────────────────────────────────

export interface Dispute {
  id: number;
  claimId: number;
  reason: string;
  verifiers: string[];
  votes: string[];
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  claim?: Claim;
}

// ─── Verifier ──────────────────────────────────────────

export interface Verifier {
  publicKey: string;
  stake: number;
  disputesHandled: number;
  disputeFeeEarned: number;
  isActive: boolean;
}

// ─── Brand ─────────────────────────────────────────────

export type BrandTier = "basic" | "pro" | "enterprise";

export interface Brand {
  publicKey: string;
  companyName: string;
  subscriptionTier: BrandTier;
  subscriptionEnd: string | null;
  totalCampaigns: number;
}

// ─── Badge ─────────────────────────────────────────────

export interface Badge {
  id: number;
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

// ─── Notification ──────────────────────────────────────

export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Stellar ───────────────────────────────────────────

export interface WalletBalance {
  xlm: string;
  usdc: string;
}

export interface Transaction {
  hash: string;
  type: string;
  amount: string;
  asset: string;
  timestamp: string;
  success: boolean;
}

// ─── Map ───────────────────────────────────────────────

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface HuntMarker {
  hunt: Hunt;
  coordinates: MapCoordinates;
}

// ─── Quest ─────────────────────────────────────────────

export interface QuestStep {
  stepNumber: number;
  clueHash: string;
  gpsLat: number;
  gpsLng: number;
  radius: number;
  isFinal: boolean;
  completed?: boolean;
}

// ─── Feature Gate ──────────────────────────────────────

export interface FeatureGateProps {
  featureKey: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// ─── API ───────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

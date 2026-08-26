// JELAJAH — Supabase Client
// Singleton client untuk koneksi ke Supabase PostgreSQL

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[JELAJAH] Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: "public",
    },
  }
);

// ─── Helper Queries ───────────────────────────────────

import type { User, Hunt, Notification, Verifier, Brand } from "@/types";

/**
 * Get or create user by Stellar public key.
 * Upsert pattern: insert if not exists, return existing if found.
 */
export async function getOrCreateUser(publicKey: string): Promise<User | null> {
  // Try to get existing
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("public_key", publicKey)
    .single();

  if (existing) return existing;

  // Create new
  const { data: newUser } = await supabase
    .from("users")
    .insert({ public_key: publicKey })
    .select()
    .single();

  return newUser;
}

/**
 * Get active hunts (not expired) for map display.
 */
export async function getActiveHunts() {
  const { data } = await supabase
    .from("hunts")
    .select("*, hider:users!hunts_hider_pubkey_fkey(*)")
    .eq("status", "active")
    .gt("deadline", new Date().toISOString())
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get a single hunt by ID with hider info.
 */
export async function getHuntById(huntId: number) {
  const { data } = await supabase
    .from("hunts")
    .select("*, hider:users!hunts_hider_pubkey_fkey(*)")
    .eq("id", huntId)
    .single();

  return data;
}

/**
 * Get hunts created by a specific user.
 */
export async function getUserHunts(
  publicKey: string,
  limit = 10,
  offset = 0
) {
  const { data } = await supabase
    .from("hunts")
    .select("*")
    .eq("hider_pubkey", publicKey)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return data ?? [];
}

/**
 * Get claims for a specific hunter.
 */
export async function getUserClaims(
  publicKey: string,
  limit = 10,
  offset = 0
) {
  const { data } = await supabase
    .from("claims")
    .select("*, hunt:hunts(*)")
    .eq("hunter_pubkey", publicKey)
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return data ?? [];
}

/**
 * Subscribe to new hunts in realtime.
 */
export function subscribeToNewHunts(callback: (hunt: Hunt) => void) {
  return supabase
    .channel("hunts-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hunts",
        filter: "status=eq.active",
      },
      (payload) => {
        callback(payload.new as Hunt);
      }
    )
    .subscribe();
}

/**
 * Subscribe to notifications for a user.
 */
export function subscribeToNotifications(
  publicKey: string,
  callback: (notification: Notification) => void
) {
  return supabase
    .channel(`notifications-${publicKey}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_pubkey=eq.${publicKey}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();
}

// ─── L3 Query Helpers ─────────────────────────────────

/**
 * Get all quest-type hunts (multi-step).
 */
export async function getAllQuests() {
  const { data } = await supabase
    .from("hunts")
    .select("*, hider:users!hunts_hider_pubkey_fkey(*)")
    .eq("hunt_type", "quest")
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get disputes assigned to a verifier or all disputes.
 */
export async function getDisputes(verifierPubkey?: string) {
  let query = supabase
    .from("disputes")
    .select("*, claim:claims(*, hunt:hunts(*))")
    .order("created_at", { ascending: false });

  if (verifierPubkey) {
    query = query.contains("verifiers", [verifierPubkey]);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Get verifier stats for dashboard.
 */
export async function getVerifierStats(publicKey: string) {
  const { data } = await supabase
    .from("verifiers")
    .select("*")
    .eq("public_key", publicKey)
    .single();

  return data as Verifier | null;
}

/**
 * Get leaderboard data — top hunters by reputation score.
 */
export async function getLeaderboard(limit = 50) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("reputation_score", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Get community activities feed.
 */
export async function getCommunityActivities(limit = 30) {
  const { data } = await supabase
    .from("community_activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Check if a user is registered as a brand.
 */
export async function getBrandProfile(publicKey: string) {
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("public_key", publicKey)
    .single();

  return data as Brand | null;
}

/**
 * Register a new brand.
 */
export async function registerBrand(publicKey: string, companyName: string) {
  const { data, error } = await supabase
    .from("brands")
    .insert({
      public_key: publicKey,
      company_name: companyName,
      subscription_tier: "basic",
      total_campaigns: 0,
      total_spent: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Register a user as a verifier.
 */
export async function applyAsVerifier(publicKey: string) {
  const { data, error } = await supabase
    .from("verifiers")
    .insert({ public_key: publicKey, stake: 0, disputes_handled: 0, dispute_fee_earned: 0, is_active: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Subscribe to community activities in realtime.
 */
export function subscribeToCommunityActivities(callback: (activity: Record<string, unknown>) => void) {
  return supabase
    .channel("community-activities")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "community_activities" },
      (payload) => { callback(payload.new as Record<string, unknown>); }
    )
    .subscribe();
}

// ─── Write Helpers ───────────────────────────────────

/**
 * Insert a new hunt record after contract deployment.
 */
export async function insertHunt(params: {
  contractId: string;
  hiderPubkey: string;
  huntType: string;
  clue: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  amountStroops: number;
  deadline: string;
  photoCid?: string | null;
}): Promise<number> {
  const { data, error } = await supabase
    .from("hunts")
    .insert({
      contract_id: params.contractId,
      hider_pubkey: params.hiderPubkey,
      hunt_type: params.huntType,
      clue: params.clue,
      latitude: params.latitude,
      longitude: params.longitude,
      radius_meters: params.radiusMeters,
      amount_stroops: params.amountStroops,
      deadline: params.deadline,
      photo_cid: params.photoCid ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as number;
}

/**
 * Insert a new claim for a hunt.
 */
export async function insertClaim(params: {
  huntId: number;
  hunterPubkey: string;
  photoCid: string | null;
  gpsLat: number;
  gpsLng: number;
  txHash: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from("claims")
    .insert({
      hunt_id: params.huntId,
      hunter_pubkey: params.hunterPubkey,
      photo_cid: params.photoCid,
      gps_lat: params.gpsLat,
      gps_lng: params.gpsLng,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as number;
}

/**
 * Update claim status (approve/reject by hider).
 */
export async function updateClaimStatus(claimId: number, status: "approved" | "rejected"): Promise<void> {
  const { error } = await supabase
    .from("claims")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", claimId);

  if (error) throw error;
}

/**
 * Create a new brand campaign.
 */
export async function createCampaign(params: {
  brandPubkey: string;
  name: string;
  description: string | null;
  budget: number;
  startDate: string;
  endDate: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      brand_pubkey: params.brandPubkey,
      name: params.name,
      description: params.description,
      budget: params.budget,
      start_date: params.startDate,
      end_date: params.endDate,
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as number;
}

/**
 * Get pending claims for a specific hunt (hider view).
 */
export async function getPendingClaims(huntId: number) {
  const { data } = await supabase
    .from("claims")
    .select("*, hunter:users!claims_hunter_pubkey_fkey(*)")
    .eq("hunt_id", huntId)
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  return data ?? [];
}

/**
 * Get all claims for a specific hunt.
 */
export async function getClaimsByHunt(huntId: number) {
  const { data } = await supabase
    .from("claims")
    .select("*, hunter:users!claims_hunter_pubkey_fkey(*)")
    .eq("hunt_id", huntId)
    .order("submitted_at", { ascending: false });

  return data ?? [];
}

/**
 * Insert a new dispute record.
 */
export async function insertDispute(params: {
  claimId: number;
  huntId: number;
  reason: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from("disputes")
    .insert({
      claim_id: params.claimId,
      hunt_id: params.huntId,
      reason: params.reason,
      status: "voting",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as number;
}

/**
 * Get all disputes for a specific hunt.
 */
export async function getDisputesByHunt(huntId: number) {
  const { data } = await supabase
    .from("disputes")
    .select("*, claim:claims(*)")
    .eq("hunt_id", huntId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get active verifiers for dispute assignment.
 */
export async function getActiveVerifiers() {
  const { data } = await supabase
    .from("verifiers")
    .select("*")
    .eq("is_active", true)
    .order("disputes_handled", { ascending: true });

  return data ?? [];
}


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
export async function getUserHunts(publicKey: string) {
  const { data } = await supabase
    .from("hunts")
    .select("*")
    .eq("hider_pubkey", publicKey)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get claims for a specific hunter.
 */
export async function getUserClaims(publicKey: string) {
  const { data } = await supabase
    .from("claims")
    .select("*, hunt:hunts(*)")
    .eq("hunter_pubkey", publicKey)
    .order("submitted_at", { ascending: false });

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

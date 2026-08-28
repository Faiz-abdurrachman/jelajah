import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CampaignStatus =
  | "draft"
  | "funding"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface BrandProfileDto {
  companyName: string;
  subscriptionTier: string;
  totalCampaigns: number;
  totalSpentStroops: number;
  createdAt: string;
}

export interface CampaignHuntDto {
  id: number;
  status: string;
  amountStroops: number;
  contractId: string;
  transactionHash: string;
  deadline: string;
}

export interface CampaignDto {
  id: number;
  name: string;
  description: string | null;
  budgetStroops: number;
  fundedStroops: number;
  assetCode: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  hunts: CampaignHuntDto[];
}

export type PilotRole = "sponsor" | "hunter";

export interface PilotInteractionDto {
  transactionHash: string;
  action: string;
  contractId: string | null;
  ledger: number | null;
  confirmedAt: string;
}

export interface PilotStatusDto {
  onboarding: null | {
    role: PilotRole;
    currentStep: string;
    consentVersion: string;
    consentedAt: string;
    completedAt: string | null;
  };
  interactions: PilotInteractionDto[];
  feedbackSubmitted: boolean;
}

export interface PilotSummaryDto {
  qualifiedUsers: number;
  onboardedUsers: number;
  completedUsers: number;
  verifiedInteractions: number;
  feedbackResponses: number;
  averages: {
    onboarding: number | null;
    transactionClarity: number | null;
    usability: number | null;
    understoodRewardTimingPercent: number | null;
    wouldUseAgainPercent: number | null;
  };
  recentTransactions: Array<{
    transactionHash: string;
    action: string;
    ledger: number | null;
    confirmedAt: string;
  }>;
  generatedAt: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toSafeInteger(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

export async function ensureLevel4User(publicKey: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("users")
    .upsert({ public_key: publicKey }, { onConflict: "public_key" });
  if (error) throw error;
}

export async function getBrandProfileDto(publicKey: string): Promise<BrandProfileDto | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("brands")
    .select("company_name, subscription_tier, total_campaigns, total_spent, created_at")
    .eq("public_key", publicKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    companyName: String(data.company_name),
    subscriptionTier: String(data.subscription_tier),
    totalCampaigns: toSafeInteger(data.total_campaigns),
    totalSpentStroops: toSafeInteger(data.total_spent),
    createdAt: String(data.created_at),
  };
}

export async function registerBrandProfile(
  publicKey: string,
  companyName: string
): Promise<BrandProfileDto> {
  const db = getSupabaseAdmin();
  await ensureLevel4User(publicKey);

  const { error: brandError } = await db.from("brands").upsert(
    {
      public_key: publicKey,
      company_name: companyName,
      subscription_tier: "basic",
    },
    { onConflict: "public_key" }
  );
  if (brandError) throw brandError;

  const { error: userError } = await db
    .from("users")
    .update({ is_brand: true })
    .eq("public_key", publicKey);
  if (userError) throw userError;

  const profile = await getBrandProfileDto(publicKey);
  if (!profile) throw new Error("Brand profile was not created");
  return profile;
}

export async function listCampaignsForSponsor(publicKey: string): Promise<CampaignDto[]> {
  const db = getSupabaseAdmin();
  const { data: campaignRows, error } = await db
    .from("campaigns")
    .select(
      "id, name, description, budget_stroops, funded_stroops, asset_code, status, start_date, end_date, created_at"
    )
    .eq("brand_pubkey", publicKey)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!campaignRows?.length) return [];

  const campaignIds = campaignRows.map((campaign) => Number(campaign.id));
  const { data: linkRows, error: linkError } = await db
    .from("campaign_hunts")
    .select(
      "campaign_id, hunts(id, status, amount_stroops, contract_id, create_tx_hash, deadline)"
    )
    .in("campaign_id", campaignIds);
  if (linkError) throw linkError;

  const huntsByCampaign = new Map<number, CampaignHuntDto[]>();
  for (const link of linkRows ?? []) {
    const campaignId = Number(link.campaign_id);
    const relation = Array.isArray(link.hunts) ? link.hunts[0] : link.hunts;
    const hunt = asRecord(relation);
    if (!hunt.id) continue;
    const current = huntsByCampaign.get(campaignId) ?? [];
    current.push({
      id: Number(hunt.id),
      status: String(hunt.status),
      amountStroops: toSafeInteger(hunt.amount_stroops),
      contractId: String(hunt.contract_id),
      transactionHash: String(hunt.create_tx_hash),
      deadline: String(hunt.deadline),
    });
    huntsByCampaign.set(campaignId, current);
  }

  return campaignRows.map((campaign) => ({
    id: Number(campaign.id),
    name: String(campaign.name),
    description: campaign.description ? String(campaign.description) : null,
    budgetStroops: toSafeInteger(campaign.budget_stroops),
    fundedStroops: toSafeInteger(campaign.funded_stroops),
    assetCode: String(campaign.asset_code),
    status: String(campaign.status) as CampaignStatus,
    startDate: String(campaign.start_date),
    endDate: String(campaign.end_date),
    createdAt: String(campaign.created_at),
    hunts: huntsByCampaign.get(Number(campaign.id)) ?? [],
  }));
}

export async function createSponsorCampaign(input: {
  publicKey: string;
  name: string;
  description: string | null;
  budgetStroops: number;
  startDate: string;
  endDate: string;
}): Promise<CampaignDto> {
  const db = getSupabaseAdmin();
  const profile = await getBrandProfileDto(input.publicKey);
  if (!profile) throw new Error("BRAND_REQUIRED");

  const { data, error } = await db
    .from("campaigns")
    .insert({
      brand_pubkey: input.publicKey,
      name: input.name,
      description: input.description,
      budget: input.budgetStroops,
      budget_stroops: input.budgetStroops,
      funded_stroops: 0,
      asset_code: "XLM",
      asset_contract: process.env.NEXT_PUBLIC_XLM_ASSET_CONTRACT ?? null,
      start_date: input.startDate,
      end_date: input.endDate,
      status: "draft",
    })
    .select(
      "id, name, description, budget_stroops, funded_stroops, asset_code, status, start_date, end_date, created_at"
    )
    .single();
  if (error) throw error;

  await db.from("audit_log").insert({
    action: "campaign_created",
    actor_pubkey: input.publicKey,
    entity_type: "campaign",
    entity_id: String(data.id),
    details: { asset: "XLM", budget_stroops: input.budgetStroops },
  });

  return {
    id: Number(data.id),
    name: String(data.name),
    description: data.description ? String(data.description) : null,
    budgetStroops: toSafeInteger(data.budget_stroops),
    fundedStroops: toSafeInteger(data.funded_stroops),
    assetCode: String(data.asset_code),
    status: String(data.status) as CampaignStatus,
    startDate: String(data.start_date),
    endDate: String(data.end_date),
    createdAt: String(data.created_at),
    hunts: [],
  };
}

export async function linkHuntToSponsorCampaign(input: {
  publicKey: string;
  campaignId: number;
  huntId: number;
}): Promise<{ fundedStroops: number; huntCount: number; status: CampaignStatus }> {
  const db = getSupabaseAdmin();
  const { data: campaign } = await db
    .from("campaigns")
    .select("id, brand_pubkey, status")
    .eq("id", input.campaignId)
    .maybeSingle();
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (campaign.brand_pubkey !== input.publicKey) throw new Error("FORBIDDEN");
  if (["completed", "cancelled"].includes(String(campaign.status))) {
    throw new Error("CAMPAIGN_CLOSED");
  }

  const { data: hunt } = await db
    .from("hunts")
    .select("id, hider_pubkey")
    .eq("id", input.huntId)
    .maybeSingle();
  if (!hunt) throw new Error("HUNT_NOT_FOUND");
  if (hunt.hider_pubkey !== input.publicKey) throw new Error("FORBIDDEN");

  const { error: linkError } = await db.from("campaign_hunts").upsert(
    { campaign_id: input.campaignId, hunt_id: input.huntId },
    { onConflict: "campaign_id,hunt_id", ignoreDuplicates: true }
  );
  if (linkError) throw linkError;

  const { data: links, error: linksError } = await db
    .from("campaign_hunts")
    .select("hunt_id, hunts(amount_stroops)")
    .eq("campaign_id", input.campaignId);
  if (linksError) throw linksError;

  const fundedStroops = (links ?? []).reduce((total, link) => {
    const relation = Array.isArray(link.hunts) ? link.hunts[0] : link.hunts;
    return total + toSafeInteger(asRecord(relation).amount_stroops);
  }, 0);
  const status: CampaignStatus = fundedStroops > 0 ? "active" : "funding";
  const { error: campaignError } = await db
    .from("campaigns")
    .update({ funded_stroops: fundedStroops, status, updated_at: new Date().toISOString() })
    .eq("id", input.campaignId)
    .eq("brand_pubkey", input.publicKey);
  if (campaignError) throw campaignError;

  const { data: sponsorCampaigns } = await db
    .from("campaigns")
    .select("funded_stroops")
    .eq("brand_pubkey", input.publicKey)
    .in("status", ["active", "paused", "completed"]);
  const totalSpent = (sponsorCampaigns ?? []).reduce(
    (total, row) => total + toSafeInteger(row.funded_stroops),
    0
  );
  const { error: brandError } = await db
    .from("brands")
    .update({ total_campaigns: sponsorCampaigns?.length ?? 0, total_spent: totalSpent })
    .eq("public_key", input.publicKey);
  if (brandError) throw brandError;

  await db.from("audit_log").insert({
    action: "campaign_hunt_linked",
    actor_pubkey: input.publicKey,
    entity_type: "campaign",
    entity_id: String(input.campaignId),
    details: { hunt_id: input.huntId, funded_stroops: fundedStroops },
  });

  return { fundedStroops, huntCount: links?.length ?? 0, status };
}

export async function recordWalletInteraction(input: {
  transactionHash: string;
  publicKey: string;
  action: string;
  contractId: string | null;
  ledger: number;
  confirmedAt: string;
}): Promise<boolean> {
  const { error } = await getSupabaseAdmin().from("wallet_interactions").upsert(
    {
      transaction_hash: input.transactionHash.toLowerCase(),
      public_key: input.publicKey,
      action: input.action,
      contract_id: input.contractId,
      ledger: input.ledger,
      confirmed_at: input.confirmedAt,
      network: "testnet",
      status: "confirmed",
    },
    { onConflict: "transaction_hash" }
  );
  if (error) {
    console.error("Unable to record Level 4 wallet interaction", error.message);
    return false;
  }
  return true;
}

export async function getPilotStatus(publicKey: string): Promise<PilotStatusDto> {
  const db = getSupabaseAdmin();
  const [onboardingResult, interactionResult, feedbackResult] = await Promise.all([
    db
      .from("onboarding_sessions")
      .select("role, current_step, consent_version, consented_at, completed_at")
      .eq("public_key", publicKey)
      .maybeSingle(),
    db
      .from("wallet_interactions")
      .select("transaction_hash, action, contract_id, ledger, confirmed_at")
      .eq("public_key", publicKey)
      .order("confirmed_at", { ascending: false })
      .limit(20),
    db
      .from("feedback_submissions")
      .select("id")
      .eq("public_key", publicKey)
      .limit(1),
  ]);
  if (onboardingResult.error) throw onboardingResult.error;
  if (interactionResult.error) throw interactionResult.error;
  if (feedbackResult.error) throw feedbackResult.error;

  const onboarding = onboardingResult.data;
  return {
    onboarding: onboarding
      ? {
          role: String(onboarding.role) as PilotRole,
          currentStep: String(onboarding.current_step),
          consentVersion: String(onboarding.consent_version),
          consentedAt: String(onboarding.consented_at),
          completedAt: onboarding.completed_at ? String(onboarding.completed_at) : null,
        }
      : null,
    interactions: (interactionResult.data ?? []).map((interaction) => ({
      transactionHash: String(interaction.transaction_hash),
      action: String(interaction.action),
      contractId: interaction.contract_id ? String(interaction.contract_id) : null,
      ledger: interaction.ledger === null ? null : toSafeInteger(interaction.ledger),
      confirmedAt: String(interaction.confirmed_at),
    })),
    feedbackSubmitted: Boolean(feedbackResult.data?.length),
  };
}

export async function startPilotOnboarding(input: {
  publicKey: string;
  role: PilotRole;
  consentVersion: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  await ensureLevel4User(input.publicKey);
  const { error } = await db.from("onboarding_sessions").upsert(
    {
      public_key: input.publicKey,
      role: input.role,
      consent_version: input.consentVersion,
      current_step: "pilot_started",
      consented_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "public_key" }
  );
  if (error) throw error;
}

export async function completePilotOnboarding(publicKey: string): Promise<void> {
  const completedAt = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("onboarding_sessions")
    .update({ current_step: "pilot_completed", completed_at: completedAt, updated_at: completedAt })
    .eq("public_key", publicKey)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("ONBOARDING_REQUIRED");
}

export async function submitPilotFeedback(input: {
  publicKey: string;
  role: PilotRole;
  onboardingRating: number;
  transactionClarityRating: number;
  usabilityRating: number;
  understoodRewardTiming: boolean;
  wouldUseAgain: boolean;
  confusion: string | null;
  suggestion: string | null;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await db
    .from("feedback_submissions")
    .select("id")
    .eq("public_key", input.publicKey)
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing?.length) throw new Error("FEEDBACK_ALREADY_SUBMITTED");

  const { error } = await db.from("feedback_submissions").insert({
    public_key: input.publicKey,
    role: input.role,
    onboarding_rating: input.onboardingRating,
    transaction_clarity_rating: input.transactionClarityRating,
    usability_rating: input.usabilityRating,
    understood_reward_timing: input.understoodRewardTiming,
    would_use_again: input.wouldUseAgain,
    confusion: input.confusion,
    suggestion: input.suggestion,
    consent_to_anonymous_use: true,
  });
  if (error) throw error;
}

export async function getPublicPilotSummary(): Promise<PilotSummaryDto> {
  const db = getSupabaseAdmin();
  const [onboardingResult, interactionResult, feedbackResult] = await Promise.all([
    db.from("onboarding_sessions").select("public_key, completed_at").limit(1000),
    db
      .from("wallet_interactions")
      .select("transaction_hash, public_key, action, ledger, confirmed_at")
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false })
      .limit(1000),
    db
      .from("feedback_submissions")
      .select(
        "public_key, onboarding_rating, transaction_clarity_rating, usability_rating, understood_reward_timing, would_use_again"
      )
      .limit(1000),
  ]);
  if (onboardingResult.error) throw onboardingResult.error;
  if (interactionResult.error) throw interactionResult.error;
  if (feedbackResult.error) throw feedbackResult.error;

  const onboardedWallets = new Set(
    (onboardingResult.data ?? []).map((row) => String(row.public_key))
  );
  const completedWallets = new Set(
    (onboardingResult.data ?? [])
      .filter((row) => Boolean(row.completed_at))
      .map((row) => String(row.public_key))
  );
  const interactionWallets = new Set(
    (interactionResult.data ?? []).map((row) => String(row.public_key))
  );
  const qualifiedUsers = [...onboardedWallets].filter((wallet) => interactionWallets.has(wallet)).length;
  const feedbackRows = feedbackResult.data ?? [];

  const average = (key: "onboarding_rating" | "transaction_clarity_rating" | "usability_rating") =>
    feedbackRows.length
      ? Math.round(
          (feedbackRows.reduce((total, row) => total + Number(row[key]), 0) /
            feedbackRows.length) *
            10
        ) / 10
      : null;
  const percentage = (key: "understood_reward_timing" | "would_use_again") =>
    feedbackRows.length
      ? Math.round(
          (feedbackRows.filter((row) => Boolean(row[key])).length / feedbackRows.length) * 100
        )
      : null;

  return {
    qualifiedUsers,
    onboardedUsers: onboardedWallets.size,
    completedUsers: completedWallets.size,
    verifiedInteractions: interactionResult.data?.length ?? 0,
    feedbackResponses: feedbackRows.length,
    averages: {
      onboarding: average("onboarding_rating"),
      transactionClarity: average("transaction_clarity_rating"),
      usability: average("usability_rating"),
      understoodRewardTimingPercent: percentage("understood_reward_timing"),
      wouldUseAgainPercent: percentage("would_use_again"),
    },
    recentTransactions: (interactionResult.data ?? []).slice(0, 20).map((row) => ({
      transactionHash: String(row.transaction_hash),
      action: String(row.action),
      ledger: row.ledger === null ? null : toSafeInteger(row.ledger),
      confirmedAt: String(row.confirmed_at),
    })),
    generatedAt: new Date().toISOString(),
  };
}

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


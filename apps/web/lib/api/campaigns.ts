import type { BrandProfileDto, CampaignDto } from "@/lib/data/level4";

interface ApiErrorPayload {
  error?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiErrorPayload;
  if (!response.ok) throw new Error(data.error ?? "Permintaan campaign gagal");
  return data;
}

export async function loadBrandProfile(): Promise<BrandProfileDto | null> {
  const data = await parseResponse<{ brand: BrandProfileDto | null }>(
    await fetch("/api/brands", { cache: "no-store" })
  );
  return data.brand;
}

export async function registerBrand(companyName: string): Promise<BrandProfileDto> {
  const data = await parseResponse<{ brand: BrandProfileDto }>(
    await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName }),
    })
  );
  return data.brand;
}

export async function loadSponsorCampaigns(): Promise<CampaignDto[]> {
  const data = await parseResponse<{ campaigns: CampaignDto[] }>(
    await fetch("/api/campaigns", { cache: "no-store" })
  );
  return data.campaigns;
}

export async function createCampaign(input: {
  name: string;
  description: string;
  budgetXlm: string;
  startDate: string;
  endDate: string;
}): Promise<CampaignDto> {
  const data = await parseResponse<{ campaign: CampaignDto }>(
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return data.campaign;
}

export async function linkCampaignHunt(campaignId: number, huntId: number): Promise<void> {
  await parseResponse(
    await fetch(`/api/campaigns/${campaignId}/hunts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ huntId }),
    })
  );
}


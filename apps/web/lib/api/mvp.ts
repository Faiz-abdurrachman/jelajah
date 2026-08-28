interface ApiErrorPayload {
  error?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiErrorPayload;
  if (!response.ok) throw new Error(data.error ?? "Permintaan gagal");
  return data;
}

export async function indexConfirmedHunt(input: {
  transactionHash: string;
  huntIdHash: string;
  clue: string;
  photoCid: string | null;
  campaignId?: number;
}): Promise<{ id: number; contract_id: string }> {
  return parseResponse(
    await fetch("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function indexConfirmedClaim(input: {
  huntId: number;
  transactionHash: string;
  photoCid: string;
}): Promise<{ id: number }> {
  return parseResponse(
    await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export interface PendingClaimDto {
  id: number;
  hunter_pubkey: string;
  photo_cid: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  submitted_at: string;
}

export async function loadPendingClaims(huntId: number): Promise<PendingClaimDto[]> {
  const data = await parseResponse<{ claims: PendingClaimDto[] }>(
    await fetch(`/api/hunts/${huntId}/claims`, { cache: "no-store" })
  );
  return data.claims;
}

export async function resolveConfirmedClaim(
  claimId: number,
  transactionHash: string,
  resolution: "approve" | "reject"
): Promise<void> {
  await parseResponse(
    await fetch(`/api/claims/${claimId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionHash, resolution }),
    })
  );
}

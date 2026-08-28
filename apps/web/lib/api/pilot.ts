import type { PilotRole, PilotStatusDto } from "@/lib/data/level4";

async function parsePilotResponse(response: Response): Promise<PilotStatusDto> {
  const data = (await response.json()) as PilotStatusDto & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Permintaan pilot gagal");
  return data;
}

export async function loadPilotStatus(): Promise<PilotStatusDto> {
  return parsePilotResponse(await fetch("/api/pilot", { cache: "no-store" }));
}

export async function startPilot(role: PilotRole): Promise<PilotStatusDto> {
  return parsePilotResponse(
    await fetch("/api/pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", role, accepted: true }),
    })
  );
}

export async function submitPilotFeedback(input: {
  onboardingRating: number;
  transactionClarityRating: number;
  usabilityRating: number;
  understoodRewardTiming: boolean;
  wouldUseAgain: boolean;
  confusion: string;
  suggestion: string;
}): Promise<PilotStatusDto> {
  return parsePilotResponse(
    await fetch("/api/pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "feedback",
        ...input,
        consentToAnonymousUse: true,
      }),
    })
  );
}

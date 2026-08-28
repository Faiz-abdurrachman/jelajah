import { requireSession } from "@/lib/auth/session";
import {
  completePilotOnboarding,
  getPilotStatus,
  startPilotOnboarding,
  submitPilotFeedback,
  type PilotRole,
} from "@/lib/data/level4";

const CONSENT_VERSION = "level4-pilot-v1";

function apiError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Pilot request failed";
  const status =
    message === "UNAUTHENTICATED"
      ? 401
      : message === "ONBOARDING_REQUIRED" || message === "INTERACTION_REQUIRED"
        ? 409
        : message === "FEEDBACK_ALREADY_SUBMITTED"
          ? 409
          : 500;
  const publicMessage: Record<string, string> = {
    UNAUTHENTICATED: "Wallet belum terautentikasi",
    ONBOARDING_REQUIRED: "Mulai onboarding pilot terlebih dahulu",
    INTERACTION_REQUIRED: "Selesaikan minimal satu transaksi Testnet terkonfirmasi",
    FEEDBACK_ALREADY_SUBMITTED: "Feedback wallet ini sudah tersimpan",
  };
  return Response.json({ error: publicMessage[message] ?? message }, { status });
}

function isRole(value: unknown): value is PilotRole {
  return value === "sponsor" || value === "hunter";
}

function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export async function GET() {
  try {
    const session = await requireSession();
    return Response.json(await getPilotStatus(session.address));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "start") {
      if (body.accepted !== true || !isRole(body.role)) {
        return Response.json({ error: "Persetujuan dan peran pilot wajib dipilih" }, { status: 400 });
      }
      await startPilotOnboarding({
        publicKey: session.address,
        role: body.role,
        consentVersion: CONSENT_VERSION,
      });
      return Response.json(await getPilotStatus(session.address), { status: 201 });
    }

    const pilot = await getPilotStatus(session.address);
    if (!pilot.onboarding) throw new Error("ONBOARDING_REQUIRED");
    if (!pilot.interactions.length) throw new Error("INTERACTION_REQUIRED");

    if (body.action === "complete") {
      await completePilotOnboarding(session.address);
      return Response.json(await getPilotStatus(session.address));
    }

    if (body.action === "feedback") {
      const confusion = typeof body.confusion === "string" ? body.confusion.trim() : "";
      const suggestion = typeof body.suggestion === "string" ? body.suggestion.trim() : "";
      if (
        !isRating(body.onboardingRating) ||
        !isRating(body.transactionClarityRating) ||
        !isRating(body.usabilityRating) ||
        typeof body.understoodRewardTiming !== "boolean" ||
        typeof body.wouldUseAgain !== "boolean" ||
        body.consentToAnonymousUse !== true ||
        confusion.length > 1000 ||
        suggestion.length > 1000
      ) {
        return Response.json({ error: "Jawaban feedback belum lengkap atau tidak valid" }, { status: 400 });
      }
      await submitPilotFeedback({
        publicKey: session.address,
        role: pilot.onboarding.role,
        onboardingRating: body.onboardingRating,
        transactionClarityRating: body.transactionClarityRating,
        usabilityRating: body.usabilityRating,
        understoodRewardTiming: body.understoodRewardTiming,
        wouldUseAgain: body.wouldUseAgain,
        confusion: confusion || null,
        suggestion: suggestion || null,
      });
      await completePilotOnboarding(session.address);
      return Response.json(await getPilotStatus(session.address), { status: 201 });
    }

    return Response.json({ error: "Aksi pilot tidak dikenal" }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}

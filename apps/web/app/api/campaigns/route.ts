import { requireSession } from "@/lib/auth/session";
import { createSponsorCampaign, listCampaignsForSponsor } from "@/lib/data/level4";

const XLM_AMOUNT = /^\d{1,5}(?:\.\d{1,7})?$/;

function xlmToStroops(value: string): number | null {
  if (!XLM_AMOUNT.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const stroops = Number(whole) * 10_000_000 + Number(fraction.padEnd(7, "0"));
  return Number.isSafeInteger(stroops) && stroops > 0 ? stroops : null;
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Campaign request failed";
  if (message === "UNAUTHENTICATED") {
    return Response.json({ error: "Wallet belum terautentikasi" }, { status: 401 });
  }
  if (message === "BRAND_REQUIRED") {
    return Response.json({ error: "Daftarkan brand sebelum membuat campaign" }, { status: 403 });
  }
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const session = await requireSession();
    const campaigns = await listCampaignsForSponsor(session.address);
    return Response.json({ campaigns });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name : "";
    const description = typeof body.description === "string" ? body.description : "";
    const budgetXlm = typeof body.budgetXlm === "string" ? body.budgetXlm : "";
    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    const endDate = typeof body.endDate === "string" ? body.endDate : "";
    const budgetStroops = xlmToStroops(budgetXlm);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      name !== name.trim() ||
      name.length < 3 ||
      name.length > 100 ||
      description.length > 500 ||
      budgetStroops === null ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start ||
      end.getTime() <= Date.now()
    ) {
      return Response.json({ error: "Detail campaign tidak valid" }, { status: 400 });
    }

    const campaign = await createSponsorCampaign({
      publicKey: session.address,
      name,
      description: description.trim() || null,
      budgetStroops,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}


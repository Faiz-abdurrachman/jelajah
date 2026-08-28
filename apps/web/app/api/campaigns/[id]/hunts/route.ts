import { requireSession } from "@/lib/auth/session";
import { linkHuntToSponsorCampaign } from "@/lib/data/level4";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const campaignId = Number((await params).id);
    const body = (await request.json()) as { huntId?: unknown };
    if (
      !Number.isInteger(campaignId) ||
      campaignId <= 0 ||
      typeof body.huntId !== "number" ||
      !Number.isInteger(body.huntId) ||
      body.huntId <= 0
    ) {
      return Response.json({ error: "Campaign atau hunt tidak valid" }, { status: 400 });
    }

    const result = await linkHuntToSponsorCampaign({
      publicKey: session.address,
      campaignId,
      huntId: body.huntId,
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungkan hunt";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message.endsWith("NOT_FOUND")
            ? 404
            : message === "CAMPAIGN_CLOSED"
              ? 409
              : 500;
    return Response.json({ error: message }, { status });
  }
}


import { getPublicPilotSummary } from "@/lib/data/level4";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getPublicPilotSummary(), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error(
      "Unable to build public pilot summary",
      error instanceof Error ? error.message : "unknown error"
    );
    return Response.json({ error: "Ringkasan pilot belum tersedia" }, { status: 503 });
  }
}

import {
  configuredContractIds,
  formatContractEventError,
  getContractEvents,
  isValidEventCursor,
} from "@/lib/stellar/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (configuredContractIds().length === 0) {
    return Response.json(
      { error: "Belum ada contract address Testnet yang dikonfigurasi" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor !== null && !isValidEventCursor(cursor)) {
    return Response.json(
      { error: "Cursor event tidak valid" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    return Response.json(await getContractEvents(cursor), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: formatContractEventError(error) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

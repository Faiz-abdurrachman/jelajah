import { rpc, scValToNative, type xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "@/config/contracts";
import { STELLAR_CONFIG } from "@/config/constants";

export const dynamic = "force-dynamic";

function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries(), ([key, item]) => [String(key), jsonSafe(item)])
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)])
    );
  }
  return value;
}

function decodeScVal(value: xdr.ScVal): unknown {
  try {
    return jsonSafe(scValToNative(value));
  } catch {
    return value.toXDR("base64");
  }
}

function configuredContractIds(): string[] {
  return Array.from(
    new Set(
      [CONTRACTS.huntFactory, CONTRACTS.reputation, CONTRACTS.dispute, CONTRACTS.questChain]
        .filter((contractId) => /^C[A-Z2-7]{55}$/.test(contractId))
    )
  );
}

export async function GET(request: Request) {
  const contractIds = configuredContractIds();
  if (contractIds.length === 0) {
    return Response.json(
      { error: "Belum ada contract address Testnet yang dikonfigurasi" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor !== null && (cursor.length === 0 || cursor.length > 256 || /[\x00-\x1F]/.test(cursor))) {
    return Response.json(
      { error: "Cursor event tidak valid" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const server = new rpc.Server(STELLAR_CONFIG.rpcUrl, {
      allowHttp: false,
      timeout: 15_000,
    });
    const filters: rpc.Api.EventFilter[] = [{ type: "contract", contractIds }];
    const response = cursor
      ? await server.getEvents({ cursor, filters, limit: 50 })
      : await (async () => {
          const latest = await server.getLatestLedger();
          return server.getEvents({
            startLedger: Math.max(1, latest.sequence - 2_000),
            filters,
            limit: 50,
          });
        })();

    return Response.json(
      {
        cursor: response.cursor,
        latestLedger: response.latestLedger,
        monitoredContracts: contractIds,
        events: response.events.map((event) => {
          const topics = event.topic.map(decodeScVal);
          return {
            id: event.id,
            type: event.type,
            name: typeof topics[1] === "string" ? topics[1] : "contract_event",
            contractId: event.contractId?.contractId() ?? null,
            ledger: event.ledger,
            closedAt: event.ledgerClosedAt,
            txHash: event.txHash,
            successful: event.inSuccessfulContractCall,
            topics,
            value: decodeScVal(event.value),
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? `Gagal membaca event Testnet: ${error.message}`
            : "Gagal membaca event Testnet",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

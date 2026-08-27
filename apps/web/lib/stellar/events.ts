import { rpc, scValToNative, type xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "@/config/contracts";
import { STELLAR_CONFIG } from "@/config/constants";

export interface ContractEventRecord {
  id: string;
  type: string;
  name: string;
  contractId: string | null;
  ledger: number;
  closedAt: string;
  txHash: string;
  successful: boolean;
  topics: unknown[];
  value: unknown;
}

export interface ContractEventBatch {
  cursor: string;
  latestLedger: number;
  monitoredContracts: string[];
  events: ContractEventRecord[];
}

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

export function configuredContractIds(): string[] {
  return Array.from(
    new Set(
      [CONTRACTS.huntFactory, CONTRACTS.reputation, CONTRACTS.dispute, CONTRACTS.questChain]
        .filter((contractId) => /^C[A-Z2-7]{55}$/.test(contractId))
    )
  );
}

export function isValidEventCursor(cursor: string): boolean {
  return cursor.length > 0 && cursor.length <= 256 && !/[\x00-\x1F]/.test(cursor);
}

export async function getContractEvents(cursor: string | null): Promise<ContractEventBatch> {
  const contractIds = configuredContractIds();
  if (contractIds.length === 0) {
    throw new Error("Belum ada contract address Testnet yang dikonfigurasi");
  }

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

  return {
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
  };
}

export function formatContractEventError(error: unknown): string {
  return error instanceof Error
    ? `Gagal membaca event Testnet: ${error.message}`
    : "Gagal membaca event Testnet";
}

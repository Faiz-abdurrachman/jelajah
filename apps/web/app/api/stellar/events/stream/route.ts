import {
  configuredContractIds,
  formatContractEventError,
  getContractEvents,
  isValidEventCursor,
} from "@/lib/stellar/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const STREAM_LIFETIME_MS = 25_000;
const RPC_POLL_INTERVAL_MS = 3_000;
const RETRY_INTERVAL_MS = 5_000;

function serializeEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}

export async function GET(request: Request) {
  const contractIds = configuredContractIds();
  if (contractIds.length === 0) {
    return Response.json(
      { error: "Belum ada contract address Testnet yang dikonfigurasi" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  let cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor !== null && !isValidEventCursor(cursor)) {
    return Response.json(
      { error: "Cursor event tidak valid" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  let cancelled = false;
  const streamAbort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const startedAt = Date.now();

      const pump = async () => {
        controller.enqueue(serializeEvent("connected", { monitoredContracts: contractIds }));

        while (
          !cancelled &&
          !streamAbort.signal.aborted &&
          Date.now() - startedAt < STREAM_LIFETIME_MS
        ) {
          try {
            const batch = await getContractEvents(cursor);
            cursor = batch.cursor;
            controller.enqueue(serializeEvent("contract-events", batch));
            await wait(RPC_POLL_INTERVAL_MS, streamAbort.signal);
          } catch (error) {
            controller.enqueue(
              serializeEvent("stream-error", { error: formatContractEventError(error) })
            );
            await wait(RETRY_INTERVAL_MS, streamAbort.signal);
          }
        }

        if (!cancelled && !streamAbort.signal.aborted) {
          controller.enqueue(serializeEvent("reconnect", { cursor }));
          controller.close();
        }
      };

      void pump().catch((error) => {
        if (!cancelled && !streamAbort.signal.aborted) {
          controller.enqueue(
            serializeEvent("stream-error", { error: formatContractEventError(error) })
          );
          controller.close();
        }
      });
    },
    cancel() {
      cancelled = true;
      streamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

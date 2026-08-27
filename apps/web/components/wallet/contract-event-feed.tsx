"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ExternalLink, Radio, RefreshCw, TriangleAlert } from "lucide-react";

interface ContractEvent {
  id: string;
  name: string;
  contractId: string | null;
  ledger: number;
  closedAt: string;
  txHash: string;
  successful: boolean;
}

interface EventBatch {
  cursor: string;
  latestLedger: number;
  monitoredContracts: string[];
  events: ContractEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  factory_configured: "Factory dikonfigurasi",
  hunt_registered: "Hunt terdaftar",
  hunt_created: "Hunt dibuat",
  claim_submitted: "Claim dikirim",
  claim_rejected: "Claim ditolak",
  reward_paid: "Reward dibayar",
  reward_refunded: "Reward dikembalikan",
  xp_awarded: "XP diberikan",
  badge_issued: "Badge diberikan",
};

export function ContractEventFeed() {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [latestLedger, setLatestLedger] = useState<number | null>(null);
  const [contractCount, setContractCount] = useState(0);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped || reconnectTimer !== null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 2_000);
    };

    const connect = () => {
      if (stopped) return;
      const query = cursorRef.current
        ? `?cursor=${encodeURIComponent(cursorRef.current)}`
        : "";
      source = new EventSource(`/api/stellar/events/stream${query}`);
      setStatus("connecting");

      source.addEventListener("connected", () => {
        setError(null);
        setStatus("live");
      });

      source.addEventListener("contract-events", (message) => {
        const batch = JSON.parse((message as MessageEvent<string>).data) as EventBatch;
        cursorRef.current = batch.cursor;
        setLatestLedger(batch.latestLedger);
        setContractCount(batch.monitoredContracts.length);
        setEvents((current) => {
          const merged = new Map(current.map((event) => [event.id, event]));
          for (const event of batch.events) merged.set(event.id, event);
          return Array.from(merged.values())
            .sort((a, b) => b.ledger - a.ledger || b.id.localeCompare(a.id))
            .slice(0, 8);
        });
        setError(null);
        setStatus("live");
      });

      source.addEventListener("stream-error", (message) => {
        const payload = JSON.parse((message as MessageEvent<string>).data) as { error?: string };
        setError(payload.error ?? "Event stream Testnet tidak tersedia");
        setStatus("error");
      });

      source.addEventListener("reconnect", () => {
        source?.close();
        scheduleReconnect();
      });

      source.onerror = () => {
        source?.close();
        if (stopped) return;
        setStatus("error");
        setError((current) => current ?? "Koneksi event terputus. Menghubungkan ulang...");
        scheduleReconnect();
      };
    };

    connect();
    return () => {
      stopped = true;
      source?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    };
  }, [generation]);

  const resetStream = () => {
    cursorRef.current = null;
    setEvents([]);
    setError(null);
    setStatus("connecting");
    setGeneration((current) => current + 1);
  };

  return (
    <Card data-testid="contract-event-feed">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Radio className="size-4" />
            Live Contract Events
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Server-Sent Events · cursor Soroban RPC real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={status === "error" ? "destructive" : "secondary"}
            className="gap-1"
          >
            <span
              className={`size-1.5 rounded-full ${
                status === "live" ? "animate-pulse bg-emerald-500" : "bg-current"
              }`}
            />
            {status === "live" ? "Live" : status === "error" ? "Reconnecting" : "Connecting"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh contract events"
            onClick={resetStream}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center">
            <Activity className="mx-auto mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Stream aktif, menunggu event baru</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestLedger
                ? `Ledger ${latestLedger.toLocaleString()} · ${contractCount} kontrak dipantau`
                : "Menghubungkan ke Stellar Testnet..."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {EVENT_LABELS[event.name] ?? event.name.replaceAll("_", " ")}
                    </p>
                    <Badge variant={event.successful ? "secondary" : "destructive"}>
                      {event.successful ? "Confirmed" : "Failed"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    Ledger {event.ledger} · {event.txHash.slice(0, 12)}...
                  </p>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Lihat transaksi ${event.txHash} di Stellar Expert`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

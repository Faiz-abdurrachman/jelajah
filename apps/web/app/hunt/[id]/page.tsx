"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { RequireLevel } from "@/components/feature-gate";
import { ClaimHuntView } from "@/components/hunt/claim-hunt-view";
import { HiderApproveView } from "@/components/hunt/hider-approve-view";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/components/wallet/wallet-provider";
import { getHuntById } from "@/lib/supabase/client";
import { getDisputesByHunt } from "@/lib/supabase/client";
import type { Hunt } from "@/types";
import { normalizeHunt } from "@/lib/supabase/normalize";

export default function HuntDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { publicKey } = useWallet();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const huntId = parseInt(id ?? "0", 10);
      if (!huntId || huntId <= 0) {
        if (!cancelled) {
          setError("Hunt tidak ditemukan.");
          setLoading(false);
        }
        return;
      }

      try {
        const row = await getHuntById(huntId);
        if (cancelled) return;

        if (row) {
          setHunt(normalizeHunt(row as Record<string, unknown>));
        } else {
          setError("Hunt tidak ditemukan.");
        }
      } catch {
        if (!cancelled) {
          setError("Gagal memuat data hunt.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id]);

  const handleClaimResolved = () => {
    // Re-fetch hunt data after a claim is approved/rejected
    setLoading(true);
    const huntId = parseInt(id ?? "0", 10);
    getHuntById(huntId)
      .then((row) => {
        if (row) {
          setHunt(normalizeHunt(row as Record<string, unknown>));
        }
      })
      .finally(() => setLoading(false));
  };

  const isHider = publicKey && hunt && publicKey === hunt.hiderPubkey;

  return (
    <RequireLevel level={2}>
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : hunt ? (
          <div className="space-y-6">
            <HuntInfoCard hunt={hunt} />
            {isHider && (
              <HiderApproveView hunt={hunt} onClaimResolved={handleClaimResolved} />
            )}
            {!isHider && hunt.status === "active" && <ClaimHuntView hunt={hunt} />}
            {!isHider && hunt.status !== "active" && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Hunt ini sedang {hunt.status.replace("_", " ")} dan tidak menerima claim baru.
                </CardContent>
              </Card>
            )}
            <HuntDisputes huntId={hunt.id} />
          </div>
        ) : null}
      </div>
    </RequireLevel>
  );
}

function HuntInfoCard({ hunt }: { hunt: Hunt }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">Hunt #{hunt.id}</h1>
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{hunt.clue}&rdquo;
            </p>
          </div>
          <Badge variant={hunt.status === "active" ? "default" : "secondary"}>
            {hunt.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Reward: </span>
            <span className="font-medium">
              {hunt.amountStroops ? `${hunt.amountStroops / 10_000_000} XLM` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Radius: </span>
            <span className="font-medium">{hunt.radiusMeters}m</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Deadline: </span>
            <span className="font-medium">
              {new Date(hunt.deadline).toLocaleDateString("id-ID")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HuntDisputes({ huntId }: { huntId: number }) {
  const [disputes, setDisputes] = useState<Array<{ id: number; claim_id: number; reason: string; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getDisputesByHunt(huntId).then((data) => {
      if (!cancelled && data) {
        setDisputes(data as Array<{ id: number; claim_id: number; reason: string; status: string; created_at: string }>);
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [huntId]);

  if (loading) return null;
  if (disputes.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-amber-500" />
          <h3 className="font-semibold">Disputes ({disputes.length})</h3>
        </div>
        <div className="space-y-2">
          {disputes.map((d) => (
            <Link
              key={d.id}
              href={`/dispute/${d.id}`}
              className="flex items-center justify-between rounded-md border p-3 hover:border-primary/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">Dispute #{d.id}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {d.reason}
                </p>
              </div>
              <Badge
                variant={d.status === "voting" ? "default" : "secondary"}
              >
                {d.status}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

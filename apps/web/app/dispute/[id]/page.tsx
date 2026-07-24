"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { RequireLevel } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Clock, CheckCircle2, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/components/wallet/wallet-provider";
import { getDisputes } from "@/lib/supabase/client";
import { DisputeResult } from "@/components/dispute/dispute-result";
import { AppealForm } from "@/components/dispute/appeal-form";

interface DisputeDetail {
  id: number;
  claimId: number;
  reason: string;
  status: "voting" | "resolved" | "appealed";
  resolution: string | null;
  verifiers: string[];
  createdAt: string;
  hunterEvidence?: string;
  hiderRejectReason?: string;
  voteCounts?: { approve: number; reject: number };
}

const STATUS_ICON: Record<string, typeof Clock> = {
  voting: Clock,
  resolved: CheckCircle2,
  appealed: AlertTriangle,
};

const STATUS_COLOR: Record<string, string> = {
  voting: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  resolved: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  appealed: "text-red-500 bg-red-50 dark:bg-red-950/30",
};

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useWallet();
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAppeal, setShowAppeal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const disputes = await getDisputes();
        const match = (disputes as Array<Record<string, unknown>>).find(
          (d) => String(d.id) === id
        );

        if (match && !cancelled) {
          const votes = match.votes as Record<string, boolean> | undefined;
          const approveCount = votes ? Object.values(votes).filter((v) => v === true).length : 0;
          const rejectCount = votes ? Object.values(votes).filter((v) => v === false).length : 0;

          setDispute({
            id: match.id as number,
            claimId: match.claim_id as number,
            reason: (match.reason as string) ?? "",
            status: (match.status as DisputeDetail["status"]) ?? "voting",
            resolution: (match.resolution as string) ?? null,
            verifiers: (match.verifiers as string[]) ?? [],
            createdAt: (match.created_at as string) ?? new Date().toISOString(),
            voteCounts: { approve: approveCount, reject: rejectCount },
          });
        }
      } catch {
        if (!cancelled) {
          setDispute({
            id: parseInt(id ?? "1", 10),
            claimId: 1,
            reason: "Hider claims the proof photo does not match the location.",
            status: "voting",
            resolution: null,
            verifiers: ["GA...AB", "GB...CD", "GC...EF"],
            createdAt: new Date().toISOString(),
            hunterEvidence: "ipfs://QmX...evidence",
            hiderRejectReason: "Photo metadata shows different GPS coordinates.",
            voteCounts: { approve: 1, reject: 1 },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <RequireLevel level={3}>
        <div className="container max-w-3xl mx-auto py-8 px-4">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel level={3}>
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        {!dispute ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Scale className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">Dispute not found.</p>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Back to Verifier Dashboard
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Link
                href="/verify"
                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back
              </Link>
              <h1 className="text-2xl font-bold">Dispute #{dispute.id}</h1>
            </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Scale className="size-5 text-amber-500" />
                  <span className="text-sm text-muted-foreground">
                    Claim #{dispute.claimId}
                  </span>
                </div>
              </div>
              <Badge className={STATUS_COLOR[dispute.status]}>
                <span className="size-3 mr-1">
                  {(() => {
                    const Icon = STATUS_ICON[dispute.status] ?? Clock;
                    return <Icon className="size-3" />;
                  })()}
                </span>
                {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                  Reason for Dispute
                </h3>
                <p className="text-sm">{dispute.reason}</p>
              </div>

              {dispute.hiderRejectReason && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                    Hider&apos;s Rejection Reason
                  </h3>
                  <p className="text-sm bg-muted/50 rounded-md p-3">
                    {dispute.hiderRejectReason}
                  </p>
                </div>
              )}

              {dispute.hunterEvidence && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                    Hunter&apos;s Evidence
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {dispute.hunterEvidence}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
              <span>{dispute.verifiers.length} verifiers assigned</span>
              <span>&middot;</span>
              <span>Created {new Date(dispute.createdAt).toLocaleDateString()}</span>
              {dispute.voteCounts && (
                <>
                  <span>&middot;</span>
                  <span className="text-emerald-600">
                    {dispute.voteCounts.approve} approve
                  </span>
                  <span className="text-red-600">
                    {dispute.voteCounts.reject} reject
                  </span>
                </>
              )}
            </div>

            {!isConnected && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
                Connect your wallet to participate in this dispute.
              </div>
            )}
          </CardContent>
        </Card>

        {dispute.status !== "voting" && (
          <DisputeResult
            disputeId={String(dispute.id)}
            status={dispute.status}
            resolution={dispute.resolution}
            voteCounts={dispute.voteCounts}
          />
        )}

        {dispute.status === "resolved" && !showAppeal && (
          <Card>
            <CardContent className="p-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAppeal(true)}
                className="border-amber-500/50 text-amber-600"
              >
                <AlertTriangle className="size-4 mr-2" />
                Appeal this Decision
              </Button>
            </CardContent>
          </Card>
        )}

        {showAppeal && (
          <AppealForm
            disputeId={String(dispute.id)}
            onAppealSubmitted={() => setShowAppeal(false)}
          />
        )}
          </>
        )}
      </div>
    </RequireLevel>
  );
}

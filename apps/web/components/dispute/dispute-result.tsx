"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Scale, Users, Loader2 } from "lucide-react";
import { resolveDisputeTx } from "@/lib/stellar/soroban";

interface VoteCounts {
  approve: number;
  reject: number;
}

interface DisputeResultProps {
  disputeId: string;
  status: "voting" | "resolved" | "appealed";
  resolution: string | null;
  voteCounts?: VoteCounts;
}

export function DisputeResult({
  disputeId,
  status,
  resolution,
  voteCounts,
}: DisputeResultProps) {
  const { publicKey, signAndSubmit } = useWallet();
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const totalVotes = voteCounts ? voteCounts.approve + voteCounts.reject : 0;
  const approvePercent = totalVotes > 0 ? Math.round((voteCounts!.approve / totalVotes) * 100) : 0;
  const rejectPercent = totalVotes > 0 ? Math.round((voteCounts!.reject / totalVotes) * 100) : 0;

  const winner: "approve" | "reject" | null =
    totalVotes > 0
      ? voteCounts!.approve >= voteCounts!.reject
        ? "approve"
        : "reject"
      : null;

  const handleResolve = useCallback(async () => {
    if (!publicKey) return;
    setResolving(true);
    setResolveError(null);
    try {
      const prep = await resolveDisputeTx(publicKey, disputeId);
      if (!prep.success || !prep.xdr) {
        setResolveError(prep.error ?? "Failed to prepare resolve transaction.");
        return;
      }
      const submit = await signAndSubmit(prep.xdr);
      if (!submit.success) {
        setResolveError(submit.error ?? "Failed to sign or submit resolve.");
      }
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : "Resolution failed.");
    } finally {
      setResolving(false);
    }
  }, [publicKey, disputeId, signAndSubmit]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Verdict</h2>
          <Badge
            variant={
              status === "resolved"
                ? resolution === "approve"
                  ? "default"
                  : "destructive"
                : "outline"
            }
          >
            {status === "resolved" && resolution === "approve" && (
              <CheckCircle2 className="size-3 mr-1" />
            )}
            {status === "resolved" && resolution === "reject" && (
              <XCircle className="size-3 mr-1" />
            )}
            {status === "resolved"
              ? resolution === "approve"
                ? "Hunter Wins"
                : "Hider Wins"
              : status === "appealed"
                ? "Under Appeal"
                : "Pending"}
          </Badge>
        </div>

        {voteCounts && totalVotes > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {totalVotes} votes cast
              </span>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    Approve (Hunter)
                  </span>
                  <span className="font-mono text-emerald-600">
                    {voteCounts.approve} ({approvePercent}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${approvePercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="size-3" />
                    Reject (Hider)
                  </span>
                  <span className="font-mono text-red-600">
                    {voteCounts.reject} ({rejectPercent}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${rejectPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {winner && (
              <div className="rounded-md bg-muted/50 p-3 text-center">
                <p className="text-sm font-medium">
                  {winner === "approve" ? (
                    <span className="text-emerald-600">
                      Majority votes to approve — Hunter wins.
                    </span>
                  ) : (
                    <span className="text-red-600">
                      Majority votes to reject — Hider wins.
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reward will be distributed to the {winner === "approve" ? "hunter" : "hider"}.
                  Verifiers earn {approvePercent > 50 ? "60" : "0"}% fee share on majority.
                </p>
              </div>
            )}
          </div>
        )}

        {status === "voting" && publicKey && (
          <div className="space-y-2">
            <Button onClick={handleResolve} disabled={resolving || totalVotes < 2} className="w-full">
              {resolving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve Dispute"
              )}
            </Button>
            {resolveError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{resolveError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

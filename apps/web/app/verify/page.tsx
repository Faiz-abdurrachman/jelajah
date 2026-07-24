"use client";

import { useState, useEffect, useCallback } from "react";
import { RequireLevel } from "@/components/feature-gate";
import { VerifierStats } from "@/components/dispute/verifier-stats";
import { DisputeList } from "@/components/dispute/dispute-list";
import { VotePanel } from "@/components/dispute/vote-panel";
import { StakeManage } from "@/components/dispute/stake-manage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Coins, ArrowRight } from "lucide-react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { getDisputes, getVerifierStats, applyAsVerifier } from "@/lib/supabase/client";
import { VERIFIER_RULES } from "@/config/constants";

interface VerifierStatsData {
  stake: number;
  disputesHandled: number;
  disputeFeeEarned: number;
  isActive: boolean;
}

interface DisputeItem {
  id: number;
  claimId: number;
  reason: string;
  status: string;
  resolution: string | null;
  verifiers: string[];
  createdAt: string;
  huntTitle?: string;
}

export default function VerifyPage() {
  const { publicKey, isConnected } = useWallet();
  const [isVerifier, setIsVerifier] = useState<boolean | null>(null);
  const [stats, setStats] = useState<VerifierStatsData | null>(null);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!publicKey) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);
      try {
        const [verifierStats, disputeData] = await Promise.all([
          getVerifierStats(publicKey),
          getDisputes(publicKey),
        ]);

        if (cancelled) return;

        if (verifierStats) {
          setIsVerifier(true);
          setStats({
            stake: verifierStats.stake,
            disputesHandled: verifierStats.disputesHandled,
            disputeFeeEarned: verifierStats.disputeFeeEarned,
            isActive: verifierStats.isActive,
          });
        } else {
          setIsVerifier(false);
          setStats(null);
        }

        const mapped: DisputeItem[] = (disputeData ?? []).map((d: Record<string, unknown>) => ({
          id: d.id as number,
          claimId: d.claim_id as number,
          reason: (d.reason as string) ?? "",
          status: (d.status as string) ?? "voting",
          resolution: (d.resolution as string) ?? null,
          verifiers: (d.verifiers as string[]) ?? [],
          createdAt: (d.created_at as string) ?? new Date().toISOString(),
        }));

        setDisputes(mapped);
      } catch {
        if (!cancelled) setIsVerifier(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [publicKey, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleStakeChange = useCallback(
    (newStake: number) => {
      setStats((prev) => (prev ? { ...prev, stake: newStake } : null));
    },
    []
  );

  const handleVoteSubmitted = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleApplyVerifier = useCallback(async () => {
    if (!publicKey) return;
    try {
      await applyAsVerifier(publicKey);
      setIsVerifier(true);
      setStats({ stake: 0, disputesHandled: 0, disputeFeeEarned: 0, isActive: true });
    } catch {
      // silently fail — will retry on next load
    }
  }, [publicKey]);

  if (loading) {
    return (
      <RequireLevel level={3}>
        <div className="container max-w-3xl mx-auto py-8 px-4">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel level={3}>
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="size-6" />
          <h1 className="text-2xl font-bold">Verifier Dashboard</h1>
        </div>

        {!isConnected ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Shield className="size-8 mx-auto text-muted-foreground" />
              <p className="font-medium">Connect your wallet to access the Verifier Dashboard.</p>
              <p className="text-sm text-muted-foreground">
                Verify disputes and earn fees by staking XLM.
              </p>
            </CardContent>
          </Card>
        ) : !isVerifier ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <Coins className="size-8 mx-auto text-muted-foreground" />
                <h2 className="text-lg font-semibold">Become a Verifier</h2>
                <p className="text-sm text-muted-foreground">
                  Stake XLM to earn fees by resolving disputes fairly.
                </p>
              </div>

              <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold">Requirements:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="size-3" />
                    Minimum stake: {VERIFIER_RULES.minStake.toLocaleString()} XLM
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="size-3" />
                    {VERIFIER_RULES.minCompletedHunts}+ completed hunts
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="size-3" />
                    {VERIFIER_RULES.minReputationScore.toLocaleString()}+ reputation score
                  </li>
                </ul>
              </div>

              <Button className="w-full" size="lg" onClick={handleApplyVerifier}>
                Apply to be a Verifier
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {VERIFIER_RULES.slashMinority}% slash for minority voting &middot;{" "}
                {VERIFIER_RULES.slashNoReview}% for no review &middot;{" "}
                {VERIFIER_RULES.slashCollusion}% for collusion
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <VerifierStats stats={stats} />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Assigned Disputes</h2>
                  <Badge variant="secondary">{disputes.length} active</Badge>
                </div>

                <DisputeList disputes={disputes} onSelect={setSelectedDispute} />

                {selectedDispute !== null && (
                  <VotePanel
                    disputeId={String(selectedDispute)}
                    onVoteSubmitted={handleVoteSubmitted}
                  />
                )}
              </div>

              <div className="space-y-4">
                <StakeManage
                  currentStake={stats?.stake ?? 0}
                  onStakeChange={handleStakeChange}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </RequireLevel>
  );
}

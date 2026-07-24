"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ThumbsUp, ThumbsDown, Loader2, Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { commitVoteTx, revealVoteTx, computeVoteHash } from "@/lib/stellar/soroban";

type VotePhase = "idle" | "committed" | "revealed";

interface VotePanelProps {
  disputeId: string;
  onVoteSubmitted: () => void;
}

export function VotePanel({ disputeId, onVoteSubmitted }: VotePanelProps) {
  const { publicKey, signAndSubmit } = useWallet();
  const [phase, setPhase] = useState<VotePhase>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salt, setSalt] = useState<string>("");
  const [pendingVote, setPendingVote] = useState<boolean | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const generateSalt = useCallback((): string => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const handleCommitVote = useCallback(
    async (vote: boolean) => {
      if (!publicKey) return;
      setSubmitting(true);
      setError(null);

      const newSalt = generateSalt();
      setSalt(newSalt);
      setPendingVote(vote);

      try {
        const voteHash = await computeVoteHash(publicKey, vote, newSalt);
        const prep = await commitVoteTx(publicKey, disputeId, voteHash);
        if (!prep.success || !prep.xdr) {
          setError(prep.error ?? "Failed to prepare commit vote tx.");
          return;
        }

        const submit = await signAndSubmit(prep.xdr);
        if (submit.success) {
          setTxHash(submit.hash);
          setPhase("committed");
        } else {
          setError(submit.error ?? "Failed to sign or submit commit vote.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error.");
      } finally {
        setSubmitting(false);
      }
    },
    [publicKey, disputeId, generateSalt, signAndSubmit]
  );

  const handleRevealVote = useCallback(async () => {
    if (!publicKey || pendingVote === null) return;
    setSubmitting(true);
    setError(null);

    try {
      const prep = await revealVoteTx(publicKey, disputeId, pendingVote, salt);
      if (!prep.success || !prep.xdr) {
        setError(prep.error ?? "Failed to prepare reveal vote tx.");
        return;
      }

      const submit = await signAndSubmit(prep.xdr);
      if (submit.success) {
        setTxHash(submit.hash);
        setPhase("revealed");
        onVoteSubmitted();
      } else {
        setError(submit.error ?? "Failed to sign or submit reveal vote.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }, [publicKey, disputeId, pendingVote, salt, onVoteSubmitted, signAndSubmit]);

  if (!publicKey) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Connect your wallet to vote on disputes.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h3 className="font-semibold">Cast Your Vote</h3>
          <Badge
            variant="outline"
            className={cn(
              phase === "revealed" && "bg-emerald-500 text-white border-emerald-500",
              phase === "committed" && "bg-amber-500 text-white border-amber-500"
            )}
          >
            {phase === "idle" && <Lock className="size-3 mr-1" />}
            {phase === "committed" && <Eye className="size-3 mr-1" />}
            {phase === "revealed" && <ShieldCheck className="size-3 mr-1" />}
            {phase === "idle" ? "Not Voted" : phase === "committed" ? "Committed" : "Revealed"}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Commit-reveal voting: first submit a sealed vote, then reveal it after all verifiers have committed.
        </p>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
        )}

        {phase === "idle" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              onClick={() => handleCommitVote(true)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <ThumbsUp className="size-4 mr-2" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => handleCommitVote(false)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <ThumbsDown className="size-4 mr-2" />
              )}
              Reject
            </Button>
          </div>
        )}

        {phase === "committed" && (
          <div className="space-y-3">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Vote committed — reveal now to finalize.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-mono">
                Salt: {salt.slice(0, 16)}...
              </p>
              {txHash && (
                <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                  Tx: {txHash.slice(0, 12)}...{txHash.slice(-8)}
                </p>
              )}
            </div>
            <Button className="w-full" onClick={handleRevealVote} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Revealing...
                </>
              ) : (
                "Reveal Vote"
              )}
            </Button>
          </div>
        )}

        {phase === "revealed" && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-3 space-y-2">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Vote revealed — {pendingVote ? "Approved" : "Rejected"}.
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              Your vote has been counted. Results will be available when all verifiers reveal.
            </p>
            {txHash && (
              <p className="text-xs font-mono text-muted-foreground break-all">
                Tx: {txHash.slice(0, 12)}...{txHash.slice(-8)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

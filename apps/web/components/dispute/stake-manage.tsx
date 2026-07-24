"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Coins, ArrowUpCircle, ArrowDownCircle, Loader2, Info } from "lucide-react";
import { VERIFIER_RULES } from "@/config/constants";
import { stakeTx } from "@/lib/stellar/soroban";

const XLM_TO_STROOP = 10_000_000;

interface StakeManageProps {
  currentStake: number;
  onStakeChange: (newStake: number) => void;
}

export function StakeManage({ currentStake, onStakeChange }: StakeManageProps) {
  const { publicKey, signAndSubmit } = useWallet();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const exceedsBalance = mode === "unstake" && parsedAmount > currentStake;

  const handleSubmit = async () => {
    if (!publicKey || !isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      const amountStroops = BigInt(Math.round(parsedAmount * XLM_TO_STROOP));
      const prep = await stakeTx(publicKey, amountStroops);
      if (!prep.success || !prep.xdr) {
        setError(prep.error ?? "Failed to prepare stake transaction.");
        return;
      }

      const submit = await signAndSubmit(prep.xdr);
      if (submit.success) {
        setTxHash(submit.hash);
        const newStake = mode === "stake" ? currentStake + parsedAmount : currentStake - parsedAmount;
        onStakeChange(newStake);
        setAmount("");
      } else {
        setError(submit.error ?? "Failed to sign or submit stake transaction.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stake operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!publicKey) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Connect your wallet to manage your stake.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="size-5 text-amber-500" />
          <h3 className="font-semibold">Stake Management</h3>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current Stake</span>
            </div>
            <span className="font-bold text-lg">{currentStake.toLocaleString()} XLM</span>
          </CardContent>
        </Card>

        <div className="flex rounded-lg border p-1">
          <button
            type="button"
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "stake" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => { setMode("stake"); setError(null); setTxHash(null); }}
          >
            <ArrowUpCircle className="size-4 inline mr-1" />
            Stake
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "unstake" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => { setMode("unstake"); setError(null); setTxHash(null); }}
            disabled={currentStake <= 0}
          >
            <ArrowDownCircle className="size-4 inline mr-1" />
            Unstake
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {mode === "stake" ? "Stake Amount (XLM)" : "Unstake Amount (XLM)"}
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {exceedsBalance && (
            <p className="text-xs text-destructive">
              Amount exceeds current stake of {currentStake.toLocaleString()} XLM.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Minimum stake: {VERIFIER_RULES.minStake.toLocaleString()} XLM
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!isValid || exceedsBalance || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : mode === "stake" ? (
            <>
              <ArrowUpCircle className="size-4 mr-2" />
              Stake {parsedAmount || ""} XLM
            </>
          ) : (
            <>
              <ArrowDownCircle className="size-4 mr-2" />
              Unstake {parsedAmount || ""} XLM
            </>
          )}
        </Button>

        {txHash && (
          <p className="text-xs font-mono text-muted-foreground break-all">
            Tx: {txHash.slice(0, 12)}...{txHash.slice(-8)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

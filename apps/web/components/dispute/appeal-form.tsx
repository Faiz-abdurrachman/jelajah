"use client";

import { useState, useRef } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Upload, Loader2, FileText } from "lucide-react";
import { appealTx } from "@/lib/stellar/soroban";
import { FEES } from "@/config/constants";

interface AppealFormProps {
  disputeId: string;
  onAppealSubmitted: () => void;
}

export function AppealForm({ disputeId, onAppealSubmitted }: AppealFormProps) {
  const { publicKey } = useWallet();
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEvidenceFile(file);
  };

  const handleSubmit = async () => {
    if (!publicKey || !reason.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await appealTx(publicKey, disputeId);

      if (result.success) {
        onAppealSubmitted();
      } else {
        setError(result.error ?? "Appeal failed. Please try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-500/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Appeal Decision</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Appeal the resolution of this dispute. An appeal costs{" "}
          <span className="font-semibold">{FEES.appealFee.toLocaleString()} XLM</span> and
          requires {FEES.verifierFeeShare} verifiers.
        </p>

        <div className="space-y-2">
          <label htmlFor="appeal-reason" className="text-sm font-medium">
            Reason for Appeal
          </label>
          <Input
            id="appeal-reason"
            placeholder="Explain why the decision should be reconsidered..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Evidence (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            {evidenceFile ? (
              <span className="flex items-center gap-2">
                <FileText className="size-4" />
                {evidenceFile.name}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Upload className="size-4" />
                Upload evidence file
              </span>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
        )}

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Appeal Fee: {FEES.appealFee.toLocaleString()} XLM
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            This fee covers the cost of an additional round of verifier review.
            It is non-refundable even if the appeal is denied.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting || !publicKey}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Submitting Appeal...
            </>
          ) : (
            `Pay ${FEES.appealFee.toLocaleString()} XLM to Appeal`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

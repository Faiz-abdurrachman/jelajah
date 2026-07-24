"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Lock, CheckCircle2, Circle, Loader2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestStep } from "@/types";
import { QuestStepView } from "./quest-step-view";
import { claimQuestTx } from "@/lib/stellar/soroban";

interface QuestProgressProps {
  questId: string;
  steps: QuestStep[];
  currentStep: number;
  completedSteps: number[];
  onStepComplete: (stepNumber: number) => void;
  onQuestClaimed: () => void;
}

export function QuestProgress({
  questId,
  steps,
  currentStep,
  completedSteps,
  onStepComplete,
  onQuestClaimed,
}: QuestProgressProps) {
  const { publicKey, signAndSubmit } = useWallet();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const allDone = completedSteps.length === steps.length;
  const lastStep = steps[steps.length - 1];
  const canClaim = allDone && lastStep?.isFinal;

  const handleClaimQuest = useCallback(async () => {
    if (!publicKey) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const prep = await claimQuestTx(publicKey, questId);
      if (!prep.success || !prep.xdr) {
        setClaimError(prep.error ?? "Failed to prepare claim quest tx.");
        return;
      }
      const submit = await signAndSubmit(prep.xdr);
      if (submit.success) {
        onQuestClaimed();
      } else {
        setClaimError(submit.error ?? "Failed to sign or submit claim quest.");
      }
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Claim failed.");
    } finally {
      setClaiming(false);
    }
  }, [publicKey, questId, onQuestClaimed, signAndSubmit]);

  const handleStepComplete = useCallback(
    (stepNumber: number) => {
      onStepComplete(stepNumber);
      setActiveStep(null);
    },
    [onStepComplete]
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.stepNumber);
          const isActive = step.stepNumber === currentStep;
          const isLocked = step.stepNumber > currentStep;
          const isThisActive = activeStep === step.stepNumber;

          return (
            <div key={step.stepNumber} className="relative flex gap-4 pb-8 last:pb-0">
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                    isActive && !isCompleted && "border-primary bg-primary/10 text-primary",
                    isLocked && "border-muted-foreground/20 text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-4" />
                  ) : isLocked ? (
                    <Lock className="size-3" />
                  ) : (
                    <Circle className="size-3" />
                  )}
                </div>
                {!isThisActive && step.stepNumber < steps.length && (
                  <div
                    className={cn(
                      "absolute top-8 h-[calc(100%+0.5rem)] w-0.5",
                      isCompleted ? "bg-emerald-500" : "bg-muted-foreground/10"
                    )}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Card className={cn(isActive && !isCompleted && "border-primary/50")}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={isCompleted ? "default" : "outline"} className="text-xs">
                          Step {step.stepNumber + 1}
                        </Badge>
                        {step.isFinal && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Trophy className="size-3" />
                            Final
                          </Badge>
                        )}
                      </div>
                      {isCompleted && (
                        <Badge variant="default" className="bg-emerald-500 text-xs">
                          Done
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      Clue hash: <span className="font-mono text-xs">{step.clueHash.slice(0, 16)}...</span>
                    </p>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="size-3" />
                      {step.gpsLat.toFixed(4)}, {step.gpsLng.toFixed(4)}
                      <span className="mx-1">&middot;</span>
                      {step.radius}m radius
                    </div>

                    {isActive && !isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveStep(step.stepNumber)}
                        disabled={!publicKey}
                      >
                        {isThisActive ? "Close" : "Complete Step"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {isThisActive && (
                  <div className="mt-3">
                    <QuestStepView
                      questId={questId}
                      step={step}
                      onComplete={() => handleStepComplete(step.stepNumber)}
                      onCancel={() => setActiveStep(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canClaim && (
        <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-6 text-center space-y-3">
            <Trophy className="size-8 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              All Steps Complete!
            </h3>
            <p className="text-sm text-muted-foreground">
              Claim your quest reward now.
            </p>
            <Button
              onClick={handleClaimQuest}
              disabled={claiming || !publicKey}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {claiming ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Reward"
              )}
            </Button>
            {claimError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{claimError}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

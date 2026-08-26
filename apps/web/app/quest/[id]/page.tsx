"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { RequireLevel } from "@/components/feature-gate";
import { QuestProgress } from "@/components/quest/quest-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, MapPin, Clock, User, Loader2, Upload } from "lucide-react";
import { getAllQuests } from "@/lib/supabase/client";
import { getQuestStepsTx, getCurrentStepTx, setQuestStepsTx } from "@/lib/stellar/soroban";
import { useWallet } from "@/components/wallet/wallet-provider";
import type { Hunt, QuestStep } from "@/types";

function huntIdToQuestHex(huntId: number): string {
  return Buffer.from(`quest:${huntId}`)
    .toString("hex")
    .padEnd(64, "0")
    .slice(0, 64);
}

function defaultQuestSteps(): QuestStep[] {
  return [
    {
      stepNumber: 0,
      clueHash: "placeholder_hash_step_0_00000000000000",
      gpsLat: -6.2088,
      gpsLng: 106.8456,
      radius: 30,
      isFinal: false,
    },
    {
      stepNumber: 1,
      clueHash: "placeholder_hash_step_1_00000000000000",
      gpsLat: -6.2100,
      gpsLng: 106.8470,
      radius: 30,
      isFinal: true,
    },
  ];
}

interface QuestState {
  hunt: Hunt | null;
  steps: QuestStep[];
  currentStep: number;
  completedSteps: number[];
  claimed: boolean;
  loading: boolean;
  error: string | null;
  isHider: boolean;
}

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected, publicKey, signAndSubmit } = useWallet();
  const [state, setState] = useState<QuestState>({
    hunt: null,
    steps: [],
    currentStep: 0,
    completedSteps: [],
    claimed: false,
    loading: true,
    error: null,
    isHider: false,
  });
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const questId = id ?? "1";
  const huntId = parseInt(questId, 10);
  const questIdHex = huntIdToQuestHex(isNaN(huntId) ? 1 : huntId);

  useEffect(() => {
    let cancelled = false;

    async function loadQuest() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const quests = await getAllQuests();
        if (cancelled) return;

        const quest = quests.find(
          (q: Record<string, unknown>) => String(q.id) === questId
        );

        if (cancelled) return;

        if (quest) {
          let steps: QuestStep[] = [];
          let currentStep = 0;

          const [stepsResult, currentStepResult] = await Promise.allSettled([
            getQuestStepsTx(publicKey ?? "", questIdHex),
            publicKey
              ? getCurrentStepTx(publicKey, questIdHex)
              : Promise.resolve(null),
          ]);

          if (
            stepsResult.status === "fulfilled" &&
            stepsResult.value.success &&
            stepsResult.value.result
          ) {
            const decoded: QuestStep[] = JSON.parse(
              stepsResult.value.result
            ) as QuestStep[];
            if (Array.isArray(decoded) && decoded.length > 0) {
              steps = decoded;
            }
          }

          if (
            currentStepResult.status === "fulfilled" &&
            currentStepResult.value &&
            currentStepResult.value.success &&
            currentStepResult.value.result
          ) {
            currentStep = parseInt(currentStepResult.value.result, 10);
          }

          const mapped = mapSupabaseToHunt(quest);
          const isHider = publicKey
            ? mapped.hiderPubkey === publicKey
            : false;

          setState({
            hunt: mapped,
            steps,
            currentStep,
            completedSteps: Array.from({ length: currentStep }, (_, i) => i),
            claimed: currentStep >= steps.length && steps.length > 0,
            loading: false,
            error: null,
            isHider,
          });
        } else {
          setState((prev) => ({
            ...prev,
            hunt: null,
            steps: [],
            loading: false,
            error: null,
            isHider: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            hunt: null,
            steps: [],
            loading: false,
            error: "Failed to load quest data.",
            isHider: false,
          }));
        }
      }
    }

    void loadQuest();

    return () => {
      cancelled = true;
    };
  }, [questId, questIdHex, publicKey]);

  const handleStepComplete = useCallback((stepNumber: number) => {
    setState((prev) => {
      const newCompleted = prev.completedSteps.includes(stepNumber)
        ? prev.completedSteps
        : [...prev.completedSteps, stepNumber];
      return {
        ...prev,
        completedSteps: newCompleted,
        currentStep: stepNumber + 1,
      };
    });
  }, []);

  const handleQuestClaimed = useCallback(() => {
    setState((prev) => ({ ...prev, claimed: true }));
  }, []);

  const handleSeedSteps = useCallback(async () => {
    const pk = publicKey;
    if (!pk) return;
    setSeeding(true);
    setSeedError(null);
    try {
      const steps = defaultQuestSteps();
      const prep = await setQuestStepsTx(pk, questIdHex, steps);
      if (!prep.success || !prep.xdr) {
        setSeedError(prep.error ?? "Failed to prepare seed transaction.");
        return;
      }
      const submit = await signAndSubmit(prep.xdr);
      if (submit.success) {
        setState((prev) => ({ ...prev, steps }));
      } else {
        setSeedError(
          submit.error ?? "Failed to sign or submit seed transaction."
        );
      }
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : "Seed failed.");
    } finally {
      setSeeding(false);
    }
  }, [publicKey, questIdHex, signAndSubmit]);

  const {
    hunt,
    steps,
    currentStep,
    completedSteps,
    claimed,
    loading,
    error,
    isHider,
  } = state;

  return (
    <RequireLevel level={3}>
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-destructive font-medium">
                Failed to load quest
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : hunt ? (
          <>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Swords className="size-5 text-purple-500" />
                      <h1 className="text-2xl font-bold">Quest Chain</h1>
                      <Badge variant="secondary">ID: {questId}</Badge>
                    </div>
                    <p className="text-muted-foreground">{hunt.clue}</p>
                  </div>
                  {claimed && (
                    <Badge className="bg-emerald-500">Claimed</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {hunt.latitude.toFixed(4)}, {hunt.longitude.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {new Date(hunt.deadline).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="size-4" />
                    {hunt.hiderPubkey.slice(0, 6)}...
                  </div>
                </div>
              </CardContent>
            </Card>

            <QuestProgress
              questId={questIdHex}
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepComplete={handleStepComplete}
              onQuestClaimed={handleQuestClaimed}
            />

            {steps.length === 0 && isHider && isConnected && (
              <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-purple-700 dark:text-purple-400">
                      Initialize Quest Steps
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Seed quest steps on-chain so hunters can find and complete
                      them. This writes {defaultQuestSteps().length} example
                      steps to the contract.
                    </p>
                  </div>
                  <Button
                    onClick={handleSeedSteps}
                    disabled={seeding}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {seeding ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-2" />
                        Seed Quest Steps
                      </>
                    )}
                  </Button>
                  {seedError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
                      {seedError}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {steps.length === 0 && !isHider && (
              <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4 text-center text-sm text-amber-700 dark:text-amber-400">
                  Quest steps belum tersedia on-chain. Hider perlu
                  menginisialisasi steps terlebih dahulu.
                </CardContent>
              </Card>
            )}

            {!isConnected && (
              <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4 text-center text-sm text-amber-700 dark:text-amber-400">
                  Connect your wallet to complete quest steps.
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Quest not found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RequireLevel>
  );
}

function mapSupabaseToHunt(row: Record<string, unknown>): Hunt {
  return {
    id: row.id as number,
    contractId: (row.contract_id as string) ?? null,
    hiderPubkey: row.hider_pubkey as string,
    huntType: row.hunt_type as Hunt["huntType"],
    clue: row.clue as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    radiusMeters: (row.radius_meters as number) ?? 50,
    amountStroops: (row.amount_stroops as number) ?? null,
    deadline: row.deadline as string,
    status: row.status as Hunt["status"],
    photoCid: (row.photo_cid as string) ?? null,
    createdAt: row.created_at as string,
  };
}

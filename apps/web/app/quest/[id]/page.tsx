"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { RequireLevel } from "@/components/feature-gate";
import { QuestProgress } from "@/components/quest/quest-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, MapPin, Clock, User } from "lucide-react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { getAllQuests } from "@/lib/supabase/client";
import type { Hunt, QuestStep } from "@/types";

interface QuestState {
  hunt: Hunt | null;
  steps: QuestStep[];
  currentStep: number;
  completedSteps: number[];
  claimed: boolean;
  loading: boolean;
  error: string | null;
}

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useWallet();
  const [state, setState] = useState<QuestState>({
    hunt: null,
    steps: [],
    currentStep: 0,
    completedSteps: [],
    claimed: false,
    loading: true,
    error: null,
  });

  const questId = id ?? "1";

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

        if (!cancelled) {
          if (quest) {
            setState((prev) => ({
              ...prev,
              hunt: mapSupabaseToHunt(quest),
              steps: generateMockSteps(questId),
              loading: false,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              hunt: null,
              steps: [],
              loading: false,
              error: null,
            }));
          }
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            hunt: null,
            steps: [],
            loading: false,
            error: "Failed to load quest data.",
          }));
        }
      }
    }

    void loadQuest();

    return () => {
      cancelled = true;
    };
  }, [questId]);

  const handleStepComplete = useCallback(
    (stepNumber: number) => {
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
    },
    []
  );

  const handleQuestClaimed = useCallback(() => {
    setState((prev) => ({ ...prev, claimed: true }));
  }, []);

  const { hunt, steps, currentStep, completedSteps, claimed, loading, error } = state;

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
              <p className="text-destructive font-medium">Failed to load quest</p>
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
              questId={questId}
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepComplete={handleStepComplete}
              onQuestClaimed={handleQuestClaimed}
            />

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

function generateMockSteps(questId: string): QuestStep[] {
  const hash = questId.padStart(64, "0").slice(0, 64);
  return [
    {
      stepNumber: 0,
      clueHash: hash.slice(0, 32) + "a".repeat(32),
      gpsLat: -6.2088,
      gpsLng: 106.8456,
      radius: 50,
      isFinal: false,
    },
    {
      stepNumber: 1,
      clueHash: hash.slice(0, 32) + "b".repeat(32),
      gpsLat: -6.1754,
      gpsLng: 106.8272,
      radius: 50,
      isFinal: false,
    },
    {
      stepNumber: 2,
      clueHash: hash.slice(0, 32) + "c".repeat(32),
      gpsLat: -6.1864,
      gpsLng: 106.8238,
      radius: 50,
      isFinal: true,
    },
  ];
}

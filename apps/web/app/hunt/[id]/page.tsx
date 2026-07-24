"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { RequireLevel } from "@/components/feature-gate";
import { ClaimHuntView } from "@/components/hunt/claim-hunt-view";
import { HiderApproveView } from "@/components/hunt/hider-approve-view";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/components/wallet/wallet-provider";
import { getHuntById } from "@/lib/supabase/client";
import type { Hunt } from "@/types";

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
          setHunt({
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
          });
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
          setHunt({
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
          });
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
            {isHider && (
              <HiderApproveView hunt={hunt} onClaimResolved={handleClaimResolved} />
            )}
            {!isHider && <ClaimHuntView hunt={hunt} />}
          </div>
        ) : null}
      </div>
    </RequireLevel>
  );
}

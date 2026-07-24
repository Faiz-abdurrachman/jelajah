"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, MapPin, User, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPendingClaims, updateClaimStatus } from "@/lib/supabase/client";
import type { Hunt } from "@/types";

interface PendingClaim {
  id: number;
  hunterPubkey: string;
  photoCid: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  submittedAt: string;
  hunter?: { display_name: string | null; public_key: string };
}

interface HiderApproveViewProps {
  hunt: Hunt;
  onClaimResolved: () => void;
}

export function HiderApproveView({ hunt, onClaimResolved }: HiderApproveViewProps) {
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingClaimId, setActingClaimId] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await getPendingClaims(hunt.id);
        const mapped = data.map((row: Record<string, unknown>) => ({
          id: Number(row.id),
          hunterPubkey: String(row.hunter_pubkey ?? ""),
          photoCid: row.photo_cid ? String(row.photo_cid) : null,
          gpsLat: row.gps_lat ? Number(row.gps_lat) : null,
          gpsLng: row.gps_lng ? Number(row.gps_lng) : null,
          submittedAt: String(row.submitted_at ?? ""),
          status: String(row.status ?? "pending"),
        }));
        setClaims(mapped);
      } catch {
        setActionError("Gagal memuat data klaim.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hunt.id]);

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  const handleApprove = async (claimId: number) => {
    setActingClaimId(claimId);
    setActionError(null);
    try {
      await updateClaimStatus(claimId, "approved");
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      onClaimResolved();
    } catch {
      setActionError("Gagal approve klaim.");
    } finally {
      setActingClaimId(null);
    }
  };

  const handleReject = async (claimId: number) => {
    setActingClaimId(claimId);
    setActionError(null);
    try {
      await updateClaimStatus(claimId, "rejected");
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      onClaimResolved();
    } catch {
      setActionError("Gagal reject klaim.");
    } finally {
      setActingClaimId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="size-5 text-amber-500" />
          Pending Claims ({claims.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
            {actionError}
          </p>
        )}

        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tidak ada klaim pending.
          </p>
        ) : (
          claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{claim.id}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(claim.submittedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {claim.hunter?.display_name ?? claim.hunterPubkey.slice(0, 8) + "..."}
                    </span>
                    {claim.gpsLat !== null && claim.gpsLng !== null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {claim.gpsLat.toFixed(5)}, {claim.gpsLng.toFixed(5)}
                      </span>
                    )}
                    {claim.photoCid && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="size-3" />
                        IPFS: {claim.photoCid.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleApprove(claim.id)}
                  disabled={actingClaimId !== null}
                >
                  {actingClaimId === claim.id ? (
                    <Clock className="size-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleReject(claim.id)}
                  disabled={actingClaimId !== null}
                >
                  <XCircle className="size-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

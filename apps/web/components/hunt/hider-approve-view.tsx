"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, MapPin, User, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/wallet/wallet-provider";
import { loadPendingClaims, resolveConfirmedClaim } from "@/lib/api/mvp";
import {
  approveClaimTx,
  pollTx,
  rejectClaimTx,
} from "@/lib/stellar/soroban";
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

interface PendingResolution {
  claimId: number;
  transactionHash: string;
  resolution: "approve" | "reject";
}

export function HiderApproveView({ hunt, onClaimResolved }: HiderApproveViewProps) {
  const { publicKey, signAndSubmit } = useWallet();
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingClaimId, setActingClaimId] = useState<number | null>(null);
  const [pendingResolution, setPendingResolution] = useState<PendingResolution | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await loadPendingClaims(hunt.id);
        const mapped = data.map((row) => ({
          id: Number(row.id),
          hunterPubkey: String(row.hunter_pubkey ?? ""),
          photoCid: row.photo_cid ? String(row.photo_cid) : null,
          gpsLat: row.gps_lat !== null ? Number(row.gps_lat) : null,
          gpsLng: row.gps_lng !== null ? Number(row.gps_lng) : null,
          submittedAt: String(row.submitted_at ?? ""),
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
      if (pendingResolution?.claimId === claimId && pendingResolution.resolution === "approve") {
        await resolveConfirmedClaim(claimId, pendingResolution.transactionHash, "approve");
        setPendingResolution(null);
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
        onClaimResolved();
        return;
      }
      if (!publicKey || !hunt.contractId) throw new Error("Wallet atau contract belum siap");
      const prepared = await approveClaimTx(publicKey, hunt.contractId);
      if (!prepared.success || !prepared.xdr) {
        throw new Error(prepared.error ?? "Gagal menyiapkan approval");
      }
      const submitted = await signAndSubmit(prepared.xdr);
      if (!submitted.success || !submitted.hash) {
        throw new Error(submitted.error ?? "Gagal mengirim approval");
      }
      const confirmation = await pollTx(submitted.hash, 30);
      if (!confirmation.success) throw new Error(confirmation.error ?? "Approval belum terkonfirmasi");
      setPendingResolution({ claimId, transactionHash: submitted.hash, resolution: "approve" });
      await resolveConfirmedClaim(claimId, submitted.hash, "approve");
      setPendingResolution(null);
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      onClaimResolved();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Gagal approve klaim.");
    } finally {
      setActingClaimId(null);
    }
  };

  const handleReject = async (claimId: number) => {
    setActingClaimId(claimId);
    setActionError(null);
    try {
      if (pendingResolution?.claimId === claimId && pendingResolution.resolution === "reject") {
        await resolveConfirmedClaim(claimId, pendingResolution.transactionHash, "reject");
        setPendingResolution(null);
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
        onClaimResolved();
        return;
      }
      if (!publicKey || !hunt.contractId) throw new Error("Wallet atau contract belum siap");
      const reason = window.prompt("Alasan penolakan claim:");
      if (!reason?.trim()) return;
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(reason.trim())
      );
      const reasonHash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      const prepared = await rejectClaimTx(publicKey, hunt.contractId, reasonHash);
      if (!prepared.success || !prepared.xdr) {
        throw new Error(prepared.error ?? "Gagal menyiapkan penolakan");
      }
      const submitted = await signAndSubmit(prepared.xdr);
      if (!submitted.success || !submitted.hash) {
        throw new Error(submitted.error ?? "Gagal mengirim penolakan");
      }
      const confirmation = await pollTx(submitted.hash, 30);
      if (!confirmation.success) throw new Error(confirmation.error ?? "Penolakan belum terkonfirmasi");
      setPendingResolution({ claimId, transactionHash: submitted.hash, resolution: "reject" });
      await resolveConfirmedClaim(claimId, submitted.hash, "reject");
      setPendingResolution(null);
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      onClaimResolved();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Gagal reject klaim.");
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
                      <a
                        className="flex items-center gap-1 underline-offset-2 hover:underline"
                        href={`https://gateway.pinata.cloud/ipfs/${claim.photoCid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ImageIcon className="size-3" />
                        IPFS: {claim.photoCid.slice(0, 10)}...
                      </a>
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
                  disabled={
                    actingClaimId !== null ||
                    (pendingResolution?.claimId === claim.id &&
                      pendingResolution.resolution !== "approve")
                  }
                >
                  {actingClaimId === claim.id ? (
                    <Clock className="size-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4 mr-1" />
                  )}
                  {pendingResolution?.claimId === claim.id && pendingResolution.resolution === "approve"
                    ? "Coba Index Ulang"
                    : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleReject(claim.id)}
                  disabled={
                    actingClaimId !== null ||
                    (pendingResolution?.claimId === claim.id &&
                      pendingResolution.resolution !== "reject")
                  }
                >
                  <XCircle className="size-4 mr-1" />
                  {pendingResolution?.claimId === claim.id && pendingResolution.resolution === "reject"
                    ? "Coba Index Ulang"
                    : "Reject"}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Camera, CheckCircle, Clock, XCircle, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/wallet/wallet-provider";
import type { Hunt } from "@/types";
import { submitClaimTx, pollTx } from "@/lib/stellar/soroban";
import { uploadToIpfs, isIpfsConfigured } from "@/lib/ipfs/pinata";
import { insertClaim } from "@/lib/supabase/client";

type ClaimPhase = "idle" | "checking" | "canClaim" | "uploading" | "signing" | "pending" | "approved" | "rejected";

interface GeoPosition {
  lat: number;
  lng: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface ClaimHuntViewProps {
  hunt: Hunt;
}

export function ClaimHuntView({ hunt }: ClaimHuntViewProps) {
  const { isConnected, publicKey, signAndSubmit } = useWallet();
  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [currentPosition, setCurrentPosition] = useState<GeoPosition | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // GPS tracking
  const startGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS tidak didukung browser ini");
      return;
    }

    setPhase("checking");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setCurrentPosition({ lat: userLat, lng: userLng });

        const dist = haversineDistance(userLat, userLng, hunt.latitude, hunt.longitude);
        setDistance(Math.round(dist));

        if (dist <= hunt.radiusMeters) {
          setPhase("canClaim");
        }
      },
      (err) => {
        setGpsError(`Gagal mendapatkan lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    setGpsWatchId(watchId);
  }, [hunt]);

  useEffect(() => {
    return () => {
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
  }, [gpsWatchId]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (!claimError) return;
    const timer = setTimeout(() => setClaimError(null), 5000);
    return () => clearTimeout(timer);
  }, [claimError]);

  // Photo handling
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!photoFile || !currentPosition || !publicKey) return;
    setClaimError(null);

    // Phase 1: Upload photo to IPFS
    setPhase("uploading");

    let photoCidHex = "";
    try {
      if (isIpfsConfigured()) {
        const ipfsResult = await uploadToIpfs(photoFile);
        photoCidHex = ipfsResult.cid.slice(0, 64).padEnd(64, "0");
      } else {
        // Fallback: hash the filename as a simple CID placeholder
        const encoder = new TextEncoder();
        const data = encoder.encode(photoFile.name + photoFile.size.toString());
        const hashBuf = await crypto.subtle.digest("SHA-256", data);
        photoCidHex = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch {
      setClaimError("Gagal upload foto ke IPFS");
      setPhase("canClaim");
      return;
    }

    // Phase 2: Build & simulate contract tx
    setPhase("signing");

    const contractAddr = hunt.contractId;
    if (!contractAddr) {
      setClaimError("Contract hunt belum di-deploy");
      setPhase("canClaim");
      return;
    }

    const prepareResult = await submitClaimTx(
      publicKey,
      contractAddr,
      photoCidHex,
      currentPosition.lat,
      currentPosition.lng
    );

    if (!prepareResult.success || !prepareResult.xdr) {
      setClaimError(prepareResult.error ?? "Gagal menyiapkan transaksi");
      setPhase("canClaim");
      return;
    }

    // Phase 3: Sign via Freighter & submit to network
    const signResult = await signAndSubmit(prepareResult.xdr);

    if (!signResult.success) {
      setClaimError(signResult.error ?? "Gagal sign/submit transaksi");
      setPhase("canClaim");
      return;
    }

    const submittedHash = signResult.hash;

    // Phase 4: Persist claim to Supabase
    try {
      await insertClaim({
        huntId: hunt.id,
        hunterPubkey: publicKey,
        photoCid: photoCidHex || null,
        gpsLat: currentPosition.lat,
        gpsLng: currentPosition.lng,
        txHash: submittedHash,
      });
    } catch {
      // Claim is on-chain even if DB insert fails — non-blocking
    }

    setTxHash(submittedHash);
    setPhase("pending");

    // Poll for tx confirmation (fire-and-forget)
    void pollTx(submittedHash, 30);
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Connect wallet untuk claim hunt</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hunt Info Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold mb-1">Hunt #{hunt.id}</h1>
              <p className="text-sm text-muted-foreground italic">
                &ldquo;{hunt.clue}&rdquo;
              </p>
            </div>
            <Badge variant={hunt.status === "Active" ? "default" : "secondary"}>
              {hunt.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Reward: </span>
              <span className="font-medium">
                {hunt.amountStroops ? `${hunt.amountStroops / 10_000_000} XLM` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Radius: </span>
              <span className="font-medium">{hunt.radiusMeters}m</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Deadline: </span>
              <span className="font-medium">
                {new Date(hunt.deadline).toLocaleDateString("id-ID")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="size-4" />
            Status Lokasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gpsError ? (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="size-4" />
              {gpsError}
              <Button variant="outline" size="sm" onClick={startGps}>
                Coba Lagi
              </Button>
            </div>
          ) : phase === "idle" ? (
            <Button onClick={startGps} size="sm">
              <MapPin className="mr-1 size-4" />
              Mulai Cek Lokasi
            </Button>
          ) : (
            <div className="space-y-2">
              {currentPosition && (
                <div className="text-xs text-muted-foreground font-mono">
                  {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                </div>
              )}
              {distance !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Jarak: {distance} m</span>
                  {distance <= hunt.radiusMeters ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="mr-1 size-3" />
                      Dalam Radius
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="mr-1 size-3" />
                      Terlalu Jauh ({distance - hunt.radiusMeters}m)
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Capture + Upload */}
      {phase === "canClaim" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Camera className="size-4" />
              Foto Bukti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ambil foto di lokasi ini sebagai bukti
            </p>

            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
              >
                <Camera className="mr-1 size-4" />
                Ambil Foto
              </Button>
            </div>

            {photoPreview && (
              <div className="relative rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <Button
              className="w-full"
              disabled={!photoFile}
              onClick={handleSubmit}
            >
              <Upload className="mr-2 size-4" />
              Submit Claim
            </Button>
            {claimError && (
              <p className="text-sm text-destructive text-center">{claimError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploading / Signing states */}
      {(phase === "uploading" || phase === "signing") && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Loader2 className="size-10 text-primary mx-auto animate-spin" />
            <h3 className="font-semibold">
              {phase === "uploading" ? "Mengupload foto..." : "Menandatangani transaksi..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {phase === "uploading"
                ? "Upload foto ke IPFS"
                : "Buka Freighter untuk menandatangani transaksi"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Claim Status — Pending */}
      {phase === "pending" && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Clock className="size-10 text-primary mx-auto" />
            <h3 className="font-semibold">Menunggu Verifikasi</h3>
            <p className="text-sm text-muted-foreground">
              Hider punya waktu untuk verifikasi claim kamu
            </p>
            {txHash && (
              <p className="text-xs font-mono text-muted-foreground break-all">
                Tx: {txHash.slice(0, 12)}...{txHash.slice(-8)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Auto-release jika hider tidak merespon
            </p>
          </CardContent>
        </Card>
      )}

      {phase === "approved" && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <CheckCircle className="size-10 text-green-500 mx-auto" />
            <h3 className="font-semibold text-green-600">Claim Disetujui!</h3>
            <p className="text-sm text-muted-foreground">
              Reward sudah masuk ke wallet kamu
            </p>
          </CardContent>
        </Card>
      )}

      {phase === "rejected" && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <XCircle className="size-10 text-destructive mx-auto" />
            <h3 className="font-semibold text-destructive">Claim Ditolak</h3>
            <p className="text-sm text-muted-foreground">
              Foto tidak sesuai dengan referensi hider
            </p>
            <Button variant="outline" size="sm">
              Ajukan Dispute
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


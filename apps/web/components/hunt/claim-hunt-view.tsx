"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Camera, CheckCircle, Clock, XCircle, AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/wallet/wallet-provider";
import { HuntStatus } from "@/config/hunt-types";
import type { Hunt } from "@/types";
import { submitClaimTx } from "@/lib/stellar/soroban";
import { uploadToIpfs, isIpfsConfigured } from "@/lib/ipfs/pinata";

type ClaimPhase = "idle" | "checking" | "canClaim" | "submitting" | "pending" | "approved" | "rejected";

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

// ─── Mock hunt data ─────────────────────────────────

const MOCK_HUNT: Hunt = {
  id: 1,
  contractId: "CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  hiderPubkey: "GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  huntType: 0,
  clue: "Cari patung kuda putih di tengah kota. Di bawah patung, ada sebuah kotak kecil berisi petunjuk selanjutnya.",
  latitude: -6.2088,
  longitude: 106.8456,
  radiusMeters: 50,
  amountStroops: 100_000_000,
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "Active" as HuntStatus,
  photoCid: null,
  createdAt: new Date().toISOString(),
};

export function ClaimHuntView({ hunt: huntProp }: { hunt?: Hunt }) {
  const { isConnected, publicKey } = useWallet();
  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [currentPosition, setCurrentPosition] = useState<GeoPosition | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const hunt = huntProp ?? MOCK_HUNT;

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

    try {
      // Upload photo to IPFS (if configured)
      let photoCidHex = "0000000000000000000000000000000000000000000000000000000000000000";
      if (isIpfsConfigured()) {
        const ipfsResult = await uploadToIpfs(photoFile);
        const cidBuffer = Buffer.from(ipfsResult.cid.padEnd(64, "0").slice(0, 64));
        photoCidHex = cidBuffer.toString("hex").padEnd(64, "0").slice(0, 64);
      }

      // Call contract
      const result = await submitClaimTx(
        publicKey,
        MOCK_HUNT.contractId ?? "",
        photoCidHex,
        currentPosition.lat,
        currentPosition.lng
      );

      if (result.success) {
        setTxHash(result.hash || null);
        setPhase("pending");
      } else {
        setClaimError(result.error ?? "Gagal submit claim");
      }
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const timeRemaining = "23:45:12";

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
              <span className="font-medium">Rp 100.000</span>
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

      {/* Photo Capture */}
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

      {/* Claim Status */}
      {phase === "pending" && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Clock className="size-10 text-primary mx-auto" />
            <h3 className="font-semibold">Menunggu Verifikasi</h3>
            <p className="text-sm text-muted-foreground">
              Hider punya waktu 24 jam untuk verifikasi
            </p>
            <div className="text-2xl font-mono font-bold text-primary">
              {timeRemaining}
            </div>
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

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, MapPin, Loader2, CheckCircle2, Upload } from "lucide-react";
import type { QuestStep } from "@/types";
import { completeStepTx } from "@/lib/stellar/soroban";

interface QuestStepViewProps {
  questId: string;
  step: QuestStep;
  onComplete: () => void;
  onCancel: () => void;
}

export function QuestStepView({ questId, step, onComplete, onCancel }: QuestStepViewProps) {
  const { publicKey, signAndSubmit } = useWallet();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsValid, setGpsValid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const checkGps = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          step.gpsLat,
          step.gpsLng
        );
        if (distance <= step.radius) {
          setGpsValid(true);
          setError(null);
        } else {
          setGpsValid(false);
          setError(`You are ${Math.round(distance)}m away. Get within ${step.radius}m.`);
        }
      },
      () => {
        setError("Unable to get GPS location. Please enable location services.");
      }
    );
  };

  const handleSubmit = async () => {
    if (!publicKey || !photo) return;

    if (!gpsValid) {
      setError("GPS verification required before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const photoHex = await fileToSha256Hex(photo);
      const prep = await completeStepTx(publicKey, questId, step.stepNumber, photoHex);

      if (!prep.success || !prep.xdr) {
        setError(prep.error ?? "Failed to prepare complete step tx.");
        return;
      }

      const submit = await signAndSubmit(prep.xdr);
      if (submit.success) {
        onComplete();
      } else {
        setError(submit.error ?? "Failed to sign or submit complete step.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">GPS Verification</label>
          <Button
            variant={gpsValid ? "default" : "outline"}
            size="sm"
            onClick={checkGps}
            className={gpsValid ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            <MapPin className="size-4 mr-2" />
            {gpsValid ? "GPS Verified" : "Verify GPS"}
          </Button>
          {gpsValid && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              Within {step.radius}m radius
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Photo Evidence</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              <Image
                src={photoPreview}
                alt="Evidence preview"
                width={600}
                height={200}
                unoptimized
                className="w-full rounded-lg object-cover max-h-48"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-32 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Camera className="size-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to take photo</span>
              </div>
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!publicKey || !photo || !gpsValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="size-4 mr-2" />
                Submit Step
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fileToSha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.padEnd(64, "0").slice(0, 64);
}

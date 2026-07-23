"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Layers,
  Zap,
  Puzzle,
  Camera,
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/components/wallet/wallet-provider";
import { HUNT_RULES, MAP_CONFIG } from "@/config/constants";
import { HuntType, HUNT_TYPE_LABELS, HUNT_TYPE_DESCRIPTIONS } from "@/config/hunt-types";
import type { HuntType as HuntTypeEnum } from "@/config/hunt-types";
import { createHuntTx } from "@/lib/stellar/soroban";
import { uploadToIpfs, isIpfsConfigured } from "@/lib/ipfs/pinata";

// ─── Types ───────────────────────────────────────────

interface HuntFormData {
  huntType: HuntTypeEnum | null;
  clue: string;
  photoFile: File | null;
  latitude: string;
  longitude: string;
  radius: number;
  amount: string;
  asset: "XLM" | "USDC";
  deadline: string;
}

const INITIAL_FORM: HuntFormData = {
  huntType: null,
  clue: "",
  photoFile: null,
  latitude: MAP_CONFIG.defaultCenter.lat.toString(),
  longitude: MAP_CONFIG.defaultCenter.lng.toString(),
  radius: 50,
  amount: "",
  asset: "XLM",
  deadline: "",
};

const HUNT_TYPE_OPTIONS: {
  type: HuntTypeEnum;
  icon: typeof MapPin;
  color: string;
}[] = [
  { type: HuntType.Gps, icon: MapPin, color: "text-blue-500" },
  { type: HuntType.Quest, icon: Layers, color: "text-purple-500" },
  { type: HuntType.Race, icon: Zap, color: "text-amber-500" },
  { type: HuntType.Puzzle, icon: Puzzle, color: "text-emerald-500" },
  { type: HuntType.Photo, icon: Camera, color: "text-rose-500" },
];

// ─── Component ───────────────────────────────────────

export function CreateHuntWizard() {
  const router = useRouter();
  const { isConnected, connect, publicKey } = useWallet();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<HuntFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof HuntFormData>(
    key: K,
    value: HuntFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return form.huntType !== null;
      case 1: return form.clue.trim().length > 0;
      case 2: return form.latitude.trim() !== "" && form.longitude.trim() !== "";
      case 3: {
        const amount = parseInt(form.amount, 10);
        return !isNaN(amount) && amount >= HUNT_RULES.minReward && amount <= HUNT_RULES.maxRewardFree;
      }
      case 4: return form.deadline.trim() !== "";
      case 5: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (step < 5 && canProceed()) setStep((s) => s + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Upload photo to IPFS (if file provided and Pinata configured)
      let photoCid = "";
      if (form.photoFile && isIpfsConfigured()) {
        const ipfsResult = await uploadToIpfs(form.photoFile);
        photoCid = ipfsResult.cid;
      }

      // Step 2: Generate clue hash (simplified — in production use SHA256)
      const clueHashHex = Buffer.from(form.clue + photoCid)
        .toString("hex")
        .padEnd(64, "0")
        .slice(0, 64);

      // Step 3: Calculate deadline unix timestamp
      const deadlineUnix = Math.floor(new Date(form.deadline).getTime() / 1000);

      // Step 4: Count amount in stroops (1 XLM = 10^7 stroops; or scale from IDR)
      const amountStroops = BigInt(Math.round(parseFloat(form.amount) * 10_000_000));

      // Step 5: Call contract
      const result = await createHuntTx(
        publicKey!,
        amountStroops,
        parseFloat(form.latitude),
        parseFloat(form.longitude),
        parseInt(form.radius.toString(), 10),
        deadlineUnix,
        clueHashHex,
        form.huntType!
      );

      if (result.success) {
        setTxHash(result.hash || null);
        setIsSuccess(true);
      } else {
        setSubmitError(result.error ?? "Gagal membuat hunt");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ──────────────────────────────────

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-6">
          <Check className="size-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Hunt Berhasil Dibuat!</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Harta karunmu sudah live di peta. Hunter akan segera mencari!
        </p>
        {txHash ? (
          <div className="mb-6 rounded-lg bg-muted px-4 py-2 text-xs font-mono text-center break-all">
            <span className="text-muted-foreground">Tx: </span>
            {txHash.slice(0, 12)}...{txHash.slice(-8)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-6">
            Transaksi disimulasikan — deploy contract untuk tx on-chain
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/map")}>
            Lihat Peta
          </Button>
          <Button onClick={() => router.push("/profile")}>
            Lihat Profile
          </Button>
      </div>

      {submitError && (
        <p className="mt-4 text-sm text-destructive text-center">{submitError}</p>
      )}
    </div>
  );
}

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {["Type", "Clue", "GPS", "Reward", "Deadline", "Review"].map(
          (label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className="hidden sm:block text-xs text-muted-foreground">
                {label}
              </span>
              {i < 5 && (
                <div
                  className={`hidden sm:block mx-2 h-px w-6 ${
                    i < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6">
          {step === 0 && <StepTypeSelect form={form} updateField={updateField} />}
          {step === 1 && <StepCluePhoto form={form} updateField={updateField} />}
          {step === 2 && <StepGPSLocation form={form} updateField={updateField} />}
          {step === 3 && <StepReward form={form} updateField={updateField} />}
          {step === 4 && <StepDeadline form={form} updateField={updateField} />}
          {step === 5 && (
            <StepReview
              form={form}
              isConnected={isConnected}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep} disabled={step === 0}>
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Button>
        {step < 5 ? (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Lanjut
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isConnected ? (isSubmitting ? "Memproses..." : "Buat Hunt") : "Connect Wallet"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Hunt Type ───────────────────────────────

function StepTypeSelect({
  form,
  updateField,
}: {
  form: HuntFormData;
  updateField: (k: keyof HuntFormData, v: HuntFormData[keyof HuntFormData]) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Pilih Jenis Hunt</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Apa jenis harta karun yang mau kamu buat?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HUNT_TYPE_OPTIONS.map(({ type, icon: Icon, color }) => (
          <button
            key={type}
            type="button"
            onClick={() => updateField("huntType", type)}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary/50 ${
              form.huntType === type
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card"
            }`}
          >
            <div className={`rounded-full bg-muted p-2 ${color}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {HUNT_TYPE_LABELS[type]}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {HUNT_TYPE_DESCRIPTIONS[type]}
              </div>
            </div>
            {form.huntType === type && (
              <Check className="ml-auto size-4 text-primary shrink-0 mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Clue & Photo ────────────────────────────

function StepCluePhoto({
  form,
  updateField,
}: {
  form: HuntFormData;
  updateField: (k: keyof HuntFormData, v: HuntFormData[keyof HuntFormData]) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Clue & Foto</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Tulis petunjuk dan upload foto referensi (hanya untuk verifikasi).
      </p>

      <label className="block text-sm font-medium mb-1.5">Clue</label>
      <textarea
        className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        placeholder="Tulis petunjuk yang mengarah ke lokasi hunt..."
        value={form.clue}
        onChange={(e) => updateField("clue", e.target.value)}
      />

      <label className="block text-sm font-medium mt-4 mb-1.5">
        Foto Referensi (opsional)
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
        <Upload className="size-4" />
        {form.photoFile ? form.photoFile.name : "Upload foto..."}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            updateField("photoFile", file);
          }}
        />
      </label>
    </div>
  );
}

// ─── Step 3: GPS Location ────────────────────────────

function StepGPSLocation({
  form,
  updateField,
}: {
  form: HuntFormData;
  updateField: (k: keyof HuntFormData, v: HuntFormData[keyof HuntFormData]) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Lokasi GPS</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Tentukan koordinat lokasi harta karun.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Latitude</label>
          <Input
            type="text"
            placeholder="-6.2088"
            value={form.latitude}
            onChange={(e) => updateField("latitude", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Longitude</label>
          <Input
            type="text"
            placeholder="106.8456"
            value={form.longitude}
            onChange={(e) => updateField("longitude", e.target.value)}
          />
        </div>
      </div>

      <label className="block text-sm font-medium mb-1.5">
        Radius: {form.radius} meter
      </label>
      <input
        type="range"
        min={HUNT_RULES.minGpsRadius}
        max={HUNT_RULES.maxGpsRadius}
        value={form.radius}
        onChange={(e) => updateField("radius", parseInt(e.target.value, 10))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{HUNT_RULES.minGpsRadius}m</span>
        <span>{HUNT_RULES.maxGpsRadius}m</span>
      </div>

      {/* Map placeholder */}
      <div className="mt-4 flex items-center justify-center rounded-lg border bg-muted/30 p-8 text-sm text-muted-foreground">
        <MapPin className="size-4 mr-2" />
        Mapbox map will render here for pin selection
      </div>
    </div>
  );
}

// ─── Step 4: Reward ──────────────────────────────────

function StepReward({
  form,
  updateField,
}: {
  form: HuntFormData;
  updateField: (k: keyof HuntFormData, v: HuntFormData[keyof HuntFormData]) => void;
}) {
  const amount = parseInt(form.amount, 10);
  const isValid = !isNaN(amount) && amount > 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Reward</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Berapa reward untuk hunter yang berhasil menemukan hunt ini?
      </p>

      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">
            Jumlah (IDR)
          </label>
          <Input
            type="number"
            placeholder="Min Rp 10.000"
            value={form.amount}
            onChange={(e) => updateField("amount", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Asset</label>
          <div className="flex gap-1">
            <Button
              variant={form.asset === "XLM" ? "default" : "outline"}
              size="sm"
              onClick={() => updateField("asset", "XLM")}
            >
              XLM
            </Button>
            <Button
              variant={form.asset === "USDC" ? "default" : "outline"}
              size="sm"
              onClick={() => updateField("asset", "USDC")}
            >
              USDC
            </Button>
          </div>
        </div>
      </div>

      {isValid && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Reward</span>
            <span className="font-medium">
              Rp {amount.toLocaleString("id-ID")}
            </span>
          </div>
          {amount > HUNT_RULES.maxRewardFree && (
            <p className="text-xs text-destructive mt-2">
              Max reward untuk free user Rp 5.000.000. Upgrade untuk reward lebih besar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Deadline ────────────────────────────────

function StepDeadline({
  form,
  updateField,
}: {
  form: HuntFormData;
  updateField: (k: keyof HuntFormData, v: HuntFormData[keyof HuntFormData]) => void;
}) {
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + HUNT_RULES.minDeadlineHours);
  const minDateStr = minDate.toISOString().slice(0, 16);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + HUNT_RULES.maxDeadlineDays);
  const maxDateStr = maxDate.toISOString().slice(0, 16);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Deadline</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Sampai kapan hunter bisa mencari hunt ini?
      </p>

      <label className="block text-sm font-medium mb-1.5">
        Deadline Hunt
      </label>
      <Input
        type="datetime-local"
        min={minDateStr}
        max={maxDateStr}
        value={form.deadline}
        onChange={(e) => updateField("deadline", e.target.value)}
      />
      <p className="text-xs text-muted-foreground mt-2">
        Minimal {HUNT_RULES.minDeadlineHours} jam, maksimal {HUNT_RULES.maxDeadlineDays} hari dari sekarang.
      </p>
    </div>
  );
}

// ─── Step 6: Review & Sign ───────────────────────────

function StepReview({
  form,
  isConnected,
}: {
  form: HuntFormData;
  isConnected: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Review Hunt</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Periksa kembali detail hunt sebelum dibuat.
      </p>

      <div className="space-y-3">
        <ReviewRow label="Tipe" value={form.huntType !== null ? HUNT_TYPE_LABELS[form.huntType] : ""} />
        <ReviewRow label="Clue" value={form.clue} />
        <ReviewRow
          label="Lokasi"
          value={`${form.latitude}, ${form.longitude}`}
        />
        <ReviewRow label="Radius" value={`${form.radius} meter`} />
        <ReviewRow
          label="Reward"
          value={`Rp ${parseInt(form.amount, 10).toLocaleString("id-ID")} (${form.asset})`}
        />
        <ReviewRow
          label="Deadline"
          value={new Date(form.deadline).toLocaleString("id-ID")}
        />
      </div>

      {!isConnected && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Connect wallet untuk membuat hunt.
        </p>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );
}

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
import { createHuntTx, pollTx } from "@/lib/stellar/soroban";
import { uploadToIpfs } from "@/lib/ipfs/pinata";
import { indexConfirmedHunt } from "@/lib/api/mvp";

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

function randomBytes32Hex(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

// ─── Component ───────────────────────────────────────

export function CreateHuntWizard() {
  const router = useRouter();
  const { isConnected, connect, publicKey, signAndSubmit } = useWallet();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<HuntFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [pendingIndex, setPendingIndex] = useState<{
    transactionHash: string;
    huntIdHash: string;
    photoCid: string | null;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof HuntFormData>(
    key: K,
    value: HuntFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return form.huntType === HuntType.Gps;
      case 1: return form.clue.trim().length > 0;
      case 2: return form.latitude.trim() !== "" && form.longitude.trim() !== "";
      case 3: {
        const amount = parseFloat(form.amount);
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
    const pk = publicKey;
    const huntType = form.huntType;
    if (!pk || huntType === null) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // If the chain call already succeeded, retry only the idempotent index step.
      if (pendingIndex) {
        const confirmation = await pollTx(pendingIndex.transactionHash, 30);
        if (!confirmation.success) {
          throw new Error(confirmation.error ?? "Transaksi belum terkonfirmasi");
        }
        await indexConfirmedHunt({ ...pendingIndex, clue: form.clue });
        setIsSuccess(true);
        return;
      }

      // Step 1: Upload optional reference photo through the authenticated server.
      let photoCid = "";
      if (form.photoFile) {
        const ipfsResult = await uploadToIpfs(form.photoFile);
        photoCid = ipfsResult.cid;
      }

      // Step 2: Generate canonical IDs and metadata hash.
      const huntIdHash = randomBytes32Hex();
      const clueHashHex = await sha256Hex(form.clue + photoCid);

      // Step 3: Calculate deadline unix timestamp
      const deadlineUnix = Math.floor(new Date(form.deadline).getTime() / 1000);

      // Step 4: Count amount in stroops (1 XLM = 10^7 stroops; or scale from IDR)
      const amountStroops = BigInt(Math.round(parseFloat(form.amount) * 10_000_000));

      // Step 5: Build & simulate contract tx
      const result = await createHuntTx(
        pk,
        huntIdHash,
        amountStroops,
        parseFloat(form.latitude),
        parseFloat(form.longitude),
        parseInt(form.radius.toString(), 10),
        deadlineUnix,
        clueHashHex,
        huntType
      );

      if (!result.success || !result.xdr) {
        setSubmitError(result.error ?? "Gagal mempersiapkan transaksi");
        return;
      }

      // Step 6: Sign via Freighter & submit to network
      const submitResult = await signAndSubmit(result.xdr);
      if (!submitResult.success || !submitResult.hash) {
        setSubmitError(submitResult.error ?? "Gagal submit transaksi");
        return;
      }

      setTxHash(submitResult.hash);
      const indexPayload = {
        transactionHash: submitResult.hash,
        huntIdHash,
        photoCid: photoCid || null,
      };
      setPendingIndex(indexPayload);

      // Step 7: wait for finality, then let the server verify and index the call.
      const confirmation = await pollTx(submitResult.hash, 30);
      if (!confirmation.success) {
        throw new Error(confirmation.error ?? "Transaksi belum terkonfirmasi");
      }
      await indexConfirmedHunt({ ...indexPayload, clue: form.clue });

      setIsSuccess(true);
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
            Menunggu konfirmasi transaksi...
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
            {isConnected
              ? isSubmitting
                ? "Memproses..."
                : pendingIndex
                  ? "Coba Index Ulang"
                  : "Buat Hunt"
              : "Connect Wallet"}
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
        {HUNT_TYPE_OPTIONS.map(({ type, icon: Icon, color }) => {
          const available = type === HuntType.Gps;
          return (
          <button
            key={type}
            type="button"
            onClick={() => available && updateField("huntType", type)}
            disabled={!available}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary/50 ${
              form.huntType === type
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card"
            } ${available ? "" : "cursor-not-allowed opacity-50"}`}
          >
            <div className={`rounded-full bg-muted p-2 ${color}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {HUNT_TYPE_LABELS[type]}
                {!available && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Segera
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {HUNT_TYPE_DESCRIPTIONS[type]}
              </div>
            </div>
            {form.huntType === type && (
              <Check className="ml-auto size-4 text-primary shrink-0 mt-1" />
            )}
          </button>
          );
        })}
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
  const amount = parseFloat(form.amount);
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
            Jumlah XLM
          </label>
          <Input
            type="number"
            min={HUNT_RULES.minReward}
            max={HUNT_RULES.maxRewardFree}
            step="0.1"
            placeholder="Contoh: 5"
            value={form.amount}
            onChange={(e) => updateField("amount", e.target.value)}
          />
        </div>
        <div className="self-end rounded-md border bg-muted px-4 py-2 text-sm font-medium">
          XLM
        </div>
      </div>

      {isValid && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Reward</span>
            <span className="font-medium">
              {amount.toLocaleString("id-ID", { maximumFractionDigits: 7 })} XLM
            </span>
          </div>
          {amount > HUNT_RULES.maxRewardFree && (
            <p className="text-xs text-destructive mt-2">
              Maksimum reward MVP adalah {HUNT_RULES.maxRewardFree} XLM.
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
          value={`${parseFloat(form.amount).toLocaleString("id-ID", { maximumFractionDigits: 7 })} XLM`}
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

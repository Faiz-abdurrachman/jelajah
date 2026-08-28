"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCampaign } from "@/lib/api/campaigns";
import type { CampaignDto } from "@/lib/data/level4";

interface CampaignCreateProps {
  onCreated: (campaign: CampaignDto) => void;
  onCancel: () => void;
}

interface CampaignForm {
  name: string;
  description: string;
  budget: string;
  startDate: string;
  endDate: string;
}

const INITIAL_FORM: CampaignForm = { name: "", description: "", budget: "", startDate: "", endDate: "" };
const STEPS = ["Brief", "Budget", "Schedule", "Review"];

export function CampaignCreate({ onCreated, onCancel }: CampaignCreateProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof CampaignForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError(null);
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length >= 3 && form.description.length <= 500;
      case 1: return /^\d{1,5}(?:\.\d{1,7})?$/.test(form.budget) && Number(form.budget) > 0;
      case 2: return Boolean(form.startDate && form.endDate && form.endDate > form.startDate);
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        name: form.name.trim(),
        description: form.description.trim(),
        budgetXlm: form.budget,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      onCreated(campaign);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Gagal membuat campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-emerald-200 shadow-none">
      <div className="border-b bg-emerald-950 px-5 py-4 text-white">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">New activation</p>
        <h2 className="mt-1 text-lg font-semibold">Rancang campaign lapangan</h2>
      </div>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="grid grid-cols-4 gap-2" aria-label="Campaign creation progress">
          {STEPS.map((item, index) => (
            <div key={item} className="space-y-2">
              <div className={`h-1 rounded-full ${index <= step ? "bg-emerald-600" : "bg-muted"}`} />
              <span className={`text-xs ${index === step ? "font-semibold" : "text-muted-foreground"}`}>{item}</span>
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <Field label="Nama campaign" hint="3–100 karakter">
              <Input autoFocus maxLength={100} placeholder="Contoh: Jelajah Kota Tua" value={form.name} onChange={updateField("name")} />
            </Field>
            <Field label="Tujuan campaign" hint={`${form.description.length}/500`}>
              <Input maxLength={500} placeholder="Apa pengalaman yang ingin dibuat untuk peserta?" value={form.description} onChange={updateField("description")} />
            </Field>
            <p className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">Lokasi, radius, clue, dan reward ditentukan saat mendanai setiap hunt agar selalu sama dengan data contract.</p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <Field label="Target budget" hint="Stellar Testnet XLM">
              <div className="relative">
                <Input autoFocus inputMode="decimal" placeholder="100" value={form.budget} onChange={updateField("budget")} className="pr-14 font-mono text-lg" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">XLM</span>
              </div>
            </Field>
            <p className="text-xs leading-5 text-muted-foreground">Budget adalah target operasional. Saldo funded hanya bertambah dari reward hunt yang benar-benar terkunci melalui contract Testnet.</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mulai"><Input autoFocus type="date" value={form.startDate} onChange={updateField("startDate")} /></Field>
            <Field label="Selesai"><Input type="date" value={form.endDate} onChange={updateField("endDate")} /></Field>
            {form.startDate && form.endDate && form.endDate <= form.startDate ? <p role="alert" className="text-sm text-destructive sm:col-span-2">Tanggal selesai harus setelah tanggal mulai.</p> : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="font-semibold">{form.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{form.description || "Tanpa deskripsi tambahan"}</p>
              <dl className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Target budget</dt><dd className="mt-1 font-mono font-semibold">{form.budget} XLM</dd></div>
                <div><dt className="text-xs text-muted-foreground">Periode</dt><dd className="mt-1 font-medium">{form.startDate} → {form.endDate}</dd></div>
              </dl>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Setelah workspace dibuat, lanjutkan ke hunt wizard untuk melakukan contract call dan mendanai escrow.</p>
          </div>
        ) : null}

        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

        <div className="flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>Batal</Button>
          <div className="flex gap-2">
            {step > 0 ? <Button variant="outline" onClick={() => setStep((current) => current - 1)} disabled={submitting}><ArrowLeft className="mr-2 size-4" /> Kembali</Button> : null}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((current) => current + 1)} disabled={!canNext()} className="flex-1 bg-emerald-700 text-white hover:bg-emerald-800 sm:flex-none">Lanjut <ArrowRight className="ml-2 size-4" /></Button>
            ) : (
              <Button onClick={() => void handleSubmit()} disabled={submitting} className="flex-1 bg-emerald-700 text-white hover:bg-emerald-800 sm:flex-none">{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Buat & danai hunt</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="flex items-center justify-between gap-3 text-sm font-medium">{label}{hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}</span>{children}</label>;
}

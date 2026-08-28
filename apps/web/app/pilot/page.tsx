"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { RequireLevel } from "@/components/feature-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/components/wallet/wallet-provider";
import { loadPilotStatus, startPilot, submitPilotFeedback } from "@/lib/api/pilot";
import type { PilotRole, PilotStatusDto } from "@/lib/data/level4";
import { cn } from "@/lib/utils";

const EMPTY_FEEDBACK = {
  onboardingRating: 0,
  transactionClarityRating: 0,
  usabilityRating: 0,
  understoodRewardTiming: null as boolean | null,
  wouldUseAgain: null as boolean | null,
  confusion: "",
  suggestion: "",
};

export default function PilotPage() {
  const { isConnected, publicKey, connect } = useWallet();
  const [status, setStatus] = useState<PilotStatusDto | null>(null);
  const [role, setRole] = useState<PilotRole>("hunter");
  const [accepted, setAccepted] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await Promise.resolve();
    if (!publicKey) { setStatus(null); setLoading(false); return; }
    setLoading(true); setError(null);
    try { setStatus(await loadPilotStatus()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Status pilot gagal dimuat"); }
    finally { setLoading(false); }
  }, [publicKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const beginPilot = async () => {
    if (!accepted) return;
    setSubmitting(true); setError(null);
    try { setStatus(await startPilot(role)); }
    catch (startError) { setError(startError instanceof Error ? startError.message : "Onboarding gagal dimulai"); }
    finally { setSubmitting(false); }
  };

  const sendFeedback = async () => {
    if (!isFeedbackComplete(feedback)) return;
    setSubmitting(true); setError(null);
    try {
      setStatus(await submitPilotFeedback({
        onboardingRating: feedback.onboardingRating,
        transactionClarityRating: feedback.transactionClarityRating,
        usabilityRating: feedback.usabilityRating,
        understoodRewardTiming: feedback.understoodRewardTiming,
        wouldUseAgain: feedback.wouldUseAgain,
        confusion: feedback.confusion,
        suggestion: feedback.suggestion,
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Feedback gagal dikirim");
    } finally { setSubmitting(false); }
  };

  return (
    <RequireLevel level={4}>
      <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50/60">
        <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <header className="mb-8 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-emerald-800"><Sparkles className="size-3.5" /> Level 4 field pilot</div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Bantu uji JELAJAH di dunia nyata.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">Satu sesi membutuhkan sekitar 5–8 menit: pahami alur, lakukan satu transaksi Testnet, lalu beri feedback jujur. Tidak ada secret key yang dikumpulkan.</p>
          </header>

          {error ? <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 size-3.5" /> Coba lagi</Button></div> : null}

          {!isConnected ? <ConnectStep onConnect={() => void connect()} />
            : loading ? <LoadingStep />
            : !status?.onboarding ? (
              <ConsentStep role={role} setRole={setRole} accepted={accepted} setAccepted={setAccepted} submitting={submitting} onStart={() => void beginPilot()} />
            ) : status.feedbackSubmitted ? (
              <CompletedStep status={status} />
            ) : status.interactions.length === 0 ? (
              <TransactionStep role={status.onboarding.role} onRefresh={() => void refresh()} loading={loading} />
            ) : (
              <FeedbackStep status={status} feedback={feedback} setFeedback={setFeedback} submitting={submitting} onSubmit={() => void sendFeedback()} />
            )}
        </div>
      </main>
    </RequireLevel>
  );
}

function ConnectStep({ onConnect }: { onConnect: () => void }) {
  return <StepCard number="01" icon={WalletCards} title="Hubungkan wallet Testnet" description="Wallet dipakai untuk signature challenge dan transaksi. JELAJAH tidak meminta seed phrase atau secret key."><Button onClick={onConnect} className="bg-emerald-700 text-white hover:bg-emerald-800">Connect wallet <ArrowRight className="ml-2 size-4" /></Button></StepCard>;
}

function LoadingStep() {
  return <div role="status" className="grid min-h-60 place-items-center rounded-2xl border bg-white"><div className="text-center"><Loader2 className="mx-auto size-6 animate-spin text-emerald-700" /><p className="mt-3 text-sm font-medium">Memuat sesi pilot…</p></div></div>;
}

function ConsentStep({ role, setRole, accepted, setAccepted, submitting, onStart }: { role: PilotRole; setRole: (role: PilotRole) => void; accepted: boolean; setAccepted: (accepted: boolean) => void; submitting: boolean; onStart: () => void }) {
  return <StepCard number="02" icon={ShieldCheck} title="Pilih peran dan beri persetujuan" description="Data yang disimpan: public wallet address, hash transaksi Testnet, rating, dan komentar yang kamu kirim.">
    <div className="grid gap-3 sm:grid-cols-2">
      {(["hunter", "sponsor"] as const).map((option) => <button key={option} type="button" onClick={() => setRole(option)} className={`rounded-xl border p-4 text-left transition ${role === option ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "bg-white hover:border-slate-400"}`}><span className="font-semibold capitalize">{option}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option === "hunter" ? "Temukan hunt dan uji alur klaim reward." : "Buat campaign dan danai hunt on-chain."}</span></button>)}
    </div>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-emerald-700" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Saya setuju data pilot digunakan secara anonim untuk evaluasi produk Level 4. Public wallet dan hash transaksi tetap dapat diverifikasi di explorer.</span></label>
    <Button disabled={!accepted || submitting} onClick={onStart} className="bg-emerald-700 text-white hover:bg-emerald-800">{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Mulai sesi pilot</Button>
  </StepCard>;
}

function TransactionStep({ role, onRefresh, loading }: { role: PilotRole; onRefresh: () => void; loading: boolean }) {
  const href = role === "sponsor" ? "/brand/dashboard" : "/map";
  return <StepCard number="03" icon={ClipboardCheck} title="Selesaikan satu tugas Testnet" description={role === "sponsor" ? "Buat campaign lalu danai satu hunt sampai status contract Confirmed." : "Buka hunt aktif dan selesaikan satu interaksi contract yang tersedia."}>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Bukti belum ditemukan</p><p className="mt-1 text-xs leading-5">Tombol refresh hanya membaca transaksi yang telah diverifikasi server dari Stellar Testnet—bukan klaim manual.</p></div>
    <div className="flex flex-wrap gap-3"><Link href={href} className={buttonVariants({ className: "bg-emerald-700 text-white hover:bg-emerald-800" })}>Buka tugas <ArrowRight className="ml-2 size-4" /></Link><Button variant="outline" onClick={onRefresh} disabled={loading}><RefreshCw className="mr-2 size-4" /> Periksa bukti</Button></div>
  </StepCard>;
}

type FeedbackState = typeof EMPTY_FEEDBACK;

function FeedbackStep({ status, feedback, setFeedback, submitting, onSubmit }: { status: PilotStatusDto; feedback: FeedbackState; setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>; submitting: boolean; onSubmit: () => void }) {
  const interaction = status.interactions[0];
  return <StepCard number="04" icon={CheckCircle2} title="Bukti terverifikasi—beri feedback" description="Jawaban jujur lebih berguna daripada rating sempurna.">
    <a href={`https://stellar.expert/explorer/testnet/tx/${interaction.transactionHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><span><strong>{interaction.action.replaceAll("_", " ")}</strong><span className="mt-1 block font-mono text-xs">{interaction.transactionHash.slice(0, 12)}…{interaction.transactionHash.slice(-8)}</span></span><ExternalLink className="size-4 shrink-0" /></a>
    <div className="grid gap-5 sm:grid-cols-3">
      <Rating label="Onboarding" value={feedback.onboardingRating} onChange={(value) => setFeedback((current) => ({ ...current, onboardingRating: value }))} />
      <Rating label="Kejelasan transaksi" value={feedback.transactionClarityRating} onChange={(value) => setFeedback((current) => ({ ...current, transactionClarityRating: value }))} />
      <Rating label="Kemudahan UI" value={feedback.usabilityRating} onChange={(value) => setFeedback((current) => ({ ...current, usabilityRating: value }))} />
    </div>
    <BinaryQuestion label="Saya paham kapan reward dikunci/dikirim" value={feedback.understoodRewardTiming} onChange={(value) => setFeedback((current) => ({ ...current, understoodRewardTiming: value }))} />
    <BinaryQuestion label="Saya bersedia memakai JELAJAH lagi" value={feedback.wouldUseAgain} onChange={(value) => setFeedback((current) => ({ ...current, wouldUseAgain: value }))} />
    <label className="block space-y-2 text-sm font-medium">Bagian paling membingungkan<textarea maxLength={1000} rows={3} value={feedback.confusion} onChange={(event) => setFeedback((current) => ({ ...current, confusion: event.target.value }))} className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-ring focus:ring-3 focus:ring-ring/30" placeholder="Ceritakan apa yang sempat membuat ragu…" /></label>
    <label className="block space-y-2 text-sm font-medium">Saran perbaikan<textarea maxLength={1000} rows={3} value={feedback.suggestion} onChange={(event) => setFeedback((current) => ({ ...current, suggestion: event.target.value }))} className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-ring focus:ring-3 focus:ring-ring/30" placeholder="Apa satu hal yang sebaiknya kami ubah?" /></label>
    <Button disabled={!isFeedbackComplete(feedback) || submitting} onClick={onSubmit} className="bg-emerald-700 text-white hover:bg-emerald-800">{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Kirim feedback</Button>
  </StepCard>;
}

function CompletedStep({ status }: { status: PilotStatusDto }) {
  return <StepCard number="✓" icon={CheckCircle2} title="Sesi pilot selesai" description="Terima kasih. Feedback tersimpan dan bukti transaksi tetap dapat diverifikasi secara publik."><div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950"><strong>{status.interactions.length} interaksi Testnet terverifikasi</strong><p className="mt-1 text-xs">Satu wallet hanya dihitung sebagai satu pengguna unik pada ringkasan pilot.</p></div><Link href="/" className={buttonVariants({ variant: "outline" })}>Kembali ke beranda</Link></StepCard>;
}

function StepCard({ number, icon: Icon, title, description, children }: { number: string; icon: typeof WalletCards; title: string; description: string; children: React.ReactNode }) {
  return <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-900/5"><CardContent className="grid gap-6 p-6 sm:grid-cols-[9rem_1fr] sm:p-8"><div><span className="font-mono text-xs text-muted-foreground">STEP {number}</span><div className="mt-4 grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Icon className="size-5" /></div></div><div className="space-y-5"><div><h2 className="text-xl font-semibold sm:text-2xl">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>{children}</div></CardContent></Card>;
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <fieldset><legend className="mb-2 text-sm font-medium">{label}</legend><div className="flex gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${label}: ${rating} dari 5`} onClick={() => onChange(rating)} className={cn("grid size-8 place-items-center rounded-md border text-xs transition", rating <= value ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white hover:border-emerald-400")}>{rating}</button>)}</div></fieldset>;
}

function BinaryQuestion({ label, value, onChange }: { label: string; value: boolean | null; onChange: (value: boolean) => void }) {
  return <fieldset className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><legend className="text-sm font-medium">{label}</legend><div className="flex gap-2">{[[true, "Ya"], [false, "Belum"]] .map(([option, text]) => <button key={text as string} type="button" onClick={() => onChange(option as boolean)} className={cn("rounded-lg border px-4 py-1.5 text-sm", value === option ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "bg-white")}>{text as string}</button>)}</div></fieldset>;
}

function isFeedbackComplete(feedback: FeedbackState): feedback is FeedbackState & { understoodRewardTiming: boolean; wouldUseAgain: boolean } {
  return feedback.onboardingRating > 0 && feedback.transactionClarityRating > 0 && feedback.usabilityRating > 0 && feedback.understoodRewardTiming !== null && feedback.wouldUseAgain !== null;
}

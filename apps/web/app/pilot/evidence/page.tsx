"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { RequireLevel } from "@/components/feature-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PilotSummaryDto } from "@/lib/data/level4";

async function loadSummary(): Promise<PilotSummaryDto> {
  const response = await fetch("/api/pilot/summary", { cache: "no-store" });
  const data = (await response.json()) as PilotSummaryDto & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Ringkasan pilot gagal dimuat");
  return data;
}

export default function PilotEvidencePage() {
  const [summary, setSummary] = useState<PilotSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setSummary(await loadSummary()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Ringkasan pilot gagal dimuat"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <RequireLevel level={4}>
      <main className="min-h-[calc(100vh-3.5rem)] bg-[#071612] text-white">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/pilot" className="mb-5 inline-flex items-center gap-1 text-xs text-emerald-200/70 hover:text-emerald-100"><ArrowLeft className="size-3.5" /> Kembali ke pilot</Link>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"><ShieldCheck className="size-4" /> Public validation evidence</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Level 4 field report</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/65">Angka dihitung dari wallet unik yang memberi consent dan memiliki transaksi Stellar Testnet terverifikasi server. Tidak ada angka demo atau input manual.</p>
            </div>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh evidence</Button>
          </div>

          {loading && !summary ? <div role="status" className="grid min-h-72 place-items-center rounded-2xl border border-white/10 bg-white/5"><div className="text-center"><Loader2 className="mx-auto size-6 animate-spin text-emerald-300" /><p className="mt-3 text-sm text-emerald-50/70">Menghitung bukti on-chain…</p></div></div>
            : error ? <div role="alert" className="rounded-2xl border border-red-300/30 bg-red-400/10 p-6 text-red-100"><h2 className="font-semibold">Evidence belum tersedia</h2><p className="mt-2 text-sm opacity-80">{error}</p></div>
            : summary ? <EvidenceReport summary={summary} /> : null}
        </div>
      </main>
    </RequireLevel>
  );
}

function EvidenceReport({ summary }: { summary: PilotSummaryDto }) {
  const progress = Math.min(100, summary.qualifiedUsers * 10);
  return <div className="space-y-6">
    <Card className="overflow-hidden border-emerald-300/20 bg-emerald-300 text-emerald-950 shadow-none">
      <CardContent className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em]">Qualification progress</p><p className="mt-3 text-5xl font-semibold tracking-tight">{summary.qualifiedUsers}<span className="text-2xl opacity-55"> / 10</span></p><p className="mt-2 text-sm opacity-75">consented wallets + confirmed Testnet interaction</p></div>
        <div className="sm:w-72"><div className="mb-2 flex justify-between text-xs font-medium"><span>Real-user target</span><span>{progress}%</span></div><div className="h-3 overflow-hidden rounded-full bg-emerald-950/15"><div className="h-full rounded-full bg-emerald-950" style={{ width: `${progress}%` }} /></div></div>
      </CardContent>
    </Card>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <EvidenceMetric icon={Users} label="Onboarded wallets" value={summary.onboardedUsers} />
      <EvidenceMetric icon={WalletCards} label="Verified interactions" value={summary.verifiedInteractions} />
      <EvidenceMetric icon={CheckCircle2} label="Completed sessions" value={summary.completedUsers} />
      <EvidenceMetric icon={BarChart3} label="Feedback responses" value={summary.feedbackResponses} />
    </section>

    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-white/10 bg-white/5 text-white shadow-none"><CardContent className="p-5 sm:p-6"><h2 className="text-lg font-semibold">Feedback pulse</h2><p className="mt-1 text-xs text-emerald-50/50">Aggregate only · skala 1–5</p><div className="mt-6 space-y-4"><Score label="Onboarding" value={summary.averages.onboarding} /><Score label="Transaction clarity" value={summary.averages.transactionClarity} /><Score label="Usability" value={summary.averages.usability} /></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5"><Percent label="Paham reward timing" value={summary.averages.understoodRewardTimingPercent} /><Percent label="Mau pakai lagi" value={summary.averages.wouldUseAgainPercent} /></div></CardContent></Card>
      <Card className="border-white/10 bg-white/5 text-white shadow-none"><CardContent className="p-5 sm:p-6"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">On-chain receipts</h2><p className="mt-1 text-xs text-emerald-50/50">Recent verified contract interactions</p></div><span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300">Testnet</span></div><div className="mt-5 space-y-2">{summary.recentTransactions.length ? summary.recentTransactions.map((transaction) => <a key={transaction.transactionHash} href={`https://stellar.expert/explorer/testnet/tx/${transaction.transactionHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/15 p-3 transition hover:border-emerald-300/40"><span className="min-w-0"><span className="block text-xs font-medium capitalize">{transaction.action.replaceAll("_", " ")}</span><span className="mt-1 block truncate font-mono text-[11px] text-emerald-50/50">{transaction.transactionHash}</span></span><ExternalLink className="size-3.5 shrink-0 text-emerald-300" /></a>) : <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-emerald-50/50">Belum ada contract receipt pilot.</div>}</div></CardContent></Card>
    </div>

    <footer className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-emerald-50/45 sm:flex-row sm:items-center sm:justify-between"><p>Generated {new Date(summary.generatedAt).toLocaleString("id-ID")}</p><Link href="/pilot" className={buttonVariants({ variant: "outline", size: "sm", className: "border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white" })}>Ikut pilot</Link></footer>
  </div>;
}

function EvidenceMetric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) { return <Card className="border-white/10 bg-white/5 text-white shadow-none"><CardContent className="p-5"><div className="flex items-center justify-between text-emerald-50/55"><span className="text-xs">{label}</span><Icon className="size-4" /></div><p className="mt-4 text-3xl font-semibold">{value}</p></CardContent></Card>; }
function Score({ label, value }: { label: string; value: number | null }) { const percent = value === null ? 0 : value * 20; return <div><div className="mb-2 flex justify-between text-xs"><span className="text-emerald-50/65">{label}</span><strong>{value === null ? "—" : `${value}/5`}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-300" style={{ width: `${percent}%` }} /></div></div>; }
function Percent({ label, value }: { label: string; value: number | null }) { return <div className="rounded-lg bg-black/15 p-3"><p className="text-2xl font-semibold">{value === null ? "—" : `${value}%`}</p><p className="mt-1 text-[11px] leading-4 text-emerald-50/50">{label}</p></div>; }

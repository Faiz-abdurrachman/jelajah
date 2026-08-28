"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  MapPinned,
  Target,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BrandProfileDto, CampaignDto, CampaignStatus } from "@/lib/data/level4";

interface BrandDashboardProps {
  brand: BrandProfileDto;
  campaigns: CampaignDto[];
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft", funding: "Funding", active: "Live", paused: "Paused",
  completed: "Completed", cancelled: "Cancelled",
};

const STATUS_CLASS: Record<CampaignStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  funding: "border-amber-200 bg-amber-50 text-amber-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-orange-200 bg-orange-50 text-orange-800",
  completed: "border-sky-200 bg-sky-50 text-sky-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};

function formatXlm(stroops: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(stroops / 10_000_000);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(value));
}

export function BrandDashboard({ brand, campaigns }: BrandDashboardProps) {
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;
  const confirmedHunts = campaigns.reduce((total, campaign) => total + campaign.hunts.length, 0);
  const fundedStroops = campaigns.reduce((total, campaign) => total + campaign.fundedStroops, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Campaign overview">
        <MetricCard icon={Target} label="Campaign live" value={String(liveCampaigns)} detail={`${campaigns.length} total workspace`} />
        <MetricCard icon={MapPinned} label="Hunt on-chain" value={String(confirmedHunts)} detail="Confirmed on Testnet" />
        <MetricCard icon={CircleDollarSign} label="Reward terkunci" value={`${formatXlm(fundedStroops)} XLM`} detail="Escrow di hunt contract" />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Campaign workspace</p>
            <h2 className="mt-1 text-xl font-semibold">Aktivasi lapangan</h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">{brand.companyName} · {brand.subscriptionTier}</p>
        </div>

        {campaigns.length === 0 ? (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="grid min-h-56 place-items-center p-8 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-800"><WalletCards className="size-5" /></div>
                <h3 className="font-semibold">Belum ada campaign</h3>
                <p className="text-sm leading-6 text-muted-foreground">Buat brief campaign, lalu danai hunt pertama melalui escrow contract di Stellar Testnet. Dana baru dihitung setelah transaksi terverifikasi.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: string; detail: string }) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-medium">{label}</span><Icon className="size-4" /></div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignDto }) {
  const progress = campaign.budgetStroops > 0 ? Math.min(100, Math.round((campaign.fundedStroops / campaign.budgetStroops) * 100)) : 0;
  const canFund = !["completed", "cancelled"].includes(campaign.status);
  return (
    <Card className="overflow-hidden border-border/80 shadow-none">
      <CardContent className="p-0">
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{campaign.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{campaign.description ?? "Campaign aktivasi berbasis lokasi."}</p>
            </div>
            <Badge variant="outline" className={STATUS_CLASS[campaign.status]}>{STATUS_LABEL[campaign.status]}</Badge>
          </div>
          <div>
            <div className="mb-2 flex items-end justify-between gap-4 text-sm">
              <span className="font-medium">{formatXlm(campaign.fundedStroops)} XLM funded</span>
              <span className="text-xs text-muted-foreground">target {formatXlm(campaign.budgetStroops)} XLM</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${campaign.name} funding progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(campaign.startDate)}–{formatDate(campaign.endDate)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPinned className="size-3.5" />{campaign.hunts.length} hunt confirmed</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/35 px-5 py-3">
          {campaign.hunts[0] ? (
            <a href={`https://stellar.expert/explorer/testnet/tx/${campaign.hunts[0].transactionHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">Bukti terbaru <ExternalLink className="size-3" /></a>
          ) : <span className="text-xs text-muted-foreground">Belum ada transaksi escrow</span>}
          {canFund ? (
            <Link
              href={`/hunt/create?campaign=${campaign.id}`}
              className={buttonVariants({ size: "sm", className: "bg-emerald-700 text-white hover:bg-emerald-800" })}
            >
              {campaign.hunts.length ? "Tambah hunt" : "Danai hunt pertama"}<ArrowUpRight className="ml-1.5 size-3.5" />
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

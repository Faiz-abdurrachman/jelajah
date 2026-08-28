"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { BrandDashboard } from "@/components/brand/brand-dashboard";
import { CampaignCreate } from "@/components/brand/campaign-create";
import { RequireLevel } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/components/wallet/wallet-provider";
import { loadBrandProfile, loadSponsorCampaigns, registerBrand } from "@/lib/api/campaigns";
import type { BrandProfileDto, CampaignDto } from "@/lib/data/level4";

export default function BrandDashboardPage() {
  const router = useRouter();
  const { isConnected, publicKey, connect } = useWallet();
  const [brand, setBrand] = useState<BrandProfileDto | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    // Keep state changes on the async side of the effect boundary.
    await Promise.resolve();
    if (!publicKey) {
      setBrand(null); setCampaigns([]); setLoading(false); return;
    }
    setLoading(true); setError(null);
    try {
      const profile = await loadBrandProfile();
      setBrand(profile);
      setCampaigns(profile ? await loadSponsorCampaigns() : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Workspace gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  const handleRegister = async () => {
    if (companyName.trim().length < 2) return;
    setRegistering(true); setError(null);
    try {
      const profile = await registerBrand(companyName.trim());
      setBrand(profile); setCampaigns([]);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Registrasi brand gagal");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <RequireLevel level={4}>
      <main className="min-h-[calc(100vh-3.5rem)] bg-[linear-gradient(180deg,rgba(6,78,59,0.06),transparent_22rem)]">
        <div className="container mx-auto max-w-6xl space-y-6 px-4 py-7 sm:py-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700"><ShieldCheck className="size-4" /> Verified campaign operations</div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Brand field desk</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Rancang aktivasi lokasi, danai reward melalui Stellar Testnet, dan simpan bukti transaksi yang dapat diverifikasi.</p>
            </div>
            {brand ? <Button onClick={() => setShowCreate((current) => !current)} className="bg-emerald-700 text-white hover:bg-emerald-800"><Plus className="mr-2 size-4" />{showCreate ? "Tutup form" : "Campaign baru"}</Button> : null}
          </header>

          {error ? (
            <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span><Button variant="outline" size="sm" onClick={() => void loadWorkspace()}><RefreshCw className="mr-2 size-3.5" /> Coba lagi</Button>
            </div>
          ) : null}

          {!isConnected ? (
            <Card className="overflow-hidden border-0 bg-emerald-950 text-white shadow-xl shadow-emerald-950/10">
              <CardContent className="grid min-h-72 place-items-center p-8 text-center">
                <div className="max-w-lg">
                  <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-white/10"><Building2 className="size-6 text-emerald-300" /></div>
                  <h2 className="text-2xl font-semibold">Buka sponsor workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/75">Hubungkan wallet Testnet. Signature challenge membuktikan kepemilikan tanpa pernah mengirim secret key ke server.</p>
                  <Button onClick={() => void connect()} className="mt-6 bg-white text-emerald-950 hover:bg-emerald-50">Connect wallet</Button>
                </div>
              </CardContent>
            </Card>
          ) : loading ? (
            <div role="status" className="grid min-h-64 place-items-center rounded-xl border bg-card"><div className="text-center"><Loader2 className="mx-auto size-6 animate-spin text-emerald-700" /><p className="mt-3 text-sm font-medium">Memuat campaign workspace…</p></div></div>
          ) : !brand ? (
            <Card className="mx-auto max-w-xl shadow-none">
              <CardContent className="space-y-5 p-6 sm:p-8">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">First-time setup</p><h2 className="mt-2 text-xl font-semibold">Daftarkan organisasi</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Profil ini mengelompokkan campaign dan bukti transaksi milik wallet kamu.</p></div>
                <label className="block space-y-2"><span className="text-sm font-medium">Nama organisasi</span><Input autoFocus maxLength={100} placeholder="Contoh: Jelajah Labs" value={companyName} onChange={(event) => setCompanyName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleRegister(); }} /></label>
                <Button className="w-full bg-emerald-700 text-white hover:bg-emerald-800" disabled={registering || companyName.trim().length < 2} onClick={() => void handleRegister()}>{registering ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Buat sponsor workspace</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {showCreate ? <CampaignCreate onCancel={() => setShowCreate(false)} onCreated={(campaign) => { setCampaigns((current) => [campaign, ...current]); setShowCreate(false); router.push(`/hunt/create?campaign=${campaign.id}`); }} /> : null}
              <BrandDashboard brand={brand} campaigns={campaigns} />
            </>
          )}
        </div>
      </main>
    </RequireLevel>
  );
}

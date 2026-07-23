"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Compass, Map, Trophy, Users } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { isConnected, connect, isConnecting } = useWallet();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      {/* Hero */}
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto py-16 md:py-24">
        <div className="rounded-full bg-primary/10 p-4 mb-6">
          <Compass className="size-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          JELAJAH
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-muted-foreground mb-2">
          &ldquo;Hidden. Hunted. Claimed.&rdquo;
        </p>
        <p className="text-base text-muted-foreground max-w-lg mb-8">
          Real-world treasure hunt platform di Stellar blockchain.
          Siapa aja bisa bikin harta karun di lokasi fisik,
          orang lain cari, nemu, dan klaim hadiahnya — semuanya otomatis dan trustless.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {isConnected ? (
            <Button size="lg" onClick={() => router.push("/map")}>
              <Map className="mr-2 size-4" />
              Mulai Berburu
            </Button>
          ) : (
            <Button size="lg" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={() => router.push("/map")}>
            Lihat Peta
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full py-12">
        <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Compass className="size-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">1. CREATE</h3>
          <p className="text-sm text-muted-foreground">
            Bikin hunt: pilih jenis, tulis clue, set GPS lokasi, deposit reward
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Map className="size-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">2. HUNT</h3>
          <p className="text-sm text-muted-foreground">
            Cari harta karun di map, baca clue, navigasi ke lokasi
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Trophy className="size-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">3. CLAIM</h3>
          <p className="text-sm text-muted-foreground">
            GPS verified, upload foto bukti, klaim hadiah otomatis
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="flex items-center gap-8 py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="size-4" />
          <span>Trustless Escrow via Stellar</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="size-4" />
          <span>Claimable Balances</span>
        </div>
      </section>
    </div>
  );
}

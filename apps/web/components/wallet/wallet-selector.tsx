"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  WALLET_OPTIONS,
  type WalletId,
} from "@/lib/stellar/wallet-adapters";
import { Cloud, LoaderCircle, Puzzle, ShieldCheck } from "lucide-react";

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (walletId: WalletId) => void;
  connectingWallet: WalletId | null;
  error: string | null;
}

export function WalletSelector({
  open,
  onOpenChange,
  onSelect,
  connectingWallet,
  error,
}: WalletSelectorProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-2xl rounded-t-2xl">
        <SheetHeader className="border-b px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-lg font-semibold">Pilih Stellar Wallet</SheetTitle>
            <Badge variant="secondary">Testnet</Badge>
          </div>
          <SheetDescription>
            Hubungkan wallet untuk menandatangani transaksi JELAJAH. Secret key tidak pernah
            masuk ke aplikasi.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
          {WALLET_OPTIONS.map((wallet) => {
            const loading = connectingWallet === wallet.id;
            const Icon = wallet.id === "freighter" ? Puzzle : Cloud;
            return (
              <Button
                key={wallet.id}
                type="button"
                variant="outline"
                data-testid={`wallet-option-${wallet.id}`}
                className="h-auto min-h-28 items-start justify-start gap-3 whitespace-normal p-4 text-left"
                disabled={connectingWallet !== null}
                onClick={() => onSelect(wallet.id)}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  {loading ? <LoaderCircle className="animate-spin" /> : <Icon />}
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {wallet.name}
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {wallet.kind}
                    </span>
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {loading ? "Menunggu konfirmasi wallet..." : wallet.description}
                  </span>
                </span>
              </Button>
            );
          })}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2"
            >
              {error}
            </div>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground sm:col-span-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Semua signing dibatasi ke Stellar Testnet dan signature diverifikasi terhadap akun
            yang dipilih sebelum transaksi dikirim.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

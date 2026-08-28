"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("JELAJAH route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-100 text-red-700">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Data wallet dan transaksi on-chain tidak berubah. Coba muat ulang halaman ini; bila tetap
          gagal, kembali ke beranda.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p> : null}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}><RefreshCw className="mr-2 size-4" /> Coba lagi</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>Beranda</Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { RequireLevel } from "@/components/feature-gate";

export default function MapPage() {
  const router = useRouter();
  const { isConnected } = useWallet();

  return (
    <RequireLevel level={1}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Map placeholder */}
        <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center">
          <MapPin className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Peta Hunt</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md text-center">
            Mapbox akan tampil di sini. Setup MAPBOX_TOKEN di .env.local untuk mengaktifkan.
          </p>

          <div className="flex gap-3">
            <Button variant="outline" size="sm" disabled>
              Filter
            </Button>
            <Button variant="outline" size="sm" disabled>
              List View
            </Button>
            {isConnected && (
              <Button size="sm" onClick={() => router.push("/hunt/create")}>
                Buat Hunt
              </Button>
            )}
          </div>
        </div>

        {/* Info bar */}
        <div className="border-t p-3 px-6 text-sm text-muted-foreground flex items-center justify-between">
          <span>Mapbox integration — setup token untuk aktifkan</span>
          <span className="font-mono text-xs">L1 • White Belt</span>
        </div>
      </div>
    </RequireLevel>
  );
}

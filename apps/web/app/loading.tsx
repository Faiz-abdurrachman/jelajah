import { Compass, Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div role="status" className="grid min-h-[60vh] place-items-center px-4">
      <div className="text-center">
        <div className="relative mx-auto size-14">
          <div className="grid size-14 place-items-center rounded-full border bg-card">
            <Compass className="size-5" />
          </div>
          <Loader2 className="absolute -right-1 -top-1 size-4 animate-spin text-emerald-700" />
        </div>
        <p className="mt-4 text-sm font-medium">Menyiapkan JELAJAH…</p>
        <p className="mt-1 text-xs text-muted-foreground">Menyinkronkan data Testnet</p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Map, User, WalletIcon, Menu, Swords, ShieldCheck, Settings, Trophy, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { isFeatureUnlocked } from "@/config/levels";

const NAV_ITEMS = [
  { href: "/map", label: "Map", icon: Map, level: 1 },
  { href: "/profile", label: "Profile", icon: User, level: 1 },
  { href: "/wallet", label: "Wallet", icon: WalletIcon, level: 1 },
  { href: "/quest/1", label: "Quest", icon: Swords, level: 3, featureKey: "quest-chain" as const },
  { href: "/verify", label: "Verify", icon: ShieldCheck, level: 3, featureKey: "verifier-dashboard" as const },
  { href: "/settings", label: "Settings", icon: Settings, level: 3, featureKey: "settings" as const },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, level: 4, featureKey: "leaderboard" as const },
  { href: "/community", label: "Community", icon: Users, level: 5, featureKey: "community-feed" as const },
] as const;

export function Navbar() {
  const { isConnected, publicKey, connect, disconnect, isConnecting } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  const truncateKey = (key: string) =>
    `${key.slice(0, 4)}...${key.slice(-4)}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Compass className="size-5" />
          <span>JELAJAH</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.filter((item) => !("featureKey" in item) || isFeatureUnlocked(item.featureKey)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Wallet Section */}
        <div className="flex items-center gap-3">
          {isConnected && publicKey ? (
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {truncateKey(publicKey)}
              </Badge>
              <Button variant="outline" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={connect}
              disabled={isConnecting}
              className="hidden md:inline-flex"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="md:hidden">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right">
              <div className="mt-6 flex flex-col gap-4">
                {/* Wallet */}
                {isConnected && publicKey ? (
                  <div className="flex flex-col gap-2">
                    <Badge variant="secondary" className="font-mono text-xs w-fit">
                      {truncateKey(publicKey)}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={disconnect}>
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => {
                      connect();
                      setMobileOpen(false);
                    }}
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                )}

                <Separator />

                {/* Nav Items */}
                {NAV_ITEMS.filter((item) => !("featureKey" in item) || isFeatureUnlocked(item.featureKey)).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 text-sm font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

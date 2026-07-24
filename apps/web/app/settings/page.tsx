"use client";

import { useState } from "react";
import { RequireLevel } from "@/components/feature-gate";
import { NetworkSelector } from "@/components/settings/network-selector";
import type { NetworkKey } from "@/components/settings/network-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Globe, Languages, Banknote, Check } from "lucide-react";

const STORAGE_KEYS = {
  network: "jelajah:network",
  language: "jelajah:language",
  currency: "jelajah:currency",
} as const;

type Language = "en" | "id";
type Currency = "IDR" | "USD";

const LANGUAGES: { key: Language; label: string; flag: string }[] = [
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
];

const CURRENCIES: { key: Currency; label: string; symbol: string }[] = [
  { key: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { key: "USD", label: "US Dollar", symbol: "$" },
];

function loadSetting<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export default function SettingsPage() {
  const [network, setNetwork] = useState<NetworkKey>(() =>
    loadSetting<NetworkKey>(STORAGE_KEYS.network, "testnet")
  );
  const [language, setLanguage] = useState<Language>(() =>
    loadSetting<Language>(STORAGE_KEYS.language, "en")
  );
  const [currency, setCurrency] = useState<Currency>(() =>
    loadSetting<Currency>(STORAGE_KEYS.currency, "IDR")
  );
  const [saved, setSaved] = useState(false);

  const handleNetworkChange = (net: NetworkKey) => {
    setNetwork(net);
    saveSetting(STORAGE_KEYS.network, net);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    saveSetting(STORAGE_KEYS.language, lang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCurrencyChange = (curr: Currency) => {
    setCurrency(curr);
    saveSetting(STORAGE_KEYS.currency, curr);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <RequireLevel level={3}>
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="size-5" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="size-3" />
              Saved
            </span>
          )}
        </div>

        <NetworkSelector selected={network} onChange={handleNetworkChange} />

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Language</h2>
            </div>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang.key}
                  variant={language === lang.key ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleLanguageChange(lang.key)}
                  className="flex-1"
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Currency Display</h2>
            </div>
            <div className="flex gap-2">
              {CURRENCIES.map((curr) => (
                <Button
                  key={curr.key}
                  variant={currency === curr.key ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleCurrencyChange(curr.key)}
                  className="flex-1"
                >
                  <span className="mr-2 font-mono">{curr.symbol}</span>
                  {curr.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">About</h2>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>App Version</span>
                <span className="font-mono">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Feature Level</span>
                <span className="font-mono">
                  L{process.env.NEXT_PUBLIC_CURRENT_LEVEL ?? "1"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Network</span>
                <span className="font-mono capitalize">{network}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireLevel>
  );
}

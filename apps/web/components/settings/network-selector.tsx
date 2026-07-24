"use client";

import { Card, CardContent } from "@/components/ui/card";
import { NETWORKS } from "@/config/constants";
import { Check, Globe, AlertTriangle } from "lucide-react";

export type NetworkKey = "testnet" | "mainnet";

interface NetworkSelectorProps {
  selected: NetworkKey;
  onChange: (network: NetworkKey) => void;
}

const NETWORK_OPTIONS: {
  key: NetworkKey;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    key: "testnet",
    label: "Testnet",
    description: "Stellar test network — free test XLM via Friendbot",
    color: "text-amber-500",
  },
  {
    key: "mainnet",
    label: "Mainnet",
    description: "Stellar public network — real XLM transactions",
    color: "text-emerald-500",
  },
];

export function NetworkSelector({ selected, onChange }: NetworkSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Network</h2>
      </div>

      <div className="grid gap-3">
        {NETWORK_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          const net = NETWORKS[opt.key];

          return (
            <Card
              key={opt.key}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isSelected ? "border-primary ring-1 ring-primary" : ""
              }`}
              onClick={() => onChange(opt.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${opt.color}`}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Check className="size-3" />
                          Active
                        </span>
                      )}
                      {opt.key === "mainnet" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          <AlertTriangle className="size-3" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {opt.description}
                    </p>
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground font-mono">
                      <div>RPC: {net.rpcUrl}</div>
                      <div>Horizon: {net.horizonUrl}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

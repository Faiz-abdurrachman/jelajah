"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Coins, Gavel, Percent, Activity } from "lucide-react";

interface VerifierStatsData {
  stake: number;
  disputesHandled: number;
  disputeFeeEarned: number;
  isActive: boolean;
}

interface VerifierStatsProps {
  stats: VerifierStatsData | null;
}

const STAT_CARDS: {
  key: keyof VerifierStatsData;
  label: string;
  icon: typeof Coins;
  format: (val: number) => string;
}[] = [
  { key: "stake", label: "Staked", icon: Coins, format: (v) => `${v.toLocaleString()} XLM` },
  { key: "disputesHandled", label: "Disputes Handled", icon: Gavel, format: (v) => `${v}` },
  {
    key: "disputeFeeEarned",
    label: "Fees Earned",
    icon: Percent,
    format: (v) => `${v.toLocaleString()} XLM`,
  },
];

export function VerifierStats({ stats }: VerifierStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STAT_CARDS.map((card) => (
        <Card key={card.key}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <card.icon className="size-4" />
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <p className="text-lg font-bold">{card.format(stats[card.key] as number)}</p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="size-4" />
            <span className="text-xs font-medium">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                stats.isActive ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-lg font-bold">
              {stats.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, User } from "lucide-react";
import { getLeaderboard } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  position: number;
  name: string;
  publicKey: string;
  reputationScore: number;
  level: number;
}

const TOP_BADGES = [
  { icon: Trophy, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
  { icon: Medal, color: "text-slate-400 bg-slate-50 dark:bg-slate-950/30" },
  { icon: Award, color: "text-orange-700 bg-orange-50 dark:bg-orange-950/30" },
];

export function LeaderboardTable() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getLeaderboard(20);
        if (cancelled) return;

        const mapped: LeaderboardEntry[] = (data ?? []).map(
          (u: Record<string, unknown>, i: number) => ({
            position: i + 1,
            name: (u.display_name as string) ?? `User ${i + 1}`,
            publicKey: (u.public_key as string) ?? "",
            reputationScore: (u.reputation_score as number) ?? 0,
            level: (u.level as number) ?? 1,
          })
        );

        setEntries(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Trophy className="size-8 mx-auto mb-2 opacity-50" />
          <p>No leaderboard data yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const BadgeIcon = entry.position <= 3 ? TOP_BADGES[entry.position - 1].icon : User;
        const badgeStyle =
          entry.position <= 3 ? TOP_BADGES[entry.position - 1].color : "text-muted-foreground";

        return (
          <Card
            key={entry.publicKey}
            className={cn(
              entry.position === 1 && "border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/10"
            )}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-lg font-bold",
                  entry.position <= 3 ? badgeStyle : "bg-muted text-muted-foreground"
                )}
              >
                {entry.position <= 3 ? (
                  <BadgeIcon className="size-5" />
                ) : (
                  entry.position
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{entry.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    Lv.{entry.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {entry.publicKey.slice(0, 8)}...{entry.publicKey.slice(-4)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">{entry.reputationScore.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, MapPin, Trophy, Gift, Star, User } from "lucide-react";
import { getCommunityActivities, subscribeToCommunityActivities } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Activity {
  id: number;
  type: string;
  title: string;
  message: string;
  userPubkey: string;
  timestamp: string;
}

const ACTIVITY_ICONS: Record<string, typeof Compass> = {
  claim: Trophy,
  create: MapPin,
  badge_earned: Star,
  quest_complete: Gift,
  referral: User,
  default: Compass,
};

const ACTIVITY_COLORS: Record<string, string> = {
  claim: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  create: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  badge_earned: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  quest_complete: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
  referral: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30",
  default: "text-muted-foreground bg-muted",
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getCommunityActivities();
        if (cancelled) return;

        const mapped: Activity[] = (data ?? []).map((a: Record<string, unknown>) => ({
          id: a.id as number,
          type: (a.type as string) ?? "default",
          title: (a.title as string) ?? "",
          message: (a.message as string) ?? "",
          userPubkey: (a.user_pubkey as string) ?? "",
          timestamp: (a.created_at as string) ?? new Date().toISOString(),
        }));

        setActivities(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const sub = subscribeToCommunityActivities((newActivity) => {
      const a = newActivity as Record<string, unknown>;
      setActivities((prev) => [
        {
          id: a.id as number,
          type: (a.type as string) ?? "default",
          title: (a.title as string) ?? "",
          message: (a.message as string) ?? "",
          userPubkey: (a.user_pubkey as string) ?? "",
          timestamp: (a.created_at as string) ?? new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Compass className="size-8 mx-auto mb-2 opacity-50" />
          <p>No community activity yet.</p>
          <p className="text-sm">Activities appear when users create hunts, make claims, and earn badges.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const iconKey = ACTIVITY_ICONS[activity.type] ? activity.type : "default";
        const Icon = ACTIVITY_ICONS[iconKey] ?? Compass;
        const color = ACTIVITY_COLORS[iconKey] ?? ACTIVITY_COLORS.default;
        const timeAgo = getTimeAgo(new Date(activity.timestamp));

        return (
          <Card key={activity.id} className="overflow-hidden">
            <CardContent className="p-4 flex gap-3">
              <div className={cn("shrink-0 size-10 rounded-full flex items-center justify-center", color)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
                </div>
                <p className="text-sm text-muted-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {activity.userPubkey.slice(0, 6)}...{activity.userPubkey.slice(-4)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs capitalize">
                {activity.type.replace(/_/g, " ")}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Trophy, MapPin, ShieldCheck, Gift, X } from "lucide-react";
import { subscribeToNotifications } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  claim_approved: Trophy,
  claim_rejected: X,
  hunt_created: MapPin,
  dispute_resolved: ShieldCheck,
  badge_earned: Gift,
  default: Bell,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  claim_approved: "text-emerald-500",
  claim_rejected: "text-red-500",
  hunt_created: "text-blue-500",
  dispute_resolved: "text-purple-500",
  badge_earned: "text-amber-500",
  default: "text-muted-foreground",
};

export function NotificationBell() {
  const { publicKey } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!publicKey) return;

    const sub = subscribeToNotifications(publicKey, (raw) => {
      const n = raw as unknown as Record<string, unknown>;
      setNotifications((prev) => [
        {
          id: n.id as number,
          type: (n.type as string) ?? "default",
          title: (n.title as string) ?? "",
          message: (n.message as string) ?? "",
          read: (n.read as boolean) ?? false,
          timestamp: (n.created_at as string) ?? new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    return () => { sub.unsubscribe(); };
  }, [publicKey]);

  if (!publicKey) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 overflow-y-auto shadow-lg">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No notifications yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {notifications.slice(0, 10).map((n) => {
                    const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
                    const iconColor = NOTIFICATION_COLORS[n.type] ?? NOTIFICATION_COLORS.default;

                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 p-2 rounded-md transition-colors hover:bg-muted/50",
                          !n.read && "bg-muted/30"
                        )}
                      >
                        <div className="shrink-0 mt-0.5">
                          <Icon className={cn("size-4", iconColor)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getTimeAgo(new Date(n.timestamp))}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="shrink-0 size-2 rounded-full bg-primary mt-1.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
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
  return date.toLocaleDateString();
}

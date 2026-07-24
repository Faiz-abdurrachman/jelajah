"use client";

import { useState, useEffect } from "react";
import { RequireLevel } from "@/components/feature-gate";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Award, Search, Clock, CheckCircle, XCircle, MapPin } from "lucide-react";
import { getUserHunts, getUserClaims } from "@/lib/supabase/client";
import { getTimeAgo } from "@/lib/utils";
import { HuntStatus } from "@/config/hunt-types";
import type { Hunt, Claim } from "@/types";

export default function ProfilePage() {
  const { isConnected, publicKey, balance } = useWallet();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    if (!publicKey) return;

    let cancelled = false;

    async function loadActivity() {
      try {
        const [huntsData, claimsData] = await Promise.all([
          getUserHunts(publicKey!),
          getUserClaims(publicKey!),
        ]);
        if (!cancelled) {
          setHunts(huntsData as Hunt[]);
          setClaims(claimsData as Claim[]);
        }
      } catch {
        // Activity fetch is non-critical
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    }

    void loadActivity();
    return () => { cancelled = true; };
  }, [publicKey]);

  return (
    <RequireLevel level={1}>
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <User className="size-6" />
          Profile
        </h1>

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Connect wallet untuk lihat profile
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Public Key */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Public Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="rounded bg-muted px-3 py-1.5 text-sm font-mono break-all">
                  {publicKey}
                </code>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Level</span>
                    <span className="text-lg font-bold">1</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">XP</span>
                    <span className="text-lg font-bold">0</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">XLM</span>
                    <span className="text-lg font-bold font-mono">
                      {balance?.xlm ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">USDC</span>
                    <span className="text-lg font-bold font-mono">
                      {balance?.usdc ?? "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="size-4" />
                  Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Beginner
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Your Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Search className="size-4" />
                  Your Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingActivity ? (
                  <div className="space-y-3 animate-pulse">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 bg-muted rounded" />
                    ))}
                  </div>
                ) : hunts.length === 0 && claims.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet. Start by creating or finding a hunt!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {hunts.map((hunt) => (
                      <div
                        key={`hunt-${hunt.id}`}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs bg-blue-600">
                              Hider
                            </Badge>
                            <span className="text-sm font-medium truncate">{hunt.clue}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {hunt.latitude.toFixed(4)}, {hunt.longitude.toFixed(4)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {getTimeAgo(new Date(hunt.createdAt))}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            hunt.status === HuntStatus.Active
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {hunt.status}
                        </Badge>
                      </div>
                    ))}
                    {claims.map((claim) => (
                      <div
                        key={`claim-${claim.id}`}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs bg-purple-600">
                              Hunter
                            </Badge>
                            <span className="text-sm font-medium truncate">
                              {claim.hunt?.clue ?? `Hunt #${claim.huntId}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {getTimeAgo(new Date(claim.submittedAt))}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {claim.status === "approved" ? (
                            <CheckCircle className="size-4 text-emerald-500" />
                          ) : claim.status === "rejected" ? (
                            <XCircle className="size-4 text-destructive" />
                          ) : (
                            <Clock className="size-4 text-amber-500" />
                          )}
                          <span className="text-xs capitalize">{claim.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RequireLevel>
  );
}

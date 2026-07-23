"use client";

import { RequireLevel } from "@/components/feature-gate";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Award } from "lucide-react";

export default function ProfilePage() {
  const { isConnected, publicKey, balance } = useWallet();

  const truncateKey = (key: string) =>
    `${key.slice(0, 8)}...${key.slice(-8)}`;

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
          </div>
        )}
      </div>
    </RequireLevel>
  );
}

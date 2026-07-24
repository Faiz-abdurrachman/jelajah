"use client";

import { useState, useEffect } from "react";
import { RequireLevel } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus } from "lucide-react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { getBrandProfile } from "@/lib/supabase/client";
import { BrandDashboard } from "@/components/brand/brand-dashboard";
import { CampaignCreate } from "@/components/brand/campaign-create";

export default function BrandDashboardPage() {
  const { publicKey, isConnected } = useWallet();
  const [isBrand, setIsBrand] = useState<boolean | null>(null);
  const [brandData, setBrandData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!publicKey) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const profile = await getBrandProfile(publicKey);
        if (!cancelled) {
          setIsBrand(!!profile);
          setBrandData(profile as unknown as Record<string, unknown>);
        }
      } catch {
        if (!cancelled) setIsBrand(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [publicKey]);

  if (loading) {
    return (
      <RequireLevel level={4}>
        <div className="container max-w-5xl mx-auto py-8 px-4 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel level={4}>
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            <h1 className="text-2xl font-bold">Brand Dashboard</h1>
            {brandData && (
              <Badge variant="secondary">
                {(brandData.subscription_tier as string) ?? "basic"}
              </Badge>
            )}
          </div>
          {isBrand && (
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="size-4 mr-2" />
              {showCreate ? "Cancel" : "New Campaign"}
            </Button>
          )}
        </div>

        {!isConnected ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Building2 className="size-8 mx-auto text-muted-foreground" />
              <p className="font-medium">Connect your wallet to access Brand Dashboard.</p>
            </CardContent>
          </Card>
        ) : !isBrand ? (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <Building2 className="size-8 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Register Your Brand</h2>
                <p className="text-sm text-muted-foreground">
                  Create campaigns and engage your audience with location-based hunts.
                </p>
              </div>
              <Button size="lg">Register as Brand</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {brandData && <BrandDashboard data={brandData} />}

            {showCreate && (
              <CampaignCreate
                onCreated={() => setShowCreate(false)}
                onCancel={() => setShowCreate(false)}
              />
            )}
          </>
        )}
      </div>
    </RequireLevel>
  );
}

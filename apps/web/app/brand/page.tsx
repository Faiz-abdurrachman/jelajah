"use client";

import { RequireLevel } from "@/components/feature-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, Zap, Shield } from "lucide-react";
import Link from "next/link";
import { BRAND_TIERS } from "@/config/constants";

interface TierCard {
  key: string;
  icon: typeof Building2;
  name: string;
  price: number;
  maxHuntsPerCampaign: number;
  hasAnalytics: boolean;
  hasCustomBranding: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
  recommended?: boolean;
  features: string[];
}

const TIERS: TierCard[] = [
  {
    key: "basic",
    ...BRAND_TIERS.basic,
    icon: Building2,
    features: ["Up to 3 hunts per campaign", "Basic hunt templates", "Standard support"],
  },
  {
    key: "pro",
    ...BRAND_TIERS.pro,
    icon: Zap,
    recommended: true,
    features: [
      "Up to 20 hunts per campaign",
      "Analytics dashboard",
      "Custom branding",
      "Priority support",
    ],
  },
  {
    key: "enterprise",
    ...BRAND_TIERS.enterprise,
    icon: Shield,
    features: [
      "Unlimited hunts",
      "Full analytics suite",
      "Custom branding",
      "API access",
      "Dedicated support",
    ],
  },
];

export default function BrandPage() {
  return (
    <RequireLevel level={4}>
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
        <div className="text-center space-y-3">
          <Building2 className="size-10 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">JELAJAH for Brands</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create location-based treasure hunts for your brand campaigns.
            Engage your audience in the real world with rewards on Stellar.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Card
              key={tier.key}
              className={`relative ${tier.recommended ? "border-primary ring-1 ring-primary" : ""}`}
            >
              {tier.recommended && (
                <Badge className="absolute -top-2 right-4 bg-primary">Recommended</Badge>
              )}
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <tier.icon className="size-5 text-primary" />
                  <h2 className="text-lg font-bold">{tier.name}</h2>
                </div>

                <div>
                  <span className="text-3xl font-bold">
                    {tier.price === -1 ? "Custom" : tier.price === 0 ? "Free" : `Rp ${tier.price.toLocaleString()}`}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-muted-foreground text-sm">/month</span>
                  )}
                </div>

                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/brand/dashboard"
                  className={`inline-flex items-center justify-center w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    tier.recommended
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border bg-background hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {tier.price === -1 ? "Contact Us" : "Get Started"}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RequireLevel>
  );
}

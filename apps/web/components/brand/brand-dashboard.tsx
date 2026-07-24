"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, TrendingUp, MapPin } from "lucide-react";

interface BrandDashboardProps {
  data: Record<string, unknown>;
}

const STAT_CARDS: {
  key: string;
  label: string;
  icon: typeof BarChart3;
  format: (data: Record<string, unknown>) => string;
}[] = [
  {
    key: "campaigns",
    label: "Total Campaigns",
    icon: Target,
    format: (d) => String(d.total_campaigns ?? 0),
  },
  {
    key: "spent",
    label: "Total Spent",
    icon: TrendingUp,
    format: (d) => `${Number(d.total_spent ?? 0).toLocaleString()} XLM`,
  },
  {
    key: "tier",
    label: "Subscription",
    icon: BarChart3,
    format: (d) => String(d.subscription_tier ?? "basic").toUpperCase(),
  },
];

export function BrandDashboard({ data }: BrandDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <Card key={card.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <card.icon className="size-4" />
                <span className="text-xs font-medium">{card.label}</span>
              </div>
              <p className="text-xl font-bold">{card.format(data)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="size-4 text-muted-foreground" />
            <h3 className="font-semibold">Brand Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{String(data.company_name ?? "—")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tier</span>
              <Badge variant="secondary">{String(data.subscription_tier ?? "basic")}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Since</span>
              <span className="font-medium">
                {data.subscription_start
                  ? new Date(String(data.subscription_start)).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">
                {data.subscription_end
                  ? new Date(String(data.subscription_end)).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisputeItem {
  id: number;
  claimId: number;
  reason: string;
  status: string;
  resolution: string | null;
  verifiers: string[];
  createdAt: string;
  huntTitle?: string;
}

interface DisputeListProps {
  disputes: DisputeItem[];
  onSelect: (id: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Scale }> = {
  voting: { label: "Voting", variant: "default", icon: Clock },
  resolved: { label: "Resolved", variant: "secondary", icon: CheckCircle2 },
  appealed: { label: "Appealed", variant: "destructive", icon: XCircle },
};

export function DisputeList({ disputes, onSelect }: DisputeListProps) {
  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Scale className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No disputes assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {disputes.map((d) => {
        const config = STATUS_CONFIG[d.status] ?? {
          label: d.status,
          variant: "outline" as const,
          icon: Scale,
        };

        return (
          <Card
            key={d.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelect(d.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      #{d.id}
                    </span>
                    {d.huntTitle && (
                      <span className="text-sm font-medium truncate">{d.huntTitle}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {d.reason}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Claim #{d.claimId}</span>
                    <span>&middot;</span>
                    <span>{d.verifiers.length} verifiers</span>
                    <span>&middot;</span>
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge
                  variant={config.variant}
                  className={cn("shrink-0 ml-2", d.status === "resolved" && "bg-emerald-500")}
                >
                  <config.icon className="size-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

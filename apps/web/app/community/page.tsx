"use client";

import { RequireLevel } from "@/components/feature-gate";
import { ActivityFeed } from "@/components/community/activity-feed";
import { Users } from "lucide-react";

export default function CommunityPage() {
  return (
    <RequireLevel level={5}>
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <h1 className="text-2xl font-bold">Community</h1>
        </div>
        <ActivityFeed />
      </div>
    </RequireLevel>
  );
}

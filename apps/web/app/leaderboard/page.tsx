"use client";

import { RequireLevel } from "@/components/feature-gate";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <RequireLevel level={4}>
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
        <LeaderboardTable />
      </div>
    </RequireLevel>
  );
}

"use client";

import { RequireLevel } from "@/components/feature-gate";
import { ClaimHuntView } from "@/components/hunt/claim-hunt-view";

export default function HuntDetailPage() {
  return (
    <RequireLevel level={2}>
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <ClaimHuntView />
      </div>
    </RequireLevel>
  );
}

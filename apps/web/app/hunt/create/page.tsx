"use client";

import { RequireLevel } from "@/components/feature-gate";
import { CreateHuntWizard } from "@/components/hunt/create-hunt-wizard";

export default function CreateHuntPage() {
  return (
    <RequireLevel level={2}>
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <CreateHuntWizard />
      </div>
    </RequireLevel>
  );
}

"use client";

import { RequireLevel } from "@/components/feature-gate";
import { HuntMap } from "@/components/map/hunt-map";

export default function MapPage() {
  return (
    <RequireLevel level={1}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <HuntMap />
      </div>
    </RequireLevel>
  );
}

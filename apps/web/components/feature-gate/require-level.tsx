"use client";

import { type Level, getCurrentLevel, getLevelName } from "@/config/levels";
import { Lock } from "lucide-react";

interface RequireLevelProps {
  level: Level;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireLevel({ level, children, fallback }: RequireLevelProps) {
  const currentLevel = getCurrentLevel();

  if (currentLevel >= level) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <FeatureLocked requiredLevel={level} />;
}

function FeatureLocked({ requiredLevel }: { requiredLevel: Level }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <Lock className="size-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold">Fitur Terkunci</h2>
      <p className="max-w-md text-muted-foreground">
        Fitur ini tersedia di {getLevelName(requiredLevel)}.
        Lanjutkan petualanganmu untuk membukanya!
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Level saat ini:</span>
        <span className="font-medium text-foreground">
          {getLevelName(getCurrentLevel())}
        </span>
      </div>
    </div>
  );
}

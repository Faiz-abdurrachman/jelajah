// JELAJAH — Hunt Type Definitions

export enum HuntType {
  Gps = 0,
  Quest = 1,
  Race = 2,
  Puzzle = 3,
  Photo = 4,
}

export const HUNT_TYPE_LABELS: Record<HuntType, string> = {
  [HuntType.Gps]: "GPS Hunt",
  [HuntType.Quest]: "Quest Chain",
  [HuntType.Race]: "Race Hunt",
  [HuntType.Puzzle]: "Puzzle Hunt",
  [HuntType.Photo]: "Photo Challenge",
};

export const HUNT_TYPE_DESCRIPTIONS: Record<HuntType, string> = {
  [HuntType.Gps]: "Ke lokasi spesifik, upload foto, klaim",
  [HuntType.Quest]: "Multi-step: clue 1 → clue 2 → hadiah final",
  [HuntType.Race]: "First to find wins all",
  [HuntType.Puzzle]: "Harus pecahin kode/cipher dulu",
  [HuntType.Photo]: "Foto pose spesifik di lokasi",
};

export const HUNT_TYPE_ICONS: Record<HuntType, string> = {
  [HuntType.Gps]: "map-pin",
  [HuntType.Quest]: "layers",
  [HuntType.Race]: "zap",
  [HuntType.Puzzle]: "puzzle",
  [HuntType.Photo]: "camera",
};

export function getHuntTypeLabel(type: HuntType): string {
  return HUNT_TYPE_LABELS[type] ?? "Unknown";
}

export function getHuntTypeDescription(type: HuntType): string {
  return HUNT_TYPE_DESCRIPTIONS[type] ?? "";
}

export enum HuntStatus {
  Active = "active",
  ClaimPending = "claim_pending",
  Claimed = "claimed",
  Expired = "expired",
  Disputed = "disputed",
}

export enum ClaimStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Disputed = "disputed",
}

export enum DisputeStatus {
  Voting = "voting",
  Resolved = "resolved",
  Appealed = "appealed",
}

import { HuntStatus, HuntType } from "@/config/hunt-types";
import type { Hunt } from "@/types";

const HUNT_TYPES: Record<string, HuntType> = {
  gps: HuntType.Gps,
  "GPS Hunt": HuntType.Gps,
  quest: HuntType.Quest,
  "Quest Chain": HuntType.Quest,
  race: HuntType.Race,
  "Race Hunt": HuntType.Race,
  puzzle: HuntType.Puzzle,
  "Puzzle Hunt": HuntType.Puzzle,
  photo: HuntType.Photo,
  "Photo Challenge": HuntType.Photo,
};

const HUNT_STATUSES = new Set<string>(Object.values(HuntStatus));

export function normalizeHunt(row: Record<string, unknown>): Hunt {
  const rawType = String(row.hunt_type ?? "gps");
  const rawStatus = String(row.status ?? HuntStatus.Active).toLowerCase();
  return {
    id: Number(row.id),
    contractId: row.contract_id ? String(row.contract_id) : null,
    hiderPubkey: String(row.hider_pubkey ?? ""),
    huntType: HUNT_TYPES[rawType] ?? HuntType.Gps,
    clue: String(row.clue ?? ""),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters ?? 50),
    amountStroops: row.amount_stroops === null || row.amount_stroops === undefined
      ? null
      : Number(row.amount_stroops),
    deadline: String(row.deadline ?? ""),
    status: (HUNT_STATUSES.has(rawStatus) ? rawStatus : HuntStatus.Active) as HuntStatus,
    photoCid: row.photo_cid ? String(row.photo_cid) : null,
    createdAt: String(row.created_at ?? ""),
  };
}

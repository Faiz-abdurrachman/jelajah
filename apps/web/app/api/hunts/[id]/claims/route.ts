import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const huntId = Number((await params).id);
    if (!Number.isInteger(huntId) || huntId <= 0) {
      return Response.json({ error: "ID hunt tidak valid" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: hunt } = await db
      .from("hunts")
      .select("hider_pubkey")
      .eq("id", huntId)
      .single();
    if (!hunt) return Response.json({ error: "Hunt tidak ditemukan" }, { status: 404 });
    if (hunt.hider_pubkey !== session.address) {
      return Response.json({ error: "Bukan pemilik hunt" }, { status: 403 });
    }

    const { data, error } = await db
      .from("claims")
      .select("id, hunter_pubkey, photo_cid, gps_lat, gps_lng, submitted_at")
      .eq("hunt_id", huntId)
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return Response.json({ claims: data ?? [] });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Wallet belum terautentikasi" : "Gagal memuat claim" },
      { status: unauthenticated ? 401 : 500 }
    );
  }
}

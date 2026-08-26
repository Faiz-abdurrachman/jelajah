import { createHash } from "node:crypto";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  scAddress,
  scBigInt,
  scBytesToHex,
  verifyContractCall,
} from "@/lib/stellar/verify-transaction";

interface ClaimIndexRequest {
  huntId?: unknown;
  transactionHash?: unknown;
  photoCid?: unknown;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as ClaimIndexRequest;
    if (
      typeof body.huntId !== "number" ||
      !Number.isInteger(body.huntId) ||
      body.huntId <= 0 ||
      typeof body.transactionHash !== "string" ||
      typeof body.photoCid !== "string" ||
      !/^(?:Qm|baf)[A-Za-z0-9]{18,117}$/.test(body.photoCid)
    ) {
      return Response.json({ error: "Metadata claim tidak valid" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const normalizedTxHash = body.transactionHash.toLowerCase();
    const { data: existingClaim } = await db
      .from("claims")
      .select("id, hunt_id, hunter_pubkey")
      .eq("tx_hash", normalizedTxHash)
      .maybeSingle();
    if (existingClaim) {
      if (
        existingClaim.hunter_pubkey !== session.address ||
        existingClaim.hunt_id !== body.huntId
      ) {
        return Response.json({ error: "Transaksi sudah digunakan" }, { status: 409 });
      }
      const { error: huntUpdateError } = await db
        .from("hunts")
        .update({ status: "claim_pending" })
        .eq("id", body.huntId);
      if (huntUpdateError) throw huntUpdateError;
      return Response.json({ id: existingClaim.id });
    }

    const { data: hunt, error: huntError } = await db
      .from("hunts")
      .select("id, contract_id, status")
      .eq("id", body.huntId)
      .single();
    if (huntError || !hunt?.contract_id) {
      return Response.json({ error: "Hunt tidak ditemukan" }, { status: 404 });
    }
    if (hunt.status !== "active") {
      return Response.json({ error: "Hunt tidak lagi aktif" }, { status: 409 });
    }

    const chain = await verifyContractCall(
      body.transactionHash,
      hunt.contract_id,
      "submit_claim"
    );
    if (chain.args.length !== 4) throw new Error("Argumen submit_claim tidak sesuai kontrak MVP");

    const hunter = scAddress(chain.args[0]);
    const photoHash = scBytesToHex(chain.args[1]);
    const gpsLat = scBigInt(chain.args[2]);
    const gpsLng = scBigInt(chain.args[3]);
    const expectedPhotoHash = createHash("sha256").update(body.photoCid, "utf8").digest("hex");
    if (hunter !== session.address || photoHash !== expectedPhotoHash) {
      return Response.json(
        { error: "Metadata claim tidak cocok dengan transaksi on-chain" },
        { status: 422 }
      );
    }

    const { error: userError } = await db
      .from("users")
      .upsert({ public_key: session.address }, { onConflict: "public_key" });
    if (userError) throw userError;

    const { data, error } = await db
      .from("claims")
      .insert({
        hunt_id: body.huntId,
        hunter_pubkey: session.address,
        photo_cid: body.photoCid,
        photo_hash: photoHash,
        tx_hash: normalizedTxHash,
        gps_lat: Number(gpsLat) / 10_000_000,
        gps_lng: Number(gpsLng) / 10_000_000,
        status: "pending",
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const { data: existing } = await db
        .from("claims")
        .select("id, hunter_pubkey")
        .eq("tx_hash", normalizedTxHash)
        .single();
      if (existing?.hunter_pubkey === session.address) {
        const { error: huntUpdateError } = await db
          .from("hunts")
          .update({ status: "claim_pending" })
          .eq("id", body.huntId);
        if (huntUpdateError) throw huntUpdateError;
        return Response.json(existing);
      }
    }
    if (error) throw error;

    const { error: huntUpdateError } = await db
      .from("hunts")
      .update({ status: "claim_pending" })
      .eq("id", body.huntId);
    if (huntUpdateError) throw huntUpdateError;
    return Response.json(data, { status: 201 });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Wallet belum terautentikasi" : error instanceof Error ? error.message : "Gagal menyimpan claim" },
      { status: unauthenticated ? 401 : 500 }
    );
  }
}

import { createHash } from "node:crypto";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  scAddress,
  scBigInt,
  scBytesToHex,
  scNumber,
  verifyContractCall,
} from "@/lib/stellar/verify-transaction";

interface HuntIndexRequest {
  transactionHash?: unknown;
  huntIdHash?: unknown;
  clue?: unknown;
  photoCid?: unknown;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as HuntIndexRequest;
    if (
      typeof body.transactionHash !== "string" ||
      typeof body.huntIdHash !== "string" ||
      !/^[0-9a-f]{64}$/i.test(body.huntIdHash) ||
      typeof body.clue !== "string" ||
      body.clue.trim().length === 0 ||
      body.clue.length > 500 ||
      body.clue !== body.clue.trim() ||
      (body.photoCid !== null &&
        body.photoCid !== undefined &&
        (typeof body.photoCid !== "string" ||
          !/^(?:Qm|baf)[A-Za-z0-9]{18,117}$/.test(body.photoCid)))
    ) {
      return Response.json({ error: "Metadata hunt tidak valid" }, { status: 400 });
    }

    const factory = process.env.NEXT_PUBLIC_HUNT_FACTORY;
    const assetContract = process.env.NEXT_PUBLIC_XLM_ASSET_CONTRACT;
    if (!factory || !assetContract) throw new Error("Konfigurasi kontrak server belum lengkap");

    const chain = await verifyContractCall(body.transactionHash, factory, "create_hunt");
    if (chain.args.length !== 9 || !chain.returnValue) {
      throw new Error("Argumen create_hunt tidak sesuai kontrak MVP");
    }

    const huntIdHash = scBytesToHex(chain.args[0]);
    const hider = scAddress(chain.args[1]);
    const amount = scBigInt(chain.args[2]);
    const gpsLat = scBigInt(chain.args[3]);
    const gpsLng = scBigInt(chain.args[4]);
    const radius = scNumber(chain.args[5]);
    const deadline = scBigInt(chain.args[6]);
    const clueHash = scBytesToHex(chain.args[7]);
    const huntType = scNumber(chain.args[8]);
    const instance = scAddress(chain.returnValue);
    const photoCid = typeof body.photoCid === "string" ? body.photoCid : "";

    if (
      huntIdHash !== body.huntIdHash.toLowerCase() ||
      hider !== session.address ||
      clueHash !== sha256(body.clue + photoCid) ||
      huntType !== 0 ||
      amount <= BigInt(0) ||
      radius <= 0
    ) {
      return Response.json(
        { error: "Metadata tidak cocok dengan transaksi on-chain" },
        { status: 422 }
      );
    }

    const db = getSupabaseAdmin();
    const { error: userError } = await db
      .from("users")
      .upsert({ public_key: session.address }, { onConflict: "public_key" });
    if (userError) throw userError;

    const { data, error } = await db
      .from("hunts")
      .insert({
        hunt_id_hash: huntIdHash,
        contract_id: instance,
        create_tx_hash: body.transactionHash.toLowerCase(),
        hider_pubkey: session.address,
        asset_contract: assetContract,
        hunt_type: "gps",
        clue: body.clue.trim(),
        clue_hash: clueHash,
        latitude: Number(gpsLat) / 10_000_000,
        longitude: Number(gpsLng) / 10_000_000,
        radius_meters: radius,
        amount_stroops: amount.toString(),
        deadline: new Date(Number(deadline) * 1_000).toISOString(),
        status: "active",
        photo_cid: photoCid || null,
      })
      .select("id, contract_id")
      .single();

    if (error?.code === "23505") {
      const { data: existing } = await db
        .from("hunts")
        .select("id, contract_id, hider_pubkey")
        .eq("hunt_id_hash", huntIdHash)
        .single();
      if (existing?.hider_pubkey === session.address) return Response.json(existing);
    }
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Wallet belum terautentikasi" : error instanceof Error ? error.message : "Gagal menyimpan hunt" },
      { status: unauthenticated ? 401 : 500 }
    );
  }
}

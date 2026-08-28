import { requireSession } from "@/lib/auth/session";
import { recordWalletInteraction } from "@/lib/data/level4";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { scAddress, verifyContractCall } from "@/lib/stellar/verify-transaction";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const claimId = Number((await params).id);
    const body = (await request.json()) as {
      transactionHash?: unknown;
      resolution?: unknown;
    };
    if (
      !Number.isInteger(claimId) ||
      claimId <= 0 ||
      typeof body.transactionHash !== "string" ||
      (body.resolution !== "approve" && body.resolution !== "reject")
    ) {
      return Response.json({ error: "Resolusi claim tidak valid" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: claim } = await db
      .from("claims")
      .select("id, hunt_id, status, resolve_tx_hash")
      .eq("id", claimId)
      .single();
    if (!claim) return Response.json({ error: "Claim tidak ditemukan" }, { status: 404 });

    const { data: hunt } = await db
      .from("hunts")
      .select("id, contract_id, hider_pubkey")
      .eq("id", claim.hunt_id)
      .single();
    if (!hunt?.contract_id) return Response.json({ error: "Hunt tidak ditemukan" }, { status: 404 });
    if (hunt.hider_pubkey !== session.address) {
      return Response.json({ error: "Bukan pemilik hunt" }, { status: 403 });
    }

    const normalizedTxHash = body.transactionHash.toLowerCase();
    const claimStatus = body.resolution === "approve" ? "approved" : "rejected";
    const huntStatus = body.resolution === "approve" ? "claimed" : "active";
    if (claim.status !== "pending") {
      if (claim.status !== claimStatus || claim.resolve_tx_hash !== normalizedTxHash) {
        return Response.json({ error: "Claim sudah diselesaikan" }, { status: 409 });
      }
      const { error: huntRepairError } = await db
        .from("hunts")
        .update({ status: huntStatus })
        .eq("id", hunt.id);
      if (huntRepairError) throw huntRepairError;
      return Response.json({ status: claimStatus });
    }

    const chain = await verifyContractCall(
      body.transactionHash,
      hunt.contract_id,
      body.resolution
    );
    if (
      (body.resolution === "approve" && chain.args.length !== 1) ||
      (body.resolution === "reject" && chain.args.length !== 2) ||
      scAddress(chain.args[0]) !== session.address
    ) {
      return Response.json(
        { error: "Resolusi tidak cocok dengan transaksi on-chain" },
        { status: 422 }
      );
    }

    const { error: claimError } = await db
      .from("claims")
      .update({
        status: claimStatus,
        resolve_tx_hash: normalizedTxHash,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", claimId)
      .eq("status", "pending");
    if (claimError) throw claimError;
    const { error: huntError } = await db
      .from("hunts")
      .update({ status: huntStatus })
      .eq("id", hunt.id);
    if (huntError) throw huntError;

    const evidenceRecorded = await recordWalletInteraction({
      transactionHash: body.transactionHash,
      publicKey: session.address,
      action: body.resolution,
      contractId: hunt.contract_id,
      ledger: chain.ledger,
      confirmedAt: chain.confirmedAt,
    });
    return Response.json({ status: claimStatus, evidenceRecorded });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Wallet belum terautentikasi" : error instanceof Error ? error.message : "Gagal menyelesaikan claim" },
      { status: unauthenticated ? 401 : 500 }
    );
  }
}

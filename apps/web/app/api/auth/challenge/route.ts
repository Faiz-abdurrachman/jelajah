import { Keypair } from "@stellar/stellar-sdk";
import { createChallenge } from "@/lib/auth/session";

export async function POST(request: Request) {
  let address: string;
  try {
    const body = (await request.json()) as { address?: unknown };
    if (typeof body.address !== "string") {
      return Response.json({ error: "Address wajib diisi" }, { status: 400 });
    }

    Keypair.fromPublicKey(body.address);
    address = body.address;
  } catch {
    return Response.json({ error: "Address Stellar tidak valid" }, { status: 400 });
  }

  try {
    const message = await createChallenge(address);
    return Response.json({ message });
  } catch {
    return Response.json({ error: "Konfigurasi autentikasi server belum siap" }, { status: 500 });
  }
}

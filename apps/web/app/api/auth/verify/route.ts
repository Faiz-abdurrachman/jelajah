import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import {
  buildChallengeMessage,
  consumeChallenge,
  createSession,
  readChallenge,
} from "@/lib/auth/session";

function decodeSignature(value: string): Buffer | null {
  try {
    const encoding = /^[0-9a-f]{128}$/i.test(value) ? "hex" : "base64";
    const decoded = Buffer.from(value, encoding);
    return decoded.length === 64 ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: unknown;
      signature?: unknown;
      signedMessage?: unknown;
      scheme?: unknown;
    };
    if (
      typeof body.address !== "string" ||
      typeof body.signature !== "string"
    ) {
      return Response.json({ error: "Payload tanda tangan tidak valid" }, { status: 400 });
    }

    const challenge = await readChallenge();
    if (!challenge || challenge.address !== body.address) {
      return Response.json(
        { error: "Challenge tidak ada atau sudah kedaluwarsa" },
        { status: 401 }
      );
    }

    const signature = decodeSignature(body.signature);
    const message = buildChallengeMessage(challenge);
    const keypair = Keypair.fromPublicKey(body.address);
    let verified = false;
    if (signature !== null && body.scheme === "albedo") {
      const expectedSignedMessage = `${body.address}:${message}`;
      if (body.signedMessage === expectedSignedMessage) {
        const digest = createHash("sha256").update(expectedSignedMessage, "utf8").digest();
        verified = keypair.verify(digest, signature);
      }
    } else if (signature !== null && (body.scheme === undefined || body.scheme === "sep53")) {
      verified = keypair.verifyMessage(message, signature);
    }

    await consumeChallenge();
    if (!verified) {
      return Response.json({ error: "Tanda tangan wallet tidak valid" }, { status: 401 });
    }

    await createSession(body.address);
    return Response.json({ address: body.address });
  } catch {
    return Response.json({ error: "Gagal memverifikasi wallet" }, { status: 400 });
  }
}

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "jelajah_session";
export const CHALLENGE_COOKIE = "jelajah_challenge";

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const CHALLENGE_TTL_SECONDS = 5 * 60;

interface SignedPayload {
  exp: number;
}

export interface WalletSession extends SignedPayload {
  address: string;
}

export interface WalletChallenge extends WalletSession {
  nonce: string;
  issuedAt: string;
}

function getSigningSecret(): string {
  const secret =
    process.env.WALLET_SESSION_SECRET ??
    (process.env.NODE_ENV !== "production"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : undefined);

  if (!secret || secret.length < 32) {
    throw new Error(
      "WALLET_SESSION_SECRET must be configured with at least 32 characters"
    );
  }
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(value: string): Buffer {
  return createHmac("sha256", getSigningSecret()).update(value).digest();
}

function signPayload(payload: SignedPayload): string {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload).toString("base64url")}`;
}

function verifyPayload<T extends SignedPayload>(token: string | undefined): T | null {
  if (!token) return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const actual = Buffer.from(encodedSignature, "base64url");
    const expected = signature(encodedPayload);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }

    const payload = JSON.parse(decode(encodedPayload)) as T;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
  };
}

export function buildChallengeMessage(challenge: WalletChallenge): string {
  return [
    "JELAJAH wallet sign-in",
    `Address: ${challenge.address}`,
    `Nonce: ${challenge.nonce}`,
    `Issued At: ${challenge.issuedAt}`,
    "Network: Stellar Testnet",
  ].join("\n");
}

export async function createChallenge(address: string): Promise<string> {
  const issuedAt = new Date().toISOString();
  const challenge: WalletChallenge = {
    address,
    nonce: randomBytes(32).toString("hex"),
    issuedAt,
    exp: Date.now() + CHALLENGE_TTL_SECONDS * 1_000,
  };
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, signPayload(challenge), {
    ...cookieOptions(CHALLENGE_TTL_SECONDS),
    path: "/api/auth",
  });
  return buildChallengeMessage(challenge);
}

export async function readChallenge(): Promise<WalletChallenge | null> {
  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  return verifyPayload<WalletChallenge>(token);
}

export async function consumeChallenge(): Promise<void> {
  (await cookies()).delete(CHALLENGE_COOKIE);
}

export async function createSession(address: string): Promise<void> {
  const session: WalletSession = {
    address,
    exp: Date.now() + SESSION_TTL_SECONDS * 1_000,
  };
  (await cookies()).set(SESSION_COOKIE, signPayload(session), {
    ...cookieOptions(SESSION_TTL_SECONDS),
    path: "/",
  });
}

export async function getSession(): Promise<WalletSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyPayload<WalletSession>(token);
}

export async function requireSession(): Promise<WalletSession> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

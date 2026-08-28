export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    stellarRpc: Boolean(process.env.NEXT_PUBLIC_RPC_URL),
    huntFactory: Boolean(process.env.NEXT_PUBLIC_HUNT_FACTORY),
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    walletSession: Boolean(process.env.WALLET_SESSION_SECRET),
  };
  const ready = Object.values(checks).every(Boolean);

  return Response.json(
    {
      status: ready ? "ok" : "degraded",
      ready,
      service: "jelajah-web",
      network: "testnet",
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

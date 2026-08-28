const REQUIRED_ENV = [
  "NEXT_PUBLIC_NETWORK",
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_HORIZON_URL",
  "NEXT_PUBLIC_NETWORK_PASSPHRASE",
  "NEXT_PUBLIC_HUNT_FACTORY",
  "NEXT_PUBLIC_XLM_ASSET_CONTRACT",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WALLET_SESSION_SECRET",
  "PINATA_API_KEY",
  "PINATA_SECRET_KEY",
];

const failures = [];

function result(label, ok, detail) {
  const marker = ok ? "PASS" : "FAIL";
  console.log(`${marker.padEnd(4)}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

for (const name of REQUIRED_ENV) {
  const configured = Boolean(process.env[name]?.trim());
  result(`env:${name}`, configured, configured ? "configured" : "missing");
}

const level = Number(process.env.NEXT_PUBLIC_CURRENT_LEVEL);
result("feature:level-4", Number.isInteger(level) && level >= 4, `configured L${Number.isFinite(level) ? level : "?"}`);
result("network:testnet", process.env.NEXT_PUBLIC_NETWORK === "testnet", process.env.NEXT_PUBLIC_NETWORK ?? "missing");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && serviceKey) {
  const tableChecks = [
    ["campaigns", "id,budget_stroops,funded_stroops"],
    ["onboarding_sessions", "id"],
    ["wallet_interactions", "transaction_hash"],
    ["feedback_submissions", "id"],
  ];
  await Promise.all(
    tableChecks.map(async ([table, select]) => {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=0`,
          {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
            signal: AbortSignal.timeout(10_000),
          }
        );
        let detail = `HTTP ${response.status}`;
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          if (body?.code) detail += ` (${body.code})`;
        }
        result(`database:${table}`, response.ok, detail);
      } catch (error) {
        result(
          `database:${table}`,
          false,
          error instanceof Error ? error.message : "request failed"
        );
      }
    })
  );
}

const liveBaseUrl = process.env.LEVEL4_BASE_URL?.replace(/\/$/, "");
if (liveBaseUrl) {
  try {
    const response = await fetch(`${liveBaseUrl}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => null);
    result("production:health", response.ok && body?.ready === true, body?.status ?? `HTTP ${response.status}`);
  } catch (error) {
    result("production:health", false, error instanceof Error ? error.message : "request failed");
  }
} else {
  console.log("SKIP  production:health — set LEVEL4_BASE_URL after deployment");
}

console.log("");
if (failures.length) {
  console.error(`Level 4 preflight blocked by ${failures.length} check(s).`);
  process.exitCode = 1;
} else {
  console.log("Level 4 preflight passed.");
}

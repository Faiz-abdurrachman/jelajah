import { expect, test } from "@playwright/test";

test.describe("Production operations", () => {
  test("exposes a non-cached health signal without secrets", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");

    const health = await response.json();
    expect(health).toMatchObject({
      service: "jelajah-web",
      network: "testnet",
      ready: expect.any(Boolean),
      status: expect.stringMatching(/^(ok|degraded)$/),
      checks: {
        stellarRpc: expect.any(Boolean),
        huntFactory: expect.any(Boolean),
        supabase: expect.any(Boolean),
        walletSession: expect.any(Boolean),
      },
    });
    expect(JSON.stringify(health)).not.toMatch(/service_role|session_secret|private|seed/i);
  });
});

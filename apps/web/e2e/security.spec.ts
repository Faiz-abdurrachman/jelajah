import { test, expect } from "@playwright/test";

const VALID_PUBLIC_KEY = "GDSA2CNOWLERBL4FKEXRETDGU3R5ARGY5MSTSN5FSVGBBF55JL4DTTJY";

test.describe("Wallet API security", () => {
  test("issues a short-lived HttpOnly wallet challenge", async ({ request }) => {
    const response = await request.post("/api/auth/challenge", {
      data: { address: VALID_PUBLIC_KEY },
    });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining(VALID_PUBLIC_KEY),
    });
    const cookie = response.headers()["set-cookie"];
    expect(cookie).toContain("jelajah_challenge=");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  test("rejects malformed Stellar addresses", async ({ request }) => {
    const response = await request.post("/api/auth/challenge", {
      data: { address: "not-a-stellar-address" },
    });
    expect(response.status()).toBe(400);
  });

  test("blocks database and upload mutations without a wallet session", async ({ request }) => {
    const hunt = await request.post("/api/hunts", { data: {} });
    expect(hunt.status()).toBe(401);

    const upload = await request.post("/api/ipfs/upload", {
      multipart: { file: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("fake") } },
    });
    expect(upload.status()).toBe(401);
  });
});

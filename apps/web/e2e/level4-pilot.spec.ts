import { expect, test, type Page } from "@playwright/test";

const ADDRESS = "GDSA2CNOWLERBL4FKEXRETDGU3R5ARGY5MSTSN5FSVGBBF55JL4DTTJY";
const TRANSACTION_HASH = "b".repeat(64);

const STARTED_STATUS = {
  onboarding: {
    role: "hunter",
    currentStep: "pilot_started",
    consentVersion: "level4-pilot-v1",
    consentedAt: "2026-08-28T00:00:00.000Z",
    completedAt: null,
  },
  interactions: [],
  feedbackSubmitted: false,
};

const VERIFIED_STATUS = {
  ...STARTED_STATUS,
  interactions: [
    {
      transactionHash: TRANSACTION_HASH,
      action: "claim_hunt",
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
      ledger: 4_400_001,
      confirmedAt: "2026-08-28T01:00:00.000Z",
    },
  ],
};

async function restoreWallet(page: Page) {
  await page.addInitScript(({ address }) => {
    localStorage.setItem("jelajah-wallet", JSON.stringify({ address, walletId: "freighter" }));
  }, { address: ADDRESS });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, address: ADDRESS }),
    });
  });
}

test.describe("Level 4 real-user pilot", () => {
  test("explains consent before collecting pilot data", async ({ page }) => {
    await restoreWallet(page);
    await page.route("**/api/pilot", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ onboarding: null, interactions: [], feedbackSubmitted: false }),
        });
        return;
      }
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(STARTED_STATUS) });
    });

    await page.goto("/pilot");
    await expect(page.getByRole("heading", { name: "Pilih peran dan beri persetujuan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mulai sesi pilot" })).toBeDisabled();
    await page.getByText(/Saya setuju data pilot/).click();
    await page.getByRole("button", { name: "Mulai sesi pilot" }).click();
    await expect(page.getByRole("heading", { name: "Selesaikan satu tugas Testnet" })).toBeVisible();
  });

  test("accepts feedback only after verified wallet evidence", async ({ page }) => {
    await restoreWallet(page);
    let submittedBody: Record<string, unknown> | null = null;
    await page.route("**/api/pilot", async (route) => {
      if (route.request().method() === "POST") {
        submittedBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...VERIFIED_STATUS,
            onboarding: { ...VERIFIED_STATUS.onboarding, completedAt: "2026-08-28T02:00:00.000Z" },
            feedbackSubmitted: true,
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VERIFIED_STATUS) });
    });

    await page.goto("/pilot");
    await expect(page.getByText(/claim hunt/i)).toBeVisible();
    await page.getByRole("button", { name: "Onboarding: 4 dari 5" }).click();
    await page.getByRole("button", { name: "Kejelasan transaksi: 5 dari 5" }).click();
    await page.getByRole("button", { name: "Kemudahan UI: 4 dari 5" }).click();
    await page.getByRole("group", { name: "Saya paham kapan reward dikunci/dikirim" }).getByRole("button", { name: "Ya" }).click();
    await page.getByRole("group", { name: "Saya bersedia memakai JELAJAH lagi" }).getByRole("button", { name: "Ya" }).click();
    await page.getByLabel("Bagian paling membingungkan").fill("Konfirmasi wallet sempat tidak terlihat.");
    await page.getByLabel("Saran perbaikan").fill("Tambahkan progress transaksi yang lebih rinci.");
    await page.getByRole("button", { name: "Kirim feedback" }).click();

    await expect(page.getByRole("heading", { name: "Sesi pilot selesai" })).toBeVisible();
    expect(submittedBody).toMatchObject({
      action: "feedback",
      onboardingRating: 4,
      transactionClarityRating: 5,
      usabilityRating: 4,
      understoodRewardTiming: true,
      wouldUseAgain: true,
      consentToAnonymousUse: true,
    });
  });
});

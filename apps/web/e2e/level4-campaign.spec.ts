import { expect, test, type Page } from "@playwright/test";

const ADDRESS = "GDSA2CNOWLERBL4FKEXRETDGU3R5ARGY5MSTSN5FSVGBBF55JL4DTTJY";

const BRAND = {
  companyName: "Jelajah Labs",
  subscriptionTier: "basic",
  totalCampaigns: 1,
  totalSpentStroops: 50_000_000,
  createdAt: "2026-08-28T00:00:00.000Z",
};

const CAMPAIGN = {
  id: 7,
  name: "Jelajah Kota Tua",
  description: "Aktivasi komunitas melalui hunt berhadiah.",
  budgetStroops: 1_000_000_000,
  fundedStroops: 50_000_000,
  assetCode: "XLM",
  status: "active",
  startDate: "2026-09-10T00:00:00.000Z",
  endDate: "2026-09-20T00:00:00.000Z",
  createdAt: "2026-08-28T00:00:00.000Z",
  hunts: [
    {
      id: 9,
      status: "active",
      amountStroops: 50_000_000,
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
      transactionHash: "a".repeat(64),
      deadline: "2026-09-18T00:00:00.000Z",
    },
  ],
};

async function restoreWallet(page: Page) {
  await page.addInitScript(({ address }) => {
    localStorage.setItem("jelajah-wallet", JSON.stringify({ address, walletId: "freighter" }));
  }, { address: ADDRESS });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true, address: ADDRESS }) });
  });
  await page.route("**/api/brands", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ brand: BRAND }) });
  });
  await page.route("**/api/campaigns", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ campaign: { ...CAMPAIGN, id: 8, fundedStroops: 0, status: "draft", hunts: [] } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ campaigns: [CAMPAIGN] }) });
  });
}

test.describe("Level 4 campaign workspace", () => {
  test("shows secure wallet onboarding before sponsor data", async ({ page }) => {
    await page.goto("/brand/dashboard");
    await expect(page.getByRole("heading", { name: "Buka sponsor workspace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect wallet", exact: true })).toBeVisible();
    await expect(page.getByText("secret key")).toBeVisible();
  });

  test("renders confirmed campaign evidence without mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await restoreWallet(page);
    await page.goto("/brand/dashboard");

    await expect(page.getByRole("heading", { name: "Brand field desk" })).toBeVisible();
    await expect(page.getByText("Jelajah Kota Tua")).toBeVisible();
    await expect(page.getByText("5 XLM funded")).toBeVisible();
    await expect(page.getByRole("link", { name: /Tambah hunt/ })).toHaveAttribute("href", "/hunt/create?campaign=7");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("creates a campaign workspace then opens the on-chain funding wizard", async ({ page }) => {
    await restoreWallet(page);
    await page.goto("/brand/dashboard");
    await page.getByRole("button", { name: "Campaign baru" }).click();

    await page.getByPlaceholder("Contoh: Jelajah Kota Tua").fill("Pasar Kreatif Bandung");
    await page.getByPlaceholder("Apa pengalaman yang ingin dibuat untuk peserta?").fill("Mendorong kunjungan ke pelaku UMKM lokal.");
    await page.getByRole("button", { name: /Lanjut/ }).click();
    await page.getByPlaceholder("100").fill("25");
    await page.getByRole("button", { name: /Lanjut/ }).click();
    await page.locator('input[type="date"]').nth(0).fill("2026-09-10");
    await page.locator('input[type="date"]').nth(1).fill("2026-09-20");
    await page.getByRole("button", { name: /Lanjut/ }).click();
    await page.getByRole("button", { name: "Buat & danai hunt" }).click();

    await expect(page).toHaveURL(/\/hunt\/create\?campaign=8$/);
    await expect(page.getByText("Campaign escrow")).toBeVisible();
    await expect(page.getByText(/campaign #8/)).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("page loads with title and CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/JELAJAH/);

    await expect(page.getByRole("heading", { name: "JELAJAH" })).toBeVisible();
    await expect(page.getByText("Hidden. Hunted. Claimed.")).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Connect Wallet" }).first()
    ).toBeVisible();
  });

  test("how it works section renders", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("1. CREATE")).toBeVisible();
    await expect(page.getByText("2. HUNT")).toBeVisible();
    await expect(page.getByText("3. CLAIM")).toBeVisible();
  });

  test("Lihat Peta button navigates to map", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Lihat Peta" }).click();
    await expect(page).toHaveURL(/\/map/);
  });
});

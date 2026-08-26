import { test, expect } from "@playwright/test";

test.describe("Hunt Create Flow", () => {
  test("create hunt page loads and wizard renders", async ({ page }) => {
    await page.goto("/hunt/create");
    await expect(page).toHaveURL(/\/hunt\/create/);

    // First step label is "Type"
    await expect(page.getByText("Type")).toBeVisible();
  });

  test("GPS is selectable while unfinished hunt types are disabled", async ({ page }) => {
    await page.goto("/hunt/create");

    const gps = page.getByRole("button", { name: /GPS Hunt/ });
    await expect(gps).toBeEnabled();
    await expect(page.getByRole("button", { name: /Quest Chain/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Race Hunt/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Puzzle Hunt/ })).toBeDisabled();

    await gps.click();
    await expect(page.getByRole("button", { name: "Lanjut" })).toBeEnabled();
  });

  test("navigation buttons present", async ({ page }) => {
    await page.goto("/hunt/create");

    await expect(
      page.getByRole("button", { name: "Lanjut" })
    ).toBeVisible();
  });
});

test.describe("Hunt Detail Page", () => {
  test("hunt detail page renders for a hunt ID", async ({ page }) => {
    await page.goto("/hunt/1");
    await expect(page).toHaveURL(/\/hunt\/1/);

    // Should show hunt content or loading skeleton
    await expect(page.locator(".animate-pulse, button:has-text('GPS')").first()).toBeVisible({ timeout: 15000 });
  });
});

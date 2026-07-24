import { test, expect } from "@playwright/test";

test.describe("Hunt Create Flow", () => {
  test("create hunt page loads and wizard renders", async ({ page }) => {
    await page.goto("/hunt/create");
    await expect(page).toHaveURL(/\/hunt\/create/);

    // First step label is "Type"
    await expect(page.getByText("Type")).toBeVisible();
  });

  test("hunt types are selectable", async ({ page }) => {
    await page.goto("/hunt/create");

    await expect(page.getByText("GPS Hunt", { exact: false })).toBeVisible();
    await expect(page.getByText("Quest", { exact: false })).toBeVisible();
    await expect(page.getByText("Race", { exact: false })).toBeVisible();
    await expect(page.getByText("Puzzle", { exact: false })).toBeVisible();
  });

  test("navigation buttons present", async ({ page }) => {
    await page.goto("/hunt/create");

    await expect(
      page.getByRole("button", { name: "Next" })
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

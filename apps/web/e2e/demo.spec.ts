import { expect, test } from "@playwright/test";

test.describe("Level 3 demo playback", () => {
  test("loads the default MP4 source without an endless loading state", async ({ page }) => {
    await page.goto("/demo");

    await expect.poll(() => page.locator("video").evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2);
    await expect(page.getByText("Siap diputar", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "MP4" })).toHaveAttribute("aria-pressed", "true");
  });

  test("allows visitors to switch explicitly to the WebM fallback", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: "WebM" }).click();

    await expect.poll(() => page.locator("video").evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2);
    await expect(page.getByText("Siap diputar · WebM")).toBeVisible();
    await expect(page.getByRole("button", { name: "WebM" })).toHaveAttribute("aria-pressed", "true");
  });
});

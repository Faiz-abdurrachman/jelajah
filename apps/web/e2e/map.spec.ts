import { test, expect } from "@playwright/test";

test.describe("Map Page", () => {
  test("page loads and renders map container", async ({ page }) => {
    await page.goto("/map");

    await expect(page).toHaveURL(/\/map/);

    // Map component renders a container div
    const mapContainer = page.locator('[class*="mapbox"], #map, [data-testid="hunt-map"]');
    await expect(mapContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test("navbar is visible on map page", async ({ page }) => {
    await page.goto("/map");

    await expect(page.getByText("JELAJAH").first()).toBeVisible();
  });
});

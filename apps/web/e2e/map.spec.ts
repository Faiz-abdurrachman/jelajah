import { test, expect } from "@playwright/test";

test.describe("Map Page", () => {
  test("page loads and renders map container", async ({ page }) => {
    await page.goto("/map");

    await expect(page).toHaveURL(/\/map/);

    // Leaflet map container or Mapbox fallback
    const mapContainer = page.locator(".leaflet-container, [class*='mapbox']");
    await expect(mapContainer.first()).toBeVisible({ timeout: 15000 });
  });

  test("navbar is visible on map page", async ({ page }) => {
    await page.goto("/map");

    await expect(page.getByText("JELAJAH").first()).toBeVisible();
  });

  test("leaflet tiles load", async ({ page }) => {
    await page.goto("/map");

    // Leaflet tiles should appear after map loads
    const tileLayer = page.locator(".leaflet-tile-loaded").first();
    await expect(tileLayer).toBeVisible({ timeout: 15000 });
  });
});

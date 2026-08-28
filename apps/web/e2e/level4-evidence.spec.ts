import { expect, test } from "@playwright/test";

test("renders evidence from verified pilot aggregates on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/pilot/summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        qualifiedUsers: 10,
        onboardedUsers: 12,
        completedUsers: 10,
        verifiedInteractions: 14,
        feedbackResponses: 10,
        averages: {
          onboarding: 4.3,
          transactionClarity: 4.1,
          usability: 4.4,
          understoodRewardTimingPercent: 80,
          wouldUseAgainPercent: 90,
        },
        recentTransactions: [
          {
            transactionHash: "c".repeat(64),
            action: "create_hunt",
            ledger: 4_400_111,
            confirmedAt: "2026-08-28T03:00:00.000Z",
          },
        ],
        generatedAt: "2026-08-28T04:00:00.000Z",
      }),
    });
  });

  await page.goto("/pilot/evidence");
  await expect(page.getByRole("heading", { name: "Level 4 field report" })).toBeVisible();
  await expect(page.getByText("10 / 10")).toBeVisible();
  await expect(page.getByText("14", { exact: true })).toBeVisible();
  await expect(page.getByText("4.4/5")).toBeVisible();
  await expect(page.getByRole("link", { name: /create hunt/ })).toHaveAttribute(
    "href",
    `https://stellar.expert/explorer/testnet/tx/${"c".repeat(64)}`
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

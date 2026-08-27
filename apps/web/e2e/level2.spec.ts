import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Keypair, xdr } from "@stellar/stellar-sdk";
import { formatTransactionResultError } from "@/lib/stellar/soroban";

test.describe("Level 2 multi-wallet and contract events", () => {
  test("turns rejected contract XDR into a readable error", () => {
    const errorResult = new xdr.TransactionResult({
      feeCharged: xdr.Int64.fromString("100"),
      result: xdr.TransactionResultResult.txFailed([
        xdr.OperationResult.opInner(
          xdr.OperationResultTr.invokeHostFunction(
            xdr.InvokeHostFunctionResult.invokeHostFunctionTrapped()
          )
        ),
      ]),
      ext: new xdr.TransactionResultExt(0),
    });

    const message = formatTransactionResultError(errorResult);
    expect(message).toContain("txFailed / invokeHostFunction / invokeHostFunctionTrapped");
    expect(message).not.toContain("[object Object]");
  });

  test("shows Freighter and Albedo as explicit Testnet wallet options", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).first().click();

    await expect(page.getByRole("heading", { name: "Pilih Stellar Wallet" })).toBeVisible();
    await expect(page.getByTestId("wallet-option-freighter")).toContainText("Freighter");
    await expect(page.getByTestId("wallet-option-albedo")).toContainText("Albedo");
    await expect(page.getByText("Secret key tidak pernah masuk ke aplikasi.")).toBeVisible();
    await expect(page.getByText("Testnet", { exact: true })).toBeVisible();
  });

  test("renders new Soroban events with a visible confirmed transaction state", async ({ page }) => {
    await page.route("**/api/stellar/events**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cursor: "0000436000-0000000000",
          latestLedger: 4_360_000,
          monitoredContracts: ["CA4YH5KFC5JBT6ISKCG42VU4PNN6EAAE245CLMOZTJDSIEGDRA4IQR55"],
          events: [
            {
              id: "0000435999-0000000001",
              name: "hunt_created",
              contractId: "CA4YH5KFC5JBT6ISKCG42VU4PNN6EAAE245CLMOZTJDSIEGDRA4IQR55",
              ledger: 4_359_999,
              closedAt: "2026-08-27T10:00:00Z",
              txHash: "a".repeat(64),
              successful: true,
            },
          ],
        }),
      });
    });

    await page.goto("/wallet");
    const feed = page.getByTestId("contract-event-feed");
    await expect(feed.getByText("Live", { exact: true })).toBeVisible();
    await expect(feed.getByText("Hunt dibuat")).toBeVisible();
    await expect(feed.getByText("Confirmed")).toBeVisible();
    await expect(feed.getByRole("link", { name: /Lihat transaksi/ })).toHaveAttribute(
      "href",
      /stellar\.expert\/explorer\/testnet\/tx\//
    );
  });

  test("keeps the live feed recoverable when Stellar RPC fails", async ({ page }) => {
    await page.route("**/api/stellar/events**", async (route) => {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "RPC Testnet sementara tidak tersedia" }),
      });
    });

    await page.goto("/wallet");
    const feed = page.getByTestId("contract-event-feed");
    await expect(feed.getByText("Retrying")).toBeVisible();
    await expect(feed.getByRole("alert")).toContainText("RPC Testnet sementara tidak tersedia");
    await expect(feed.getByRole("button", { name: "Refresh contract events" })).toBeVisible();
  });

  test("authenticates an Albedo challenge and rejects a modified payload", async ({ request }) => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    const challengeResponse = await request.post("/api/auth/challenge", { data: { address } });
    const challenge = (await challengeResponse.json()) as { message: string };
    const signedMessage = `${address}:${challenge.message}`;
    const signature = keypair
      .sign(createHash("sha256").update(signedMessage, "utf8").digest())
      .toString("hex");

    const verified = await request.post("/api/auth/verify", {
      data: { address, signature, signedMessage, scheme: "albedo" },
    });
    expect(verified.status()).toBe(200);

    const secondChallenge = await request.post("/api/auth/challenge", { data: { address } });
    const secondMessage = ((await secondChallenge.json()) as { message: string }).message;
    const rejected = await request.post("/api/auth/verify", {
      data: {
        address,
        signature,
        signedMessage: `${address}:${secondMessage}:modified`,
        scheme: "albedo",
      },
    });
    expect(rejected.status()).toBe(401);
  });
});

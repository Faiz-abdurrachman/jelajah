import { expect, test } from "@playwright/test";
import { Keypair } from "@stellar/stellar-sdk";
import {
  getPaymentErrorMessage,
  validateXlmPaymentInput,
} from "../lib/stellar/payment";

test.describe("Level 1 XLM payment", () => {
  const source = Keypair.random().publicKey();
  const destination = Keypair.random().publicKey();

  test("accepts a valid native XLM payment", () => {
    expect(() =>
      validateXlmPaymentInput({
        source,
        destination,
        amount: "1.2345678",
        memo: "JELAJAH Level 1",
      })
    ).not.toThrow();
  });

  test("rejects malformed destinations and unsafe amounts", () => {
    expect(() =>
      validateXlmPaymentInput({ source, destination: "not-stellar", amount: "1" })
    ).toThrow("Address penerima Stellar tidak valid");
    expect(() =>
      validateXlmPaymentInput({ source, destination, amount: "0" })
    ).toThrow("Jumlah XLM harus lebih dari 0");
    expect(() =>
      validateXlmPaymentInput({ source, destination, amount: "1.00000001" })
    ).toThrow("maksimal 7 desimal");
  });

  test("enforces the Stellar text memo byte limit", () => {
    expect(() =>
      validateXlmPaymentInput({
        source,
        destination,
        amount: "1",
        memo: "🚀".repeat(8),
      })
    ).toThrow("Memo maksimal 28 byte");
  });

  test("keeps the payment form behind a connected wallet", async ({ page }) => {
    await page.goto("/wallet");
    await expect(page.getByRole("button", { name: "Connect Wallet" }).first()).toBeVisible();
    await expect(page.getByTestId("send-xlm-card")).toHaveCount(0);
  });

  test("maps an underfunded Horizon result to actionable feedback", () => {
    expect(
      getPaymentErrorMessage({
        response: {
          data: {
            extras: {
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_underfunded"],
              },
            },
          },
        },
      })
    ).toContain("Saldo XLM tidak mencukupi");
  });
});

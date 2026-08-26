import {
  Asset,
  Horizon,
  Memo,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { NETWORKS, STELLAR_CONFIG } from "@/config/constants";

const MAX_MEMO_BYTES = 28;
const XLM_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;

export interface XlmPaymentInput {
  source: string;
  destination: string;
  amount: string;
  memo?: string;
}

export interface SubmittedPayment {
  hash: string;
  successful: boolean;
}

export function validateXlmPaymentInput(input: XlmPaymentInput): void {
  const destination = input.destination.trim();
  const amount = input.amount.trim();
  const memo = input.memo?.trim() ?? "";

  if (!StrKey.isValidEd25519PublicKey(input.source)) {
    throw new Error("Wallet pengirim tidak valid");
  }
  if (!StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("Address penerima Stellar tidak valid");
  }
  if (destination === input.source) {
    throw new Error("Address penerima harus berbeda dari wallet pengirim");
  }
  if (!XLM_AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
    throw new Error("Jumlah XLM harus lebih dari 0 dengan maksimal 7 desimal");
  }
  if (new TextEncoder().encode(memo).length > MAX_MEMO_BYTES) {
    throw new Error("Memo maksimal 28 byte");
  }
}

export async function prepareXlmPayment(input: XlmPaymentInput): Promise<string> {
  validateXlmPaymentInput(input);
  if (STELLAR_CONFIG.networkPassphrase !== NETWORKS.testnet.passphrase) {
    throw new Error("XLM payment Level 1 hanya diizinkan pada Stellar Testnet");
  }

  const destination = input.destination.trim();
  const amount = input.amount.trim();
  const memo = input.memo?.trim() ?? "";
  const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);

  const [sourceAccount, fee] = await Promise.all([
    server.loadAccount(input.source),
    server.fetchBaseFee(),
    // A classic payment cannot create an unfunded destination account.
    server.loadAccount(destination),
  ]);

  let builder = new TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  }).addOperation(
    Operation.payment({
      destination,
      asset: Asset.native(),
      amount,
    })
  );

  if (memo) builder = builder.addMemo(Memo.text(memo));
  return builder.setTimeout(180).build().toXDR();
}

export async function submitXlmPayment(signedXdr: string): Promise<SubmittedPayment> {
  const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_CONFIG.networkPassphrase
  );
  const response = await server.submitTransaction(transaction);
  return { hash: response.hash, successful: response.successful };
}

export function getPaymentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (/404|not found/i.test(error.message)) {
      return "Akun pengirim atau penerima belum aktif di Stellar Testnet";
    }
    if (/Network Error|fetch|Failed to fetch/i.test(error.message)) {
      return "Gagal terhubung ke Stellar Testnet. Coba lagi.";
    }
    if (!/Request failed with status code/i.test(error.message)) {
      return error.message;
    }
  }

  const response = (error as {
    response?: {
      data?: {
        extras?: {
          result_codes?: { transaction?: string; operations?: string[] };
        };
      };
    };
  })?.response;
  const codes = response?.data?.extras?.result_codes;
  const operationCode = codes?.operations?.[0];
  if (operationCode === "op_underfunded") {
    return "Saldo XLM tidak mencukupi setelah memperhitungkan minimum reserve dan fee";
  }
  if (operationCode === "op_no_destination") {
    return "Akun penerima belum aktif di Stellar Testnet";
  }
  if (codes?.transaction === "tx_bad_seq") {
    return "Sequence wallet berubah. Muat ulang balance lalu coba lagi.";
  }
  return "Transaksi XLM gagal dikirim ke Stellar Testnet";
}

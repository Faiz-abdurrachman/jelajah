import albedo from "@albedo-link/intent";
import {
  getAddress,
  getNetwork,
  requestAccess,
  signMessage,
  signTransaction,
} from "@stellar/freighter-api";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { NETWORKS } from "@/config/constants";
import { getNetworkPassphrase } from "@/lib/stellar/soroban";

export type WalletId = "freighter" | "albedo";

export interface WalletOption {
  id: WalletId;
  name: string;
  description: string;
  kind: "Extension" | "Web wallet";
}

export const WALLET_OPTIONS: readonly WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    description: "Wallet extension resmi untuk ekosistem Stellar.",
    kind: "Extension",
  },
  {
    id: "albedo",
    name: "Albedo",
    description: "Wallet web Stellar yang dapat dibuka tanpa extension.",
    kind: "Web wallet",
  },
] as const;

export function getWalletName(walletId: WalletId | null): string | null {
  return WALLET_OPTIONS.find((wallet) => wallet.id === walletId)?.name ?? null;
}

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function assertFreighterTestnet(): Promise<void> {
  if (getNetworkPassphrase() !== NETWORKS.testnet.passphrase) {
    throw new Error("JELAJAH harus dikonfigurasi untuk Stellar Testnet");
  }

  const configured = await getNetwork();
  if (configured.error) throw new Error("Gagal membaca network Freighter");
  if (configured.networkPassphrase !== NETWORKS.testnet.passphrase) {
    throw new Error("Ubah network Freighter ke Stellar Testnet lalu coba lagi");
  }
}

export async function connectWallet(walletId: WalletId): Promise<string> {
  if (walletId === "albedo") {
    const result = await albedo.publicKey({});
    if (!result.pubkey) throw new Error("Albedo tidak mengembalikan address wallet");
    return result.pubkey;
  }

  const access = await requestAccess();
  let address = access.address;
  if (access.error || !address) {
    const existing = await getAddress();
    if (existing.error || !existing.address) {
      throw new Error(
        "Freighter tidak tersedia. Pastikan extension terpasang, unlocked, dan izin koneksi diberikan."
      );
    }
    address = existing.address;
  }

  await assertFreighterTestnet();
  return address;
}

export interface WalletChallengeSignature {
  scheme: "sep53" | "albedo";
  signature: string;
  signedMessage?: string;
}

export async function signWalletChallenge(
  walletId: WalletId,
  address: string,
  message: string
): Promise<WalletChallengeSignature> {
  if (walletId === "albedo") {
    const result = await albedo.signMessage({ message, pubkey: address });
    if (
      result.pubkey !== address ||
      result.original_message !== message ||
      result.signed_message !== `${address}:${message}` ||
      !result.message_signature
    ) {
      throw new Error("Tanda tangan login Albedo tidak cocok dengan wallet yang dipilih");
    }
    return {
      scheme: "albedo",
      signature: result.message_signature,
      signedMessage: result.signed_message,
    };
  }

  await assertFreighterTestnet();
  const result = await signMessage(message, {
    address,
    networkPassphrase: getNetworkPassphrase(),
  });
  if (result.error || !result.signedMessage || result.signerAddress !== address) {
    throw new Error(
      result.error?.message ?? "Tanda tangan login ditolak atau memakai akun yang berbeda"
    );
  }

  return {
    scheme: "sep53",
    signature:
      typeof result.signedMessage === "string"
        ? result.signedMessage
        : bytesToBase64(new Uint8Array(result.signedMessage)),
  };
}

function hasExpectedSignature(signedXdr: string, address: string): boolean {
  const transaction = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  const hash = transaction.hash();
  const keypair = Keypair.fromPublicKey(address);
  return transaction.signatures.some((decorated) =>
    keypair.verify(hash, decorated.signature())
  );
}

export async function signWalletTransaction(
  walletId: WalletId,
  address: string,
  xdr: string
): Promise<string> {
  let signedXdr: string;

  if (walletId === "albedo") {
    const result = await albedo.tx({
      xdr,
      pubkey: address,
      network: "testnet",
      submit: false,
      description: "JELAJAH transaction on Stellar Testnet",
    });
    if (result.network !== "testnet" || !result.signed_envelope_xdr) {
      throw new Error("Albedo tidak menandatangani transaksi di Stellar Testnet");
    }
    signedXdr = result.signed_envelope_xdr;
  } else {
    await assertFreighterTestnet();
    const result = await signTransaction(xdr, {
      networkPassphrase: getNetworkPassphrase(),
      address,
    });
    if (result.error || !result.signedTxXdr || result.signerAddress !== address) {
      if (result.error) throw result.error;
      throw new Error("Transaksi ditolak atau ditandatangani akun yang berbeda");
    }
    signedXdr = result.signedTxXdr;
  }

  if (!hasExpectedSignature(signedXdr, address)) {
    throw new Error("Signature transaksi tidak cocok dengan wallet yang terhubung");
  }
  return signedXdr;
}

export function normalizeWalletError(error: unknown, walletId: WalletId): string {
  const fallback = `Gagal menghubungkan ${getWalletName(walletId) ?? "wallet"}`;
  const extractMessage = (value: unknown, depth = 0): string | null => {
    if (depth > 2) return null;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value instanceof Error && value.message.trim()) return value.message.trim();
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const key of ["message", "errorMessage", "error", "details"]) {
        const nested = extractMessage(record[key], depth + 1);
        if (nested) return nested;
      }
      if (typeof record.code === "number") return `Wallet error (code ${record.code})`;
    }
    return null;
  };

  const message = extractMessage(error) ?? fallback;
  if (/reject|declin|cancel|closed|denied|code\s*4001/i.test(message)) {
    return "Permintaan wallet dibatalkan atau ditolak pengguna.";
  }
  if (/popup|window|blocked/i.test(message)) {
    return "Popup wallet diblokir browser. Izinkan popup lalu coba lagi.";
  }
  if (/network|testnet/i.test(message)) return message;
  return message || fallback;
}

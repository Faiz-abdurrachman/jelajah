"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  getAddress,
  getNetwork,
  requestAccess,
  signMessage,
  signTransaction,
} from "@stellar/freighter-api";
import { Horizon } from "@stellar/stellar-sdk";
import { NETWORKS, STELLAR_CONFIG } from "@/config/constants";
import { submitSignedTx, getNetworkPassphrase } from "@/lib/stellar/soroban";
import type { WalletBalance, Transaction } from "@/types";

// ─── Types ────────────────────────────────────────────

interface WalletContextValue {
  isConnected: boolean;
  publicKey: string | null;
  balance: WalletBalance | null;
  transactions: Transaction[];
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  signTransactionXdr: (xdr: string) => Promise<{
    signedXdr: string;
    success: boolean;
    error?: string;
  }>;
  signAndSubmit: (xdr: string) => Promise<{ hash: string; success: boolean; error?: string }>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function authenticateWallet(address: string): Promise<void> {
  const challengeResponse = await fetch("/api/auth/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const challenge = (await challengeResponse.json()) as {
    message?: string;
    error?: string;
  };
  if (!challengeResponse.ok || !challenge.message) {
    throw new Error(challenge.error ?? "Gagal membuat challenge wallet");
  }

  const signed = await signMessage(challenge.message, {
    address,
    networkPassphrase: getNetworkPassphrase(),
  });
  if (signed.error || !signed.signedMessage || signed.signerAddress !== address) {
    throw new Error("Tanda tangan login ditolak atau memakai akun yang berbeda");
  }

  const signature =
    typeof signed.signedMessage === "string"
      ? signed.signedMessage
      : bytesToBase64(new Uint8Array(signed.signedMessage));
  const verifyResponse = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature }),
  });
  const verification = (await verifyResponse.json()) as { error?: string };
  if (!verifyResponse.ok) {
    throw new Error(verification.error ?? "Autentikasi wallet gagal");
  }
}

async function assertFreighterNetwork(): Promise<void> {
  if (getNetworkPassphrase() !== NETWORKS.testnet.passphrase) {
    throw new Error("JELAJAH Level 1 harus dikonfigurasi untuk Stellar Testnet");
  }
  const configured = await getNetwork();
  if (configured.error) {
    throw new Error("Gagal membaca network Freighter");
  }
  if (configured.networkPassphrase !== NETWORKS.testnet.passphrase) {
    throw new Error("Ubah network Freighter ke Stellar Testnet lalu coba lagi");
  }
}

// ─── Provider ─────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore only when the wallet address also has a valid server session.
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const [{ address }, sessionResponse] = await Promise.all([
          getAddress(),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);
        if (address && sessionResponse.ok) {
          const session = (await sessionResponse.json()) as { address?: string };
          if (session.address !== address) return;
          await assertFreighterNetwork();
          setPublicKey(address);
        }
      } catch {
        // Freighter not installed
      }
    };
    checkExistingConnection();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Freighter v6: requestAccess triggers permission popup and returns address
      const { address, error: accessError } = await requestAccess();
      let resolvedAddress = address;
      if (accessError || !address) {
        // If requestAccess fails, try getAddress directly (already authorized)
        const { address: addr, error: addrError } = await getAddress();
        if (addrError || !addr) {
          throw new Error("Gagal mendapatkan address wallet. Pastikan Freighter terinstall dan unlocked.");
        }
        resolvedAddress = addr;
      }
      await assertFreighterNetwork();
      await authenticateWallet(resolvedAddress);
      setPublicKey(resolvedAddress);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal connect ke Freighter";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    void fetch("/api/auth/session", { method: "DELETE" });
    setPublicKey(null);
    setBalance(null);
    setTransactions([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Track previous publicKey to avoid refetching same data
  const prevPubKey = useRef<string | null>(null);

  useEffect(() => {
    if (!publicKey || publicKey === prevPubKey.current) return;
    prevPubKey.current = publicKey;

    const fetchData = async () => {
      try {
        const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
        const account = await server.loadAccount(publicKey);

        const xlmBalance = account.balances.find(
          (b) => b.asset_type === "native"
        );
        const usdcBalance = account.balances.find(
          (b) =>
            "asset_code" in b &&
            b.asset_code === "USDC" &&
            "asset_issuer" in b &&
            b.asset_issuer ===
              "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5ZG34P526VI"
        );

        setBalance({
          xlm: xlmBalance?.balance ?? "0",
          usdc: usdcBalance && "balance" in usdcBalance ? usdcBalance.balance : "0",
        });
      } catch {
        setError("Gagal memuat balance");
      }

      try {
        const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
        const txPage = await server
          .transactions()
          .forAccount(publicKey)
          .order("desc")
          .limit(20)
          .call();

        const txList: Transaction[] = txPage.records.map((tx) => ({
          hash: tx.hash,
          type: tx.successful ? "success" : "failed",
          amount: "0",
          asset: "XLM",
          timestamp: tx.created_at,
          success: tx.successful,
        }));

        setTransactions(txList);
      } catch {
        // Silent fail for tx history
      }
    };

    fetchData();
  }, [publicKey]);

  // ── Manual refresh functions for UI buttons ────

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
      const account = await server.loadAccount(publicKey);
      const xlmBalance = account.balances.find((b) => b.asset_type === "native");
      const usdcBalance = account.balances.find(
        (b) =>
          "asset_code" in b &&
          b.asset_code === "USDC" &&
          "asset_issuer" in b &&
          b.asset_issuer ===
            "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5ZG34P526VI"
      );
      setBalance({
        xlm: xlmBalance?.balance ?? "0",
        usdc: usdcBalance && "balance" in usdcBalance ? usdcBalance.balance : "0",
      });
    } catch {
      setError("Gagal memuat balance");
    }
  }, [publicKey]);

  const refreshTransactions = useCallback(async () => {
    if (!publicKey) return;
    try {
      const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
      const txPage = await server
        .transactions()
        .forAccount(publicKey)
        .order("desc")
        .limit(20)
        .call();
      const txList: Transaction[] = txPage.records.map((tx) => ({
        hash: tx.hash,
        type: tx.successful ? "success" : "failed",
        amount: "0",
        asset: "XLM",
        timestamp: tx.created_at,
        success: tx.successful,
      }));
      setTransactions(txList);
    } catch {
      // Silent fail
    }
  }, [publicKey]);

  const signTransactionXdr = useCallback(
    async (xdr: string): Promise<{
      signedXdr: string;
      success: boolean;
      error?: string;
    }> => {
      if (!publicKey) {
        return { signedXdr: "", success: false, error: "Wallet not connected" };
      }

      const { signedTxXdr, signerAddress, error: signError } = await signTransaction(xdr, {
        networkPassphrase: getNetworkPassphrase(),
        address: publicKey,
      });

      if (signError || !signedTxXdr || signerAddress !== publicKey) {
        return {
          signedXdr: "",
          success: false,
          error: signError ?? "User rejected signing or selected a different account",
        };
      }

      return { signedXdr: signedTxXdr, success: true };
    },
    [publicKey]
  );

  const signAndSubmit = useCallback(
    async (xdr: string): Promise<{ hash: string; success: boolean; error?: string }> => {
      const signed = await signTransactionXdr(xdr);
      if (!signed.success || !signed.signedXdr) {
        return { hash: "", success: false, error: signed.error };
      }

      const result = await submitSignedTx(signed.signedXdr);
      return result;
    },
    [signTransactionXdr]
  );

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!publicKey,
        publicKey,
        balance,
        transactions,
        isConnecting,
        error,
        connect,
        disconnect,
        refreshBalance,
        refreshTransactions,
        signTransactionXdr,
        signAndSubmit,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

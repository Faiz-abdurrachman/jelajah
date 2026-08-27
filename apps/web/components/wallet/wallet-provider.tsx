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
import { Horizon } from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "@/config/constants";
import { submitSignedTx } from "@/lib/stellar/soroban";
import {
  connectWallet,
  getWalletName,
  normalizeWalletError,
  signWalletChallenge,
  signWalletTransaction,
  type WalletId,
} from "@/lib/stellar/wallet-adapters";
import { WalletSelector } from "@/components/wallet/wallet-selector";
import type { WalletBalance, Transaction } from "@/types";

// ─── Types ────────────────────────────────────────────

interface WalletContextValue {
  isConnected: boolean;
  publicKey: string | null;
  walletId: WalletId | null;
  walletName: string | null;
  balance: WalletBalance | null;
  transactions: Transaction[];
  isConnecting: boolean;
  error: string | null;
  connect: (walletId?: WalletId) => Promise<void>;
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

const WALLET_STORAGE_KEY = "jelajah-wallet";

async function authenticateWallet(address: string, walletId: WalletId): Promise<void> {
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

  const signed = await signWalletChallenge(walletId, address, challenge.message);
  const verifyResponse = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      signature: signed.signature,
      signedMessage: signed.signedMessage,
      scheme: signed.scheme,
    }),
  });
  const verification = (await verifyResponse.json()) as { error?: string };
  if (!verifyResponse.ok) {
    throw new Error(verification.error ?? "Autentikasi wallet gagal");
  }
}

// ─── Provider ─────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<WalletId | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<WalletId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore only when the wallet address also has a valid server session.
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem(WALLET_STORAGE_KEY) ?? "null") as {
          address?: unknown;
          walletId?: unknown;
        } | null;
        if (
          !saved ||
          typeof saved.address !== "string" ||
          (saved.walletId !== "freighter" && saved.walletId !== "albedo")
        ) return;

        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) return;
        const session = (await sessionResponse.json()) as { address?: string };
        if (session.address !== saved.address) return;
        setWalletId(saved.walletId);
        setPublicKey(saved.address);
      } catch {
        localStorage.removeItem(WALLET_STORAGE_KEY);
      }
    };
    checkExistingConnection();
  }, []);

  const connect = useCallback(async (selectedWallet?: WalletId) => {
    if (!selectedWallet) {
      setError(null);
      setSelectorOpen(true);
      return;
    }

    setIsConnecting(true);
    setConnectingWallet(selectedWallet);
    setError(null);

    try {
      const address = await connectWallet(selectedWallet);
      await authenticateWallet(address, selectedWallet);
      setWalletId(selectedWallet);
      setPublicKey(address);
      localStorage.setItem(
        WALLET_STORAGE_KEY,
        JSON.stringify({ address, walletId: selectedWallet })
      );
      setSelectorOpen(false);
    } catch (err) {
      setError(normalizeWalletError(err, selectedWallet));
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    void fetch("/api/auth/session", { method: "DELETE" });
    localStorage.removeItem(WALLET_STORAGE_KEY);
    setPublicKey(null);
    setWalletId(null);
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
      if (!publicKey || !walletId) {
        return { signedXdr: "", success: false, error: "Wallet not connected" };
      }

      try {
        const signedXdr = await signWalletTransaction(walletId, publicKey, xdr);
        return { signedXdr, success: true };
      } catch (signError) {
        return {
          signedXdr: "",
          success: false,
          error: normalizeWalletError(signError, walletId),
        };
      }
    },
    [publicKey, walletId]
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
        walletId,
        walletName: getWalletName(walletId),
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
      <WalletSelector
        open={selectorOpen}
        onOpenChange={(open) => {
          if (!isConnecting) setSelectorOpen(open);
        }}
        onSelect={(selectedWallet) => void connect(selectedWallet)}
        connectingWallet={connectingWallet}
        error={error}
      />
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

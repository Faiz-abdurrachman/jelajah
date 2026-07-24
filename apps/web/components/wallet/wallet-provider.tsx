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
  requestAccess,
} from "@stellar/freighter-api";
import { Horizon } from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "@/config/constants";
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
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet was previously connected
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const { address } = await getAddress();
        if (address) {
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
      if (accessError || !address) {
        // If requestAccess fails, try getAddress directly (already authorized)
        const { address: addr, error: addrError } = await getAddress();
        if (addrError || !addr) {
          throw new Error("Gagal mendapatkan address wallet. Pastikan Freighter terinstall dan unlocked.");
        }
        setPublicKey(addr);
      } else {
        setPublicKey(address);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal connect ke Freighter";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
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

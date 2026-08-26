"use client";

import { RequireLevel } from "@/components/feature-gate";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, ExternalLink } from "lucide-react";

export default function WalletPage() {
  const {
    isConnected,
    publicKey,
    balance,
    transactions,
    connect,
    disconnect,
    isConnecting,
    refreshBalance,
    refreshTransactions,
  } = useWallet();

  const truncateKey = (key: string) =>
    `${key.slice(0, 8)}...${key.slice(-8)}`;

  return (
    <RequireLevel level={1}>
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Wallet className="size-6" />
          Wallet
        </h1>

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Button onClick={connect} disabled={isConnecting} size="lg">
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Balance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    refreshBalance();
                    refreshTransactions();
                  }}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">XLM</p>
                    <p className="text-2xl font-bold font-mono">
                      {balance?.xlm ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">USDC</p>
                    <p className="text-2xl font-bold font-mono">
                      {balance?.usdc ?? "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connected Account */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Connected Account
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <code className="text-sm font-mono">
                  {truncateKey(publicKey ?? "")}
                </code>
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Belum ada transaksi
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.hash}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-2 rounded-full ${
                              tx.success ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <code className="text-xs font-mono">
                            {tx.hash.slice(0, 12)}...
                          </code>
                        </div>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RequireLevel>
  );
}

"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Send,
} from "lucide-react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getPaymentErrorMessage,
  prepareXlmPayment,
  submitXlmPayment,
} from "@/lib/stellar/payment";

type PaymentPhase =
  | "idle"
  | "preparing"
  | "signing"
  | "submitting"
  | "success"
  | "error";

export function XlmSendForm() {
  const {
    publicKey,
    walletName,
    balance,
    signTransactionXdr,
    refreshBalance,
    refreshTransactions,
  } = useWallet();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("JELAJAH Level 1");
  const [phase, setPhase] = useState<PaymentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const isBusy = phase === "preparing" || phase === "signing" || phase === "submitting";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!publicKey || isBusy) return;

    setError(null);
    setTransactionHash(null);

    try {
      setPhase("preparing");
      const unsignedXdr = await prepareXlmPayment({
        source: publicKey,
        destination,
        amount,
        memo,
      });

      setPhase("signing");
      const signed = await signTransactionXdr(unsignedXdr);
      if (!signed.success || !signed.signedXdr) {
        throw new Error(signed.error ?? "Transaksi ditolak di wallet");
      }

      setPhase("submitting");
      const submitted = await submitXlmPayment(signed.signedXdr);
      if (!submitted.successful) throw new Error("Stellar menolak transaksi XLM");

      setTransactionHash(submitted.hash);
      setPhase("success");
      await Promise.all([refreshBalance(), refreshTransactions()]);
    } catch (paymentError) {
      setError(getPaymentErrorMessage(paymentError));
      setPhase("error");
    }
  };

  return (
    <Card data-testid="send-xlm-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="size-4" />
            Send XLM
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Classic payment langsung melalui Stellar Horizon.
          </p>
        </div>
        <Badge variant="secondary">Testnet</Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="payment-destination">
              Address penerima
            </label>
            <Input
              id="payment-destination"
              name="destination"
              placeholder="G..."
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              disabled={isBusy}
              autoComplete="off"
              maxLength={56}
              required
            />
            <p className="text-xs text-muted-foreground">
              Akun penerima harus sudah aktif di Stellar Testnet.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium" htmlFor="payment-amount">
                Jumlah
              </label>
              <span className="text-xs text-muted-foreground">
                Balance: {balance?.xlm ?? "—"} XLM
              </span>
            </div>
            <div className="relative">
              <Input
                id="payment-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="1.0000000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isBusy}
                autoComplete="off"
                required
                className="pr-14"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">
                XLM
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="payment-memo">
              Memo <span className="font-normal text-muted-foreground">(opsional)</span>
            </label>
            <Input
              id="payment-memo"
              name="memo"
              placeholder="Maksimal 28 byte"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              disabled={isBusy}
              autoComplete="off"
            />
          </div>

          <Button className="w-full" type="submit" disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {phase === "preparing"
                  ? "Menyiapkan transaksi..."
                  : phase === "signing"
                    ? `Konfirmasi di ${walletName ?? "wallet"}...`
                    : "Mengirim ke Testnet..."}
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Send XLM on Testnet
              </>
            )}
          </Button>
        </form>

        {phase === "success" && transactionHash && (
          <div
            className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4"
            data-testid="payment-success"
            role="status"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Transaction berhasil di Stellar Testnet
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Transaction hash</p>
            <code className="mt-1 block break-all text-xs" data-testid="payment-hash">
              {transactionHash}
            </code>
            <a
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
              href={`https://stellar.expert/explorer/testnet/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Lihat konfirmasi di Stellar Expert
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}

        {phase === "error" && error && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            data-testid="payment-error"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Transaction gagal</p>
              <p className="mt-1 text-xs">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("JELAJAH global error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: "center" }}>
            <p style={{ color: "#047857", fontSize: 12, fontWeight: 700, letterSpacing: ".14em" }}>JELAJAH RECOVERY</p>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Aplikasi perlu dimuat ulang</h1>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>Transaksi yang sudah dikirim tetap tercatat di Stellar. Muat ulang aplikasi untuk melanjutkan.</p>
            <button type="button" onClick={reset} style={{ marginTop: 20, border: 0, borderRadius: 8, padding: "10px 16px", background: "#047857", color: "white", fontWeight: 600, cursor: "pointer" }}>Muat ulang JELAJAH</button>
          </div>
        </main>
      </body>
    </html>
  );
}

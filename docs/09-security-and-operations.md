# JELAJAH GPS MVP — Security & Operations

## Canonical flow

1. Browser meminta nonce sekali pakai dari `/api/auth/challenge`.
2. Freighter menandatangani pesan dengan SEP-53.
3. Server memverifikasi signature dan menyimpan session HMAC di cookie `HttpOnly`.
4. Hider memanggil factory `create_hunt`; factory deploy instance deterministik dan memindahkan native XLM ke instance secara atomik.
5. Setelah transaksi final, server membaca envelope XDR dan mencocokkan contract, method, seluruh argumen, wallet session, serta hash metadata sebelum mengindeks ke Supabase.
6. Claim dan resolve memakai pola yang sama: chain berhasil lebih dulu, database hanya menjadi index turunan.

## Escrow state machine

- `Active` → hunter valid mengirim claim → `ClaimPending`.
- Hider approve → XLM dibayar ke hunter → `Claimed`.
- Tidak ada respons selama 24 jam → siapa pun dapat memanggil `auto_release` → `Claimed`.
- Hider reject → hunter ditandai tidak boleh retry, hunt kembali `Active`, escrow tetap tersedia.
- Hunt aktif melewati deadline → siapa pun dapat memanggil `claim_expired`, XLM kembali ke hider → `Expired`.
- Hider tidak boleh claim hunt miliknya sendiri.

## Database boundary

Anon Supabase hanya mendapat `SELECT` untuk data publik. Tabel claim, notification, referral, API key, dan audit log tidak memiliki public policy. Semua mutation MVP berjalan lewat Next.js Route Handler dengan service role server-side setelah wallet dan transaksi on-chain diverifikasi.

Apply untuk database yang sudah ada:

```sql
-- Jalankan isi file berikut di Supabase SQL Editor:
apps/web/lib/supabase/migrations/001_secure_gps_mvp.sql
```

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY`, `PINATA_API_KEY`, `PINATA_SECRET_KEY`, dan `WALLET_SESSION_SECRET` tidak boleh memakai prefix `NEXT_PUBLIC_`.
- `lib/supabase/seed.sql` hanya data demo legacy, bukan transaksi chain canonical dan tidak boleh dijalankan di production.
- Rotate service-role key yang pernah masuk Git history. Rewrite history saja tidak mencabut credential.
- Gunakan `apps/web/.env.example` sebagai daftar variable tanpa nilai rahasia.

## Known trust boundary

Soroban tidak dapat membuktikan sensor GPS browser. Koordinat claim on-chain adalah pernyataan bertanda tangan dari hunter, lalu foto dan keputusan hider menjadi lapisan verifikasi. Jangan memasarkan MVP sebagai GPS oracle atau sepenuhnya trustless. Untuk produksi, tambahkan attestation/oracle, mekanisme dispute yang benar-benar mengendalikan escrow, rate limiting, dan audit independen.

## Testnet deployment

- Factory: `CA4YH5KFC5JBT6ISKCG42VU4PNN6EAAE245CLMOZTJDSIEGDRA4IQR55`
- Hunt-instance WASM SHA-256: `eee91c39c3700c63ad7a329738721b49a50722d9a000054ad876dca51d12dfce`
- Native XLM SAC: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Smoke-test instance: `CCEX3DHRPFWFTDDTHPUJT7ZX7V2LZK53LLB477EDSNRTCQJELQZU3TRA`

Validated live: create with 1 XLM, second-account claim, hider approval, final status `Claimed`, escrow balance `0`.

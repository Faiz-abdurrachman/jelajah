# Level 3 Demo Script

Target durasi: 1–2 menit. Recorder visual dapat dijalankan dari `apps/web` dengan:

```bash
node scripts/record-level3-demo.mjs
```

Recorder membutuhkan `ffmpeg` untuk menghasilkan WebM VP8 dengan cue di depan serta MP4 H.264 dengan metadata `faststart`. Halaman `/demo` memilih source yang didukung browser dan menyediakan fallback unduhan.

## Narasi opsional

1. **Intro** — “JELAJAH adalah platform treasure hunt dunia nyata di Stellar Testnet. Hider mengunci XLM, hunter mengirim bukti, dan payout diselesaikan on-chain.”
2. **Live events** — “UI menerima event Soroban melalui Server-Sent Events dengan cursor, retry, heartbeat, dan reconnect.”
3. **Inter-contract** — “Factory men-deploy HuntInstance dan mendaftarkannya ke Reputation. Instance hanya memberi XP setelah payout berhasil.”
4. **Transaction proof** — “Transaksi Testnet ini membayar hunter dan memberi 100 XP secara atomik. Status akhir, escrow nol, dan replay marker telah dibaca ulang dari chain.”
5. **CI dan tests** — “GitHub Actions membangun frontend dan tiga WASM, kemudian menjalankan 23 test Playwright serta 19 test Rust.”
6. **Outro** — “Live demo, contract address, transaction hash, deployment manifest, screenshot, dan dokumentasi lengkap tersedia di repository publik.”

Video hasil recorder tidak berisi secret, seed phrase, atau credential wallet.

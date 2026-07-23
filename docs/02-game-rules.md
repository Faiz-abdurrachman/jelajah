# JELAJAH — Aturan Main (Game Rules)

## 1. Aturan untuk Hider

### 1.1 Cara Bikin Hunt
1. Pilih jenis hunt (GPS / Quest Chain / Race / Puzzle / Photo)
2. Tulis clue (makin kreatif makin seru)
3. Pin lokasi di map (set GPS coordinate)
4. Upload foto referensi (hanya untuk verifikasi, tidak ditampilkan ke hunter)
5. Tentukan reward amount
6. Tentukan deadline (min 1 jam, max 30 hari)
7. Deposit reward ke Claimable Balance Stellar
8. (Opsional) Buat QR code → print → tempel di lokasi

### 1.2 Aturan Reward
- Reward minimal: Rp 10.000 (atau setara USDC/XLM)
- Reward maximal (free user): Rp 5.000.000
- Reward di-deposit penuh di Claimable Balance
- Tidak bisa ditarik setelah di-deposit (kecuali deadline habis tanpa claim)

### 1.3 Verifikasi
- Hider bisa approve langsung saat hunter submit bukti
- Kalau hider gak respon dalam 24 jam → duit auto cair ke hunter
- Kalau hider nolak → wajib kasih alasan → masuk dispute

### 1.4 Larangan Hider
- Dilarang bikin hunt di lokasi berbahaya (tebing, rel kereta, properti pribadi tanpa izin)
- Dilarang bikin clue yang mengandung SARA, kekerasan, atau konten dewasa
- Dilarang bikin hunt dengan maksud penipuan (lokasi palsu, reward palsu)
- Pelanggaran → reputasi turun / banned

---

## 2. Aturan untuk Hunter

### 2.1 Cara Berburu
1. Buka map → lihat hunt yang tersedia dalam radius
2. Pilih hunt → baca clue
3. Navigasi ke lokasi (GPS guide)
4. Sampai dalam radius → tombol "CLAIM" aktif
5. Ambil foto bukti dari lokasi
6. Submit → tunggu verifikasi

### 2.2 Verifikasi
- GPS harus dalam radius yang ditentukan hider
- Foto harus diambil dari lokasi (metadata GPS dicek browser)
- Kalau foto gak sesuai → hider bisa reject

### 2.3 Larangan Hunter
- Dilarang GPS spoofing (fake location) → ketahuan = banned permanent
- Dilarang kerjasama dengan hider untuk manipulasi claim
- Dilarang menggunakan banyak akun

---

## 3. Aturan Verifikator (Multi-Sig)

### 3.1 Syarat Jadi Verifikator
- Minimal stake 5.000 XLM
- Minimal 10 hunt berhasil di-claim
- Skor reputasi minimal 1.000
- Tidak dalam status banned

### 3.2 Cara Kerja Dispute
1. Hider reject claim hunter
2. Sistem pilih 3 verifikator secara random dari pool
3. Verifikator lihat: foto referensi hider vs foto bukti hunter + alasan reject
4. Voting dengan sistem commit-reveal (gak bisa saling liat vote)
5. 2-of-3 setuju → duit cair / balok
6. Fee verifikator: 60% dari dispute fee

### 3.3 Sanksi Verifikator
| Pelanggaran | Sanksi |
|---|---|
| Ngawur vote (sendirian minority) 3x | Stake kena slash 10% |
| Nyolong vote (gak review) | Stake kena slash 25% |
| Kolusi dengan hider/hunter | Stake kena slash 100% + banned permanent |
| Appeal membalikkan keputusan | Reputasi turun 50 poin |

### 3.4 Appeal
- Hunter/hider gak puas → bayar appeal fee Rp 100rb
- Naik ke Higher Court: 5 verifikator senior
- 3-of-5 mutusin final
- Kalau hasil berubah → 2 verifikator awal kena slash + appeal fee balik
- Kalau hasil tetap → appeal fee hangus

---

## 4. Aturan Sistem

| Aturan | Nilai |
|---|---|
| GPS radius min | 10 meter |
| GPS radius max | 100 meter |
| Timer claim | 24 jam |
| Timer appeal | 48 jam |
| Dispute fee | 5% dari nilai hunt |
| Appeal fee | Rp 100.000 |
| Stake min verifikator | 5.000 XLM |
| Leaderboard reset | Bulanan |
| Max reward free user | Rp 5.000.000 |

---

## 5. Anti-Cheat & Keamanan

| Ancaman | Mitigasi |
|---|---|
| GPS spoofing | Deteksi browser GPS + verifikasi foto + timestamp + multi-sig |
| Sybil attack (banyak akun) | Minimal stake buat verifikator + reputasi |
| Bot | Wajib upload foto (gak bisa script-only) |
| Hider curang (reject valid) | Auto-release 24 jam + appeal |
| Verifikator kolusi | Commit-reveal + random selection + slash |
| Fake QR code | QR ter-hash ke Soroban, verify on-chain |

---

## 6. Tingkatan & XP

| Level | XP Required | Title |
|---|---|---|
| 1 | 0 | Beginner |
| 2 | 500 | Explorer |
| 3 | 2.000 | Tracker |
| 4 | 5.000 | Hunter |
| 5 | 15.000 | Elite Hunter |
| 6 | 50.000 | Legend |

### XP Sources
| Aksi | XP |
|---|---|
| Claim hunt sukses | +100 |
| Bikin hunt | +30 |
| Orang claim hunt lo | +20 |
| Verifikasi dispute | +50 |
| Referral (temen claim pertama) | +200 |
| Login streak (per hari, max 7) | +10 |

### Badges
| Badge | Syarat |
|---|---|
| 🏅 First Blood | Claim hunt pertama |
| 🏅 Speed Demon | Claim dalam 10 menit |
| 🏅 Explorer | 5 hunt claimed |
| 🏅 Mapper | 5 quest chain selesai |
| 🏅 Philanthropist | Rp 5jt total dibuat |
| 🏅 Detective | 10 puzzle hunt selesai |
| 🏅 Justice | 50 dispute selesai |
| 🏅 Legend | Semua badge sebelumnya |

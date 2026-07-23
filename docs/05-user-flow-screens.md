# JELAJAH — User Flow & Screens

## 1. Onboarding & Auth

| ID | Screen | Description |
|---|---|---|
| 1A | **Landing Page** | Logo JELAJAH, tagline "Hidden. Hunted. Claimed.", tombol "Connect Wallet" |
| 1B | **Wallet Select** | Pilih wallet: Freighter, Albedo, xBull, Lobstr |
| 1C | **Wallet Connected** | Berhasil connect, redirect ke map |

---

## 2. Map & Discovery

| ID | Screen | Description |
|---|---|---|
| 2A | **Map View** | Full-screen map, marker hunt terdekat, zoom in/out, search bar |
| 2B | **Map Filter** | Filter: hunt type, amount range, distance, deadline |
| 2C | **List View** | Toggle dari map → list cards: foto, clue, amount, distance |
| 2D | **My Hunts Toggle** | Switch: liat semua hunt atau hunt yang gue ikuti doang |

---

## 3. Hunt Detail & Flow

| ID | Screen | Description |
|---|---|---|
| 3A | **Hunt Detail** | Clue, amount, deadline, hider profile (@name + ⭐ rating), petunjuk arah |
| 3B | **GPS Route** | Arah ke lokasi, jarak real-time dari target |
| 3C | **Active Hunt** | Lagi berburu: distance ke lokasi, clue display, compass |
| 3D | **Claim — Arrived** | ✅ Dalam radius → tombol ambil foto aktif |
| 3E | **Claim — Photo** | Kamera view, ambil foto, preview, submit |
| 3F | **Claim — Pending** | "Menunggu verifikasi hider. Timer: 23:45:12" |
| 3G | **Claim — Approved** | 🎉 "Rp X.XXX cair ke wallet lo!" + tx hash |
| 3H | **Claim — Rejected** | ❌ Alasan + opsi dispute |
| 3I | **Claim — Expired** | ⏰ Deadline habis, hunt dihapus dari map |

---

## 4. Create Hunt (Hider)

| ID | Screen | Description |
|---|---|---|
| 4A | **New Hunt — Type** | Pilih: GPS / Quest Chain / Race / Puzzle / Photo |
| 4B | **Create — Clue** | Tulis clue, upload foto referensi |
| 4C | **Create — GPS** | Pin lokasi di map, set radius (10-100m) |
| 4D | **Create — Reward** | Set amount, pilih asset (XLM / USDC) |
| 4E | **Create — Deadline** | Set deadline (1 jam - 30 hari) |
| 4F | **Create — QR** | (Opsional) Generate QR, print |
| 4G | **Create — Review** | Preview semua info hunt |
| 4H | **Create — Sign** | Sign transaction Stellar, deposit amount |
| 4I | **Create — Success** | "Hunt live! 🎉" |

---

## 5. Quest Chain

| ID | Screen | Description |
|---|---|---|
| 5A | **Quest Overview** | "Step 1/5: Cari QR di Pasar Senen" |
| 5B | **Quest Step Found** | QR scanned → step selesai → unlock step berikutnya |
| 5C | **Quest Final Step** | Lokasi terakhir → ambil foto → claim hadiah |
| 5D | **Quest Complete** | 🎉 Semua step selesai |

---

## 6. Profile

| ID | Screen | Description |
|---|---|---|
| 6A | **Profile Overview** | Public key, display name, stats (hunt found, hunt created, XP, level) |
| 6B | **Badges** | Grid of earned badges |
| 6C | **Hunt History** | Riwayat: created + claimed + verified |
| 6D | **Edit Profile** | Edit display name, avatar |

---

## 7. Wallet

| ID | Screen | Description |
|---|---|---|
| 7A | **Wallet** | Balance XLM + USDC |
| 7B | **Transaction History** | List tx: deposit, claim, transfer |
| 7C | **Deposit** | (via Anchor / external) |
| 7D | **Withdraw** | (via Anchor, IDR → rekening bank) |

---

## 8. Verifier System

| ID | Screen | Description |
|---|---|---|
| 8A | **Verifier Dashboard** | Stats: total dispute, pending, dana, stake |
| 8B | **Dispute List** | Kasus yang perlu di-vote |
| 8C | **Dispute Vote** | Lihat bukti hider vs hunter → approve / reject (commit-reveal) |
| 8D | **Vote History** | Riwayat vote + fee earned |
| 8E | **Stake Manage** | Stake / unstake XLM |

---

## 9. Dispute

| ID | Screen | Description |
|---|---|---|
| 9A | **Dispute Notification** | "Hider reject claim lo" |
| 9B | **Dispute Detail** | Foto hider vs foto hunter + alasan reject |
| 9C | **Dispute Result** | "2-of-3 APPROVE → duit cair!" |
| 9D | **Appeal** | Form appeal (alasan, bukti tambahan) |
| 9E | **Appeal Result** | Final decision |

---

## 10. Brand Dashboard

| ID | Screen | Description |
|---|---|---|
| 10A | **Brand Register** | Pilih paket: Basic / Pro / Enterprise |
| 10B | **Brand Dashboard** | Stats: total campaign, views, participants, spending |
| 10C | **Create Campaign** | Pilih lokasi, jumlah hunt, total budget |
| 10D | **Campaign Detail** | Detail + analytics per hunt |
| 10E | **Analytics** | Grafik foot traffic, engagement, ROI |

---

## 11. Leaderboard & Social

| ID | Screen | Description |
|---|---|---|
| 11A | **Leaderboard — Hunter** | Top hunter bulan ini |
| 11B | **Leaderboard — Hider** | Top hider (most hunt created) |
| 11C | **Community Feed** | "Budi nemu hunt di Monas! 🎉", "Sita bikin hunt Rp 1jt!" |
| 11D | **Notifications** | Notifikasi: hunt baru, claim diterima, dispute, badge |

---

## 12. Settings & Help

| ID | Screen | Description |
|---|---|---|
| 12A | **Settings** | Network (testnet/mainnet), Language (EN/ID), Currency |
| 12B | **Tutorial** | Cara main JELAJAH (step-by-step) |
| 12C | **FAQ** | Dispute, verifikasi, fee, stake |

---

## User Flow Diagram

### Hunter Flow
```
1A Landing → 1B Wallet Select → 2A Map → 3A Hunt Detail → 3B GPS Route
  → 3C Active Hunt → 3D Arrived → 3E Photo → 3F Pending → 3G Claimed 🎉
                                                                  │
                                                             (kalau ditolak)
                                                                  ▼
                                                              9A Dispute → 9B Detail → 9C Result
                                                                  │
                                                             (kalau gak puas)
                                                                  ▼
                                                              9D Appeal → 9E Result
```

### Hider Flow
```
2A Map → Tap "+" → 4A Type → 4B Clue → 4C GPS → 4D Reward → 4E Deadline
  → 4G Review → 4H Sign → 4I Success 🎉
```

### Brand Flow
```
2A Map → Tap "Brand" → 10A Register → 10B Dashboard → 10C Campaign
  → 10D Detail → 10E Analytics
```

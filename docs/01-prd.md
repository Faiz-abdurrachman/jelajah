# JELAJAH — Product Requirement Document (PRD)

## 1. Product Overview

### Nama
**JELAJAH**

### Tagline
**"Hidden. Hunted. Claimed."**

### One-Liner
Real-world treasure hunt platform di Stellar blockchain. Siapa aja bisa bikin harta karun di lokasi fisik, orang lain cari, nemu, dan klaim hadiahnya — semuanya otomatis dan trustless.

### Visi
Menjembatani dunia fisik dengan blockchain. Value yang terkunci di lokasi, bukan di wallet address.

---

## 2. Kenapa Stellar?

| Fitur Stellar | Gunanya buat JELAJAH |
|---|---|
| **Claimable Balances** | Escrow native — duit ditahan sampai kondisi terpenuhi. Gak perlu deploy kontrak custom. |
| **Path Payments** | Bounty poster bayar USDC, hunter di Indo terima IDR — 1 transaksi atomik. |
| **Fee ~Rp 1/transaksi** | Viable buat hunt kecil Rp 10.000. Di Ethereum gas > reward. |
| **Multi-sig native** | Dispute resolution: 2-of-3 verifikator. |
| **Anchor Protocol** | Hunter tarik dana ke rekening bank lokal. |

---

## 3. Core Loop

```
CREATE → HIDE → HUNT → CLAIM → REPEAT
```

| Step | Actor | Detail |
|---|---|---|
| **CREATE** | Hider | Bikin hunt: pilih jenis, set clue, GPS lokasi, upload foto referensi, set reward + deadline, deposit duit |
| **HIDE** | Smart Contract | Reward dikunci di Claimable Balance Stellar |
| **HUNT** | Hunter | Lihat map, baca clue, navigasi ke lokasi |
| **CLAIM** | Hunter | GPS verified → upload foto bukti → hider approve / auto cair 24 jam |
| **REPEAT** | Hunter/Hider | Reputasi naik, badge, leaderboard |

---

## 4. User Personas

### 4.1 The Hider
- **Motivasi:** Seru-seruan, romantis, konten, event, iseng
- **Sub-tipe:** Romantis, Sosial, Event, Creator, Dermawan, Iseng
- **Goal:** Bikin momen yang gak terlupakan

### 4.2 The Hunter
- **Motivasi:** Dapet duit sambil jalan-jalan, seru, kompetisi
- **Goal:** Nemuin harta karun, naikin leaderboard

### 4.3 The Brand
- **Motivasi:** Promosi engaging yang bikin orang fisik dateng
- **Pain:** Iklan mahal, gak engaging, susah ukur foot traffic
- **Revenue model:** Subscription + managed campaign

---

## 5. Hunt Types

| Type | Description |
|---|---|
| **📍 GPS Hunt** | Ke lokasi spesifik, upload foto, klaim |
| **🔗 Quest Chain** | Multi-step: clue 1 → clue 2 → hadiah final |
| **⏱️ Race Hunt** | First to find wins all |
| **🎯 Puzzle Hunt** | Harus pecahin kode/cipher dulu |
| **📸 Photo Challenge** | Foto pose spesifik di lokasi |

---

## 6. Verification System (MVP)

| Method | Sistem |
|---|---|
| **📍 GPS Geofence** | Hunter dalam radius X meter dari koordinat hunt |
| **🔑 QR Code** | Hider tempel QR, hunter scan |
| **👤 Manual Approve** | Hider lihat bukti hunter → approve/reject |

### Timer Auto-Release
- Hunter submit bukti → timer 24 jam mulai
- Hider approve → duit cair
- Hider gak respon 24 jam → duit auto cair ke hunter
- Hider reject + alasan → masuk dispute

---

## 7. Platform Rules

| Aturan | Detail |
|---|---|
| **Max reward per hunt (free)** | Rp 5.000.000 |
| **Deadline max** | 30 hari |
| **Max GPS radius** | Hider set 10-100 meter |
| **Timer claim** | 24 jam setelah hunter submit bukti |
| **Timer appeal** | 48 jam untuk submit appeal |
| **Fee brand subscription** | Mulai Rp 500rb/bulan |
| **Fee dispute** | 5% dari nilai hunt |
| **Stake verifikator** | Minimal 5.000 XLM |

---

## 8. Feature Priority Per Belt Level

| Level | Fitur yang di-unlock |
|---|---|
| **L1 — White** | Landing + Connect Wallet + Map (read) + Profile (public key + balance) + Wallet tx history |
| **L2 — Yellow** | Create Hunt (full tx) + Claim Hunt + GPS + QR + Manual Approve |
| **L3 — Orange** | Quest Chain + Multi-sig Verifier + Dispute + Commit-Reveal + CI/CD + Tests + Mobile responsive |
| **L4 — Green** | Brand Dashboard + Campaign Tools + Referral System + Leaderboard (basic) |
| **L5 — Blue** | Streak System + Badges + Community Feed + Hunt of The Week Voting |
| **L6 — Black** | Mainnet Migration + Security Audit + 10 Mainnet users + Bug Bounty |
| **L7 — Master** | API/SDK Developer Tools + SCF Grant Application + Enterprise Partnership |

---

## 9. Metrik per Level

| Metrik | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|---|---|---|---|---|---|---|---|
| Screens | 5 | 12 | 20 | 30 | 35 | 40 | 45+ |
| Smart Contracts | 1 | 2 | 4 | 4 | 5 | 5 | 6 |
| E2E Tests | 0 | 3 | 15 | 30 | 50 | 70 | 100+ |
| Users | 1 | 5 | 10 | 50 | 200 | 1K+ | 10K+ |

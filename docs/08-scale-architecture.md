# JELAJAH — Full Architecture: Dibangun Sekali untuk Semua Level

## Filosofi

JELAJAH TIDAK dibangun step-by-step per level. JELAJAH dibangun **sekali untuk full produk dari Level 1 sampai Level 7.**

Yang berubah antar level hanyalah:
- **Fitur mana yang di-unlock** (feature gate)
- **Network** (testnet → mainnet)
- **Skala** (10 users → 10K+ users)

Tidak ada refactor. Tidak ada code rewrite. Tidak ada "build ulang dari awal."

---

## Kenapa Pendekatan Ini?

### Masalah kalau build per level:
```
LEVEL 1: Build wallet + basic UI
LEVEL 2: "Anjir, architecture gue gak support multi-wallet & contract → refactor
LEVEL 3: "Anjir, gue perlu tambah quest chain → structure berubah → refactor lagi
LEVEL 4: "Anjir, brand dashboard perlu data yang gue gak simpen → DB redesign
LEVEL 5: "Anjir, gue harus scale — refactor total"

Total: 5× build, 4× refactor. Waktu habis buat ngulang.
```

### Solusi:
```
LEVEL 1: Architecture siap untuk L1-L7. Yang user liat: wallet + map read-only.
LEVEL 2: Unlock create + claim. Kode gak berubah.
LEVEL 3: Unlock quest + dispute + verifier. Contract udah dari awal.
LEVEL 4: Unlock brand dashboard. DB schema udah siap.
LEVEL 5: Unlock community + reputation. Contract udah ada.

Total: 1× build, 0× refactor. Setiap level tinggal unlock.
```

---

## Implementasi

### Database Schema (dari Level 1)

```sql
-- Dari awal udah include:
-- users         → untuk L1-L7
-- hunts         → untuk L2-L7
-- claims        → untuk L2-L7
-- disputes      → untuk L3-L7
-- verifiers     → untuk L3-L7
-- brands        → untuk L4-L7
-- notifications → untuk L5-L7
-- api_keys      → untuk L7
```

Tabel-tabel ini ada dari commit pertama. Gak ada migrasi besar antar level.

### Smart Contract (dari Level 1)

```
contracts/
├── hunt-factory/    → L1: created, L2: deployed testnet
├── hunt-instance/   → L1: created, L2: deployed testnet  
├── reputation/      → L1: created, L3: deployed
├── dispute/         → L1: created, L3: deployed
└── quest-chain/     → L1: created, L3: deployed
```

Semua contract ditulis dari awal. Code lengkap. Yang beda cuma:
- L1-L2: belum di-deploy (cuma di test lokal)
- L3: deploy ke testnet
- L6: deploy ke mainnet

### Frontend Routing (dari Level 1)

```
/app
├── /                 → L1: landing
├── /map              → L1: map + hunt markers (read-only)
├── /hunt/[id]        → L2: detail + gps + claim
├── /hunt/create      → L2: full create flow
├── /quest/[id]       → L3: quest chain
├── /dispute/[id]     → L3: dispute flow
├── /verify           → L3: verifier dashboard
├── /profile          → L1: profile
├── /wallet           → L1: wallet
├── /brand            → L4: brand dashboard (locked)
├── /leaderboard      → L5: leaderboard + community (locked)
└── /api              → L7: developer API (locked)
```

Routing udah lengkap dari awal. Halaman yang belum waktunya di-lock dengan:
```typescript
// Feature gate pattern
const FeatureGate = ({ level, children }) => {
  const currentLevel = useCurrentLevel(); // dari config/DB
  if (level > currentLevel) return <ComingSoon />;
  return children;
};

// Usage
<FeatureGate level={4}>
  <BrandDashboard />
</FeatureGate>
```

### Environment Variables (Level 6)

Pindah ke mainnet gampang:
```
# L1-L5: testnet
NEXT_PUBLIC_NETWORK=testnet

# L6: ganti 1 baris
NEXT_PUBLIC_NETWORK=mainnet
```

Gak perlu refactor. Gak perlu deploy ulang contract. Tinggal deploy yang udah ada ke mainnet.

---

## Benefit

| Aspek | Build-per-Level | Build-Sekali |
|---|---|---|
| Total development time | 6-8 bulan | 3-4 bulan |
| Refactor cycles | 3-4× | 0× |
| Code duplication | High | None |
| Technical debt | Accumulates | Minimal |
| Risk of breaking things | High per level | Low |
| Time to L7 | 8+ bulan | 4 bulan |
| Confidence in architecture | Low (always changing) | High (already planned) |

---

## Kesimpulan

> **JELAJAH dibangun sekali untuk semua level.**
> 
> Smart contract, database, frontend routing — semuanya siap dari commit pertama.
> Tiap level tinggal "unlock" fitur yang relevan.
> Level 6? Ganti env `testnet` → `mainnet`. Selesai.
> 
> **Gak ada refactor. Gak ada build ulang. Gak ada kerja 2 kali.**

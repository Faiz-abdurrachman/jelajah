# JELAJAH — Smart Contract Specification

## 1. hunt-factory

### Fungsi
Membuat instance hunt baru.

### Functions

```rust
// Buat hunt baru → deploy hunt-instance
fn create_hunt(
    env: Env,
    hider: Address,
    amount: i128,
    gps_lat: i64,      // lat * 10^7
    gps_lng: i64,      // lng * 10^7
    radius: u32,        // dalam meter
    deadline: u64,      // unix timestamp
    clue_hash: BytesN<32>, // hash dari clue + foto CID (IPFS)
    hunt_type: u32,      // 0=GPS, 1=Quest, 2=Race, 3=Puzzle, 4=Photo
) -> BytesN<32>;
```

### Events

```rust
#[event]
fn hunt_created(
    hunt_id: BytesN<32>,
    hider: Address,
    amount: i128,
    deadline: u64,
);
```

---

## 2. hunt-instance

### Fungsi
Handle lifecycle satu hunt: deposit, claim, verifikasi, release.

### Storage

```rust
#[contract]
pub struct HuntInstance;

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    Hider,
    Amount,
    Status,       // Active, Claimed, Expired, Disputed
    Claimer,
    Deadline,
    ClueHash,
    ClaimTimer,   // unix timestamp kapan hunter submit
    ClaimPhotoCid,
    GpsLat,
    GpsLng,
    Radius,
    HuntType,
}

// Status enum
pub enum HuntStatus {
    Active,
    Claimed,
    Expired,
    Disputed,
}
```

### Functions

```rust
// Init hunt (dipanggil hunt-factory)
fn __constructor(
    env: Env,
    hider: Address,
    amount: i128,
    gps_lat: i64,
    gps_lng: i64,
    radius: u32,
    deadline: u64,
    clue_hash: BytesN<32>,
    hunt_type: u32,
);

// Hunter submit claim (GPS + foto)
fn submit_claim(
    env: Env,
    hunter: Address,
    photo_cid: BytesN<32>,  // IPFS CID hash
    claim_gps_lat: i64,
    claim_gps_lng: i64,
);

// Hider approve claim
fn approve(env: Env, hider: Address);

// Auto-release setelah timer habis
// (bisa dipanggil siapapun setelah 24 jam)
fn auto_release(env: Env);

// Hider reject claim → trigger dispute
fn reject(env: Env, hider: Address, reason: BytesN<32>);

// Verifikator commit vote (hash)
fn commit_vote(env: Env, verifier: Address, vote_hash: BytesN<32>);

// Verifikator reveal vote
fn reveal_vote(env: Env, verifier: Address, vote: bool, salt: BytesN<32>);

// Execute dispute result (2-of-3)
fn resolve_dispute(env: Env);

// Klaim expired → duit balik ke hider
fn claim_expired(env: Env);

// Get hunt state
fn get_status(env: Env) -> HuntStatus;
fn get_hunter(env: Env) -> Address;
fn get_timer_remaining(env: Env) -> u64;
```

### Events

```rust
#[event]
fn hunt_claimed(hunt_id: BytesN<32>, hunter: Address, timestamp: u64);

#[event]
fn hunt_approved(hunt_id: BytesN<32>, hunter: Address, amount: i128);

#[event]
fn hunt_rejected(hunt_id: BytesN<32>, reason: BytesN<32>);

#[event]
fn hunt_expired(hunt_id: BytesN<32>, hider: Address, amount: i128);

#[event]
fn dispute_created(hunt_id: BytesN<32>, verifiers: Vec<Address>);

#[event]
fn dispute_resolved(hunt_id: BytesN<32>, verdict: bool); // true = hunter wins
```

---

## 3. reputation

### Functions

```rust
// Tambah XP (dipanggil hunt-instance pas claim sukses)
fn add_xp(env: Env, user: Address, amount: u32);

// Dapetin level user
fn get_level(env: Env, user: Address) -> u32;

// Dapetin XP user
fn get_xp(env: Env, user: Address) -> u32;

// Issue badge (cuma bisa dipanggil sistem)
fn issue_badge(env: Env, user: Address, badge_id: u32);

// Cek apakah user punya badge
fn has_badge(env: Env, user: Address, badge_id: u32) -> bool;
```

---

## 4. dispute (Higher Court)

### Functions

```rust
// Appeal dispute ke higher court
fn appeal(env: Env, dispute_id: BytesN<32>, appellant: Address);

// Pilih 5 senior verifikator
fn select_appeal_verifiers(env: Env, dispute_id: BytesN<32>);

// 3-of-5 vote
fn resolve_appeal(env: Env, dispute_id: BytesN<32>);

// Slash verifikator original kalau appeal berhasil
fn slash_original_verifiers(env: Env, dispute_id: BytesN<32>);
```

---

## 5. Quest Chain (Multi-Step)

### Storage

```rust
pub struct QuestStep {
    pub step_number: u32,
    pub clue_hash: BytesN<32>,
    pub gps_lat: i64,
    pub gps_lng: i64,
    pub radius: u32,
    pub is_final: bool,
}
```

### Functions

```rust
// Setup quest chain (dipanggil hider pas create quest hunt)
fn set_quest_steps(env: Env, steps: Vec<QuestStep>);

// Hunter complete satu step → unlock step berikutnya
fn complete_step(env: Env, hunter: Address, step: u32, photo_cid: BytesN<32>);

// Cek step hunter saat ini
fn get_current_step(env: Env, hunter: Address) -> u32;

// Setelah final step → trigger claim
fn claim_quest(env: Env, hunter: Address);
```

---

## 6. Error Codes

```rust
pub enum Error {
    NotAuthorized = 1,        // Bukan hider/hunter/verifier
    NotInRadius = 2,          // GPS di luar radius
    HuntExpired = 3,          // Sudah lewat deadline
    AlreadyClaimed = 4,       // Sudah di-claim
    TimerNotExpired = 5,      // 24 jam belum lewat
    InvalidVote = 6,          // Vote tidak valid
    AlreadyVoted = 7,         // Udah pernah vote
    InsufficientStake = 8,    // Stake gak cukup
    DuplicateClaim = 9,       // Claim duplikat
    InvalidStep = 10,         // Step quest salah
}
```

---

## 7. Deploy Strategy

| Level | Contracts Deployed |
|---|---|
| L1 | hunt-factory (dummy) |
| L2 | hunt-factory + hunt-instance |
| L3 | + reputation + dispute + quest-chain |
| L4 | (sama) |
| L5 | (sama) |
| L6 | Mainnet deploy + migrate data |
| L7 | + API/SDK contract |

Semua contract udah di-develop dari awal. Per level tinggal deploy + unlock.

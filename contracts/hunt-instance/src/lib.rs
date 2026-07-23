#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, xdr::ToXdr, Address, BytesN, Env, Vec,
};

mod event;

// ─── Constants ────────────────────────────────────────

/// Timer auto-release setelah hunter submit claim (24 jam dalam detik)
const CLAIM_TIMER_SECONDS: u64 = 24 * 60 * 60;

// ─── Error Codes ──────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracterror]
pub enum ContractError {
    NotAuthorized = 1,
    NotInRadius = 2,
    HuntExpired = 3,
    AlreadyClaimed = 4,
    TimerNotExpired = 5,
    InvalidVote = 6,
    AlreadyVoted = 7,
    InsufficientStake = 8,
    DuplicateClaim = 9,
    InvalidStep = 10,
    NotActive = 11,
    NoDeadline = 12,
    NoRadius = 13,
    NoGpsCoord = 14,
    NoClaimer = 15,
    NoAmount = 16,
    NoHider = 17,
    NoClaimTimer = 18,
    NoVotes = 19,
    NotEnoughVotes = 20,
}

// ─── Status ───────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum HuntStatus {
    Active,
    Claimed,
    Expired,
    Disputed,
}

// ─── Storage ──────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum DataKey {
    Hider,
    Amount,
    Status,
    Claimer,
    Deadline,
    ClueHash,
    ClaimTimer,
    ClaimPhotoCid,
    GpsLat,
    GpsLng,
    Radius,
    HuntType,
    Verifiers,
    Votes,
    VoteHashes,
    DisputeReason,
    DisputeResolution,
}

// ─── Contract ─────────────────────────────────────────

#[contract]
pub struct HuntInstance;

#[contractimpl]
impl HuntInstance {
    // ── Init ──────────────────────────────────────────

    pub fn __constructor(
        env: Env,
        hider: Address,
        amount: i128,
        gps_lat: i64,
        gps_lng: i64,
        radius: u32,
        deadline: u64,
        clue_hash: BytesN<32>,
        hunt_type: u32,
    ) {
        env.storage().instance().set(&DataKey::Hider, &hider);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::GpsLat, &gps_lat);
        env.storage().instance().set(&DataKey::GpsLng, &gps_lng);
        env.storage().instance().set(&DataKey::Radius, &radius);
        env.storage().instance().set(&DataKey::Deadline, &deadline);
        env.storage().instance().set(&DataKey::ClueHash, &clue_hash);
        env.storage().instance().set(&DataKey::HuntType, &hunt_type);
        env.storage().instance().set(&DataKey::Status, &HuntStatus::Active);
    }

    // ── Claim ─────────────────────────────────────────

    pub fn submit_claim(
        env: Env,
        hunter: Address,
        photo_cid: BytesN<32>,
        claim_gps_lat: i64,
        claim_gps_lng: i64,
    ) {
        hunter.require_auth();

        let status: HuntStatus = env.storage().instance()
            .get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired);
        if status != HuntStatus::Active {
            panic_with_error!(&env, ContractError::NotActive);
        }

        let deadline: u64 = env.storage().instance()
            .get(&DataKey::Deadline)
            .unwrap_or(0);
        if deadline == 0 {
            panic_with_error!(&env, ContractError::NoDeadline);
        }
        if env.ledger().timestamp() > deadline {
            env.storage().instance().set(&DataKey::Status, &HuntStatus::Expired);
            panic_with_error!(&env, ContractError::HuntExpired);
        }

        let radius: u32 = env.storage().instance()
            .get(&DataKey::Radius)
            .unwrap_or(0);
        let hunt_lat: i64 = env.storage().instance()
            .get(&DataKey::GpsLat)
            .unwrap_or(0);
        let hunt_lng: i64 = env.storage().instance()
            .get(&DataKey::GpsLng)
            .unwrap_or(0);

        if radius == 0 {
            panic_with_error!(&env, ContractError::NoRadius);
        }

        let distance = Self::calculate_distance(claim_gps_lat, claim_gps_lng, hunt_lat, hunt_lng);
        if distance > radius as i64 {
            panic_with_error!(&env, ContractError::NotInRadius);
        }

        env.storage().instance().set(&DataKey::Claimer, &hunter);
        env.storage().instance().set(&DataKey::ClaimPhotoCid, &photo_cid);
        env.storage().instance().set(&DataKey::ClaimTimer, &env.ledger().timestamp());

        event::hunt_claimed(&env, hunter, env.ledger().timestamp());
    }

    // ── Verification ──────────────────────────────────

    pub fn approve(env: Env, hider: Address) {
        hider.require_auth();
        Self::require_hider(&env, &hider);

        let claimer: Address = env.storage().instance()
            .get(&DataKey::Claimer)
            .expect("no claimer");
        let amount: i128 = env.storage().instance()
            .get(&DataKey::Amount)
            .expect("no amount");

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Claimed);
        event::hunt_approved(&env, claimer, amount);
    }

    pub fn reject(env: Env, hider: Address, reason: BytesN<32>) {
        hider.require_auth();
        Self::require_hider(&env, &hider);

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Disputed);
        env.storage().instance().set(&DataKey::DisputeReason, &reason);

        event::hunt_rejected(&env, reason);
    }

    pub fn auto_release(env: Env) {
        let claim_timer: u64 = env.storage().instance()
            .get(&DataKey::ClaimTimer)
            .unwrap_or(0);
        if claim_timer == 0 {
            panic_with_error!(&env, ContractError::NoClaimTimer);
        }

        let deadline = claim_timer + CLAIM_TIMER_SECONDS;
        if env.ledger().timestamp() < deadline {
            panic_with_error!(&env, ContractError::TimerNotExpired);
        }

        let claimer: Address = env.storage().instance()
            .get(&DataKey::Claimer)
            .expect("no claimer");
        let amount: i128 = env.storage().instance()
            .get(&DataKey::Amount)
            .expect("no amount");

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Claimed);
        event::hunt_approved(&env, claimer, amount);
    }

    // ── Dispute Voting ────────────────────────────────

    pub fn commit_vote(env: Env, verifier: Address, vote_hash: BytesN<32>) {
        verifier.require_auth();

        let status: HuntStatus = env.storage().instance()
            .get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired);
        if status != HuntStatus::Disputed {
            panic_with_error!(&env, ContractError::NotActive);
        }

        let mut vote_hashes: Vec<(Address, BytesN<32>)> = env.storage().instance()
            .get(&DataKey::VoteHashes)
            .unwrap_or(Vec::new(&env));
        vote_hashes.push_back((verifier.clone(), vote_hash));
        env.storage().instance().set(&DataKey::VoteHashes, &vote_hashes);
    }

    pub fn reveal_vote(env: Env, verifier: Address, vote: bool, salt: BytesN<32>) {
        verifier.require_auth();

        let vote_hashes: Vec<(Address, BytesN<32>)> = env.storage().instance()
            .get(&DataKey::VoteHashes)
            .unwrap_or(Vec::new(&env));

        let computed_hash: BytesN<32> = env.crypto().sha256(&(verifier.clone(), vote, salt).to_xdr(&env)).into();
        let found = vote_hashes.iter().any(|(addr, hash)| {
            addr == verifier && hash == computed_hash
        });
        if !found {
            panic_with_error!(&env, ContractError::InvalidVote);
        }

        let mut votes: Vec<(Address, bool)> = env.storage().instance()
            .get(&DataKey::Votes)
            .unwrap_or(Vec::new(&env));
        votes.push_back((verifier.clone(), vote));
        env.storage().instance().set(&DataKey::Votes, &votes);
    }

    pub fn resolve_dispute(env: Env) {
        let votes: Vec<(Address, bool)> = env.storage().instance()
            .get(&DataKey::Votes)
            .unwrap_or(Vec::new(&env));

        if votes.is_empty() {
            panic_with_error!(&env, ContractError::NoVotes);
        }

        let approve_count = votes.iter().filter(|(_, v)| *v).count() as u32;
        let reject_count = votes.len() - approve_count;

        if approve_count >= 2 {
            env.storage().instance().set(&DataKey::Status, &HuntStatus::Claimed);
            env.storage().instance().set(&DataKey::DisputeResolution, &BytesN::from_array(&env, &[1u8; 32]));
        } else if reject_count >= 2 {
            env.storage().instance().set(&DataKey::Status, &HuntStatus::Active);
            env.storage().instance().set(&DataKey::DisputeResolution, &BytesN::from_array(&env, &[0u8; 32]));
        } else {
            panic_with_error!(&env, ContractError::NotEnoughVotes);
        }

        let hunter_wins = approve_count >= 2;
        event::dispute_resolved(&env, hunter_wins);
    }

    // ── Expiry ────────────────────────────────────────

    pub fn claim_expired(env: Env) {
        let status: HuntStatus = env.storage().instance()
            .get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired);
        if status != HuntStatus::Active {
            panic_with_error!(&env, ContractError::NotActive);
        }

        let deadline: u64 = env.storage().instance()
            .get(&DataKey::Deadline)
            .unwrap_or(0);
        if deadline == 0 {
            panic_with_error!(&env, ContractError::NoDeadline);
        }
        if env.ledger().timestamp() < deadline {
            panic_with_error!(&env, ContractError::HuntExpired);
        }

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Expired);

        let hider: Address = env.storage().instance()
            .get(&DataKey::Hider)
            .expect("no hider");
        let amount: i128 = env.storage().instance()
            .get(&DataKey::Amount)
            .expect("no amount");

        event::hunt_expired(&env, hider, amount);
    }

    // ── Getters ───────────────────────────────────────

    pub fn get_status(env: Env) -> HuntStatus {
        env.storage().instance()
            .get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired)
    }

    pub fn get_hunter(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Claimer)
    }

    pub fn get_hider(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Hider)
    }

    pub fn get_timer_remaining(env: Env) -> u64 {
        let claim_timer: u64 = env.storage().instance()
            .get(&DataKey::ClaimTimer)
            .unwrap_or(0);
        let deadline = claim_timer + CLAIM_TIMER_SECONDS;
        if env.ledger().timestamp() >= deadline {
            0
        } else {
            deadline - env.ledger().timestamp()
        }
    }

    // ── Helpers ───────────────────────────────────────

    fn require_hider(env: &Env, hider: &Address) {
        let stored_hider: Address = env.storage().instance()
            .get(&DataKey::Hider)
            .expect("no hider");
        if hider != &stored_hider {
            panic_with_error!(env, ContractError::NotAuthorized);
        }
    }

    fn calculate_distance(lat1: i64, lng1: i64, lat2: i64, lng2: i64) -> i64 {
        let lat_diff = (lat1 - lat2).abs();
        let lng_diff = (lng1 - lng2).abs();
        let lat_m = lat_diff * 111_320 / 10_000_000;
        let lng_m = lng_diff * 111_320 / 10_000_000;
        integer_sqrt(lat_m * lat_m + lng_m * lng_m)
    }
}

/// Integer square root (Babylonian method) — works in no_std without libm
fn integer_sqrt(n: i64) -> i64 {
    if n <= 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

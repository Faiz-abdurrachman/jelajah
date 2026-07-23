#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, Vec,
};

mod event;

// ─── Error Codes ──────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum Error {
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

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum Vote {
    Approve,
    Reject,
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

    /// Hunter submit claim (GPS + foto)
    pub fn submit_claim(
        env: Env,
        hunter: Address,
        photo_cid: BytesN<32>,
        claim_gps_lat: i64,
        claim_gps_lng: i64,
    ) {
        hunter.require_auth();

        // Validate status
        let status: HuntStatus = env.storage().instance().get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired);
        if status != HuntStatus::Active {
            panic!("hunt not active");
        }

        // Validate deadline
        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline)
            .expect("no deadline");
        if env.ledger().timestamp() > deadline {
            env.storage().instance().set(&DataKey::Status, &HuntStatus::Expired);
            panic!("hunt expired");
        }

        // Validate GPS radius
        let radius: u32 = env.storage().instance().get(&DataKey::Radius)
            .expect("no radius");
        let hunt_lat: i64 = env.storage().instance().get(&DataKey::GpsLat)
            .expect("no gps_lat");
        let hunt_lng: i64 = env.storage().instance().get(&DataKey::GpsLng)
            .expect("no gps_lng");

        let distance = Self::calculate_distance(claim_gps_lat, claim_gps_lng, hunt_lat, hunt_lng);
        if distance > radius as i64 {
            panic!("not in radius");
        }

        // Store claim
        env.storage().instance().set(&DataKey::Claimer, &hunter);
        env.storage().instance().set(&DataKey::ClaimPhotoCid, &photo_cid);
        env.storage().instance().set(&DataKey::ClaimTimer, &env.ledger().timestamp());

        event::hunt_claimed(&env, hunter, env.ledger().timestamp());
    }

    // ── Verification ──────────────────────────────────

    /// Hider approve claim
    pub fn approve(env: Env, hider: Address) {
        hider.require_auth();
        Self::verify_hider(&env, &hider);

        let claimer: Address = env.storage().instance().get(&DataKey::Claimer)
            .expect("no claimer");
        let amount: i128 = env.storage().instance().get(&DataKey::Amount)
            .expect("no amount");

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Claimed);

        event::hunt_approved(&env, claimer, amount);
    }

    /// Hider reject claim → trigger dispute
    pub fn reject(env: Env, hider: Address, reason: BytesN<32>) {
        hider.require_auth();
        Self::verify_hider(&env, &hider);

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Disputed);
        env.storage().instance().set(&DataKey::DisputeReason, &reason);

        event::hunt_rejected(&env, reason);
    }

    /// Auto-release setelah timer habis (24 jam)
    pub fn auto_release(env: Env) {
        let claim_timer: u64 = env.storage().instance().get(&DataKey::ClaimTimer)
            .expect("no claim timer");
        let deadline = claim_timer + 24 * 60 * 60; // 24 jam

        if env.ledger().timestamp() < deadline {
            panic!("timer not expired");
        }

        let claimer: Address = env.storage().instance().get(&DataKey::Claimer)
            .expect("no claimer");
        let amount: i128 = env.storage().instance().get(&DataKey::Amount)
            .expect("no amount");

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Claimed);

        event::hunt_approved(&env, claimer, amount);
    }

    // ── Dispute Voting ────────────────────────────────

    /// Verifikator commit vote (hash)
    pub fn commit_vote(env: Env, verifier: Address, vote_hash: BytesN<32>) {
        verifier.require_auth();

        let status: HuntStatus = env.storage().instance().get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired);
        if status != HuntStatus::Disputed {
            panic!("not in dispute");
        }

        // Store vote hash
        let mut vote_hashes: Vec<(Address, BytesN<32>)> = env.storage().instance()
            .get(&DataKey::VoteHashes).unwrap_or(Vec::new(&env));
        vote_hashes.push_back((verifier.clone(), vote_hash));
        env.storage().instance().set(&DataKey::VoteHashes, &vote_hashes);
    }

    /// Verifikator reveal vote
    pub fn reveal_vote(env: Env, verifier: Address, vote: bool, salt: BytesN<32>) {
        verifier.require_auth();

        // Verify hash matches
        let vote_hashes: Vec<(Address, BytesN<32>)> = env.storage().instance()
            .get(&DataKey::VoteHashes).unwrap_or(Vec::new(&env));

        let computed_hash = env.crypto().sha256(&(verifier.clone(), vote, salt).into_val(&env));
        let found = vote_hashes.iter().any(|(addr, hash)| {
            addr == verifier && hash == computed_hash
        });
        if !found {
            panic!("invalid vote reveal");
        }

        // Store actual vote
        let mut votes: Vec<(Address, bool)> = env.storage().instance()
            .get(&DataKey::Votes).unwrap_or(Vec::new(&env));
        votes.push_back((verifier.clone(), vote));
        env.storage().instance().set(&DataKey::Votes, &votes);
    }

    /// Execute dispute result (2-of-3)
    pub fn resolve_dispute(env: Env) {
        let votes: Vec<(Address, bool)> = env.storage().instance()
            .get(&DataKey::Votes).expect("no votes");

        let approve_count = votes.iter().filter(|(_, v)| *v).count();
        let reject_count = votes.len() - approve_count;

        if approve_count >= 2 {
            // Hunter wins
            env.storage().instance().set(&DataKey::Status, &HuntStatus::Claimed);
            env.storage().instance().set(&DataKey::DisputeResolution, &BytesN::from_array(&env, &[1u8; 32]));
        } else if reject_count >= 2 {
            // Hider wins
            env.storage().instance().set(&DataKey::Status, &HuntStatus::Active);
            env.storage().instance().set(&DataKey::DisputeResolution, &BytesN::from_array(&env, &[0u8; 32]));
        } else {
            panic!("not enough votes");
        }

        let hunter_wins = approve_count >= 2;
        event::dispute_resolved(&env, hunter_wins);
    }

    // ── Expiry ────────────────────────────────────────

    /// Claim expired → duit balik ke hider
    pub fn claim_expired(env: Env) {
        let status: HuntStatus = env.storage().instance().get(&DataKey::Status)
            .unwrap_or(HuntStatus::Expired);
        if status != HuntStatus::Active {
            panic!("not active");
        }

        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline)
            .expect("no deadline");
        if env.ledger().timestamp() < deadline {
            panic!("deadline not passed");
        }

        env.storage().instance().set(&DataKey::Status, &HuntStatus::Expired);

        let hider: Address = env.storage().instance().get(&DataKey::Hider)
            .expect("no hider");
        let amount: i128 = env.storage().instance().get(&DataKey::Amount)
            .expect("no amount");

        event::hunt_expired(&env, hider, amount);
    }

    // ── Getters ───────────────────────────────────────

    pub fn get_status(env: Env) -> HuntStatus {
        env.storage().instance().get(&DataKey::Status).unwrap_or(HuntStatus::Expired)
    }

    pub fn get_hunter(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Claimer)
    }

    pub fn get_hider(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Hider)
    }

    pub fn get_timer_remaining(env: Env) -> u64 {
        let claim_timer: u64 = env.storage().instance().get(&DataKey::ClaimTimer)
            .unwrap_or(0);
        let deadline = claim_timer + 24 * 60 * 60;
        if env.ledger().timestamp() >= deadline {
            0
        } else {
            deadline - env.ledger().timestamp()
        }
    }

    // ── Helpers ───────────────────────────────────────

    fn verify_hider(env: &Env, hider: &Address) {
        let stored_hider: Address = env.storage().instance().get(&DataKey::Hider)
            .expect("no hider");
        if hider != &stored_hider {
            panic!("not authorized");
        }
    }

    /// Calculate approximate distance between two GPS coordinates (Haversine).
    /// Returns distance in meters.
    fn calculate_distance(lat1: i64, lng1: i64, lat2: i64, lng2: i64) -> i64 {
        // Simplified: difference in degrees * 111_320 meters/degree
        let lat_diff = (lat1 - lat2).abs();
        let lng_diff = (lng1 - lng2).abs();
        // Rough calculation: sqrt(lat_diff^2 + lng_diff^2) * 111_320
        let lat_m = lat_diff * 111_320 / 10_000_000;
        let lng_m = lng_diff * 111_320 / 10_000_000;
        ((lat_m * lat_m + lng_m * lng_m) as f64).sqrt() as i64
    }
}

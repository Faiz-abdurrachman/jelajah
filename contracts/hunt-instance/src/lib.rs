#![no_std]

use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractclient, contracterror, contractimpl, contracttype, panic_with_error,
    token::TokenClient,
    vec, Address, BytesN, Env, IntoVal, MuxedAddress, Symbol,
};

mod event;

const CLAIM_TIMER_SECONDS: u64 = 24 * 60 * 60;
const TTL_THRESHOLD_LEDGERS: u32 = 100_000;
const TTL_EXTEND_TO_LEDGERS: u32 = 2_000_000;
const GPS_SCALE: i64 = 10_000_000;
const METERS_PER_DEGREE: i64 = 111_320;
const HUNT_COMPLETION_XP: u32 = 100;

#[contractclient(name = "ReputationClient")]
#[allow(dead_code)]
trait ReputationInterface {
    fn award_hunt_xp(env: Env, caller: Address, hunt_id: BytesN<32>, user: Address, amount: u32);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[contracterror]
pub enum ContractError {
    NotAuthorized = 1,
    NotInRadius = 2,
    HuntExpired = 3,
    AlreadyClaimed = 4,
    TimerNotExpired = 5,
    NotActive = 6,
    NoClaimPending = 7,
    InvalidAmount = 8,
    InvalidDeadline = 9,
    InvalidRadius = 10,
    InvalidCoordinates = 11,
    EscrowBalanceMismatch = 12,
    SelfClaim = 13,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[contracttype]
pub enum HuntStatus {
    Active,
    ClaimPending,
    Claimed,
    Expired,
    Disputed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[contracttype]
pub struct HuntDetails {
    pub hunt_id: BytesN<32>,
    pub hider: Address,
    pub asset: Address,
    pub amount: i128,
    pub gps_lat: i64,
    pub gps_lng: i64,
    pub radius: u32,
    pub deadline: u64,
    pub clue_hash: BytesN<32>,
    pub hunt_type: u32,
    pub status: HuntStatus,
    pub claimer: Option<Address>,
    pub claim_timer: Option<u64>,
    pub claim_photo_hash: Option<BytesN<32>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[contracttype]
enum DataKey {
    HuntId,
    Hider,
    Asset,
    Amount,
    Status,
    Claimer,
    Deadline,
    ClueHash,
    ClaimTimer,
    ClaimPhotoHash,
    GpsLat,
    GpsLng,
    Radius,
    HuntType,
    Reputation,
    RejectedHunter(Address),
}

#[contract]
pub struct HuntInstance;

#[contractimpl]
impl HuntInstance {
    #[allow(clippy::too_many_arguments)]
    pub fn __constructor(
        env: Env,
        hunt_id: BytesN<32>,
        hider: Address,
        asset: Address,
        amount: i128,
        gps_lat: i64,
        gps_lng: i64,
        radius: u32,
        deadline: u64,
        clue_hash: BytesN<32>,
        hunt_type: u32,
        reputation: Address,
    ) {
        Self::validate_hunt(&env, amount, gps_lat, gps_lng, radius, deadline);

        env.storage().instance().set(&DataKey::HuntId, &hunt_id);
        env.storage().instance().set(&DataKey::Hider, &hider);
        env.storage().instance().set(&DataKey::Asset, &asset);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::GpsLat, &gps_lat);
        env.storage().instance().set(&DataKey::GpsLng, &gps_lng);
        env.storage().instance().set(&DataKey::Radius, &radius);
        env.storage().instance().set(&DataKey::Deadline, &deadline);
        env.storage().instance().set(&DataKey::ClueHash, &clue_hash);
        env.storage().instance().set(&DataKey::HuntType, &hunt_type);
        env.storage()
            .instance()
            .set(&DataKey::Reputation, &reputation);
        env.storage()
            .instance()
            .set(&DataKey::Status, &HuntStatus::Active);
        Self::bump_ttl(&env);
    }

    pub fn submit_claim(
        env: Env,
        hunter: Address,
        photo_hash: BytesN<32>,
        claim_gps_lat: i64,
        claim_gps_lng: i64,
    ) {
        hunter.require_auth();
        Self::bump_ttl(&env);
        Self::require_status(&env, HuntStatus::Active, ContractError::NotActive);

        let hider: Address = Self::get_required(&env, &DataKey::Hider);
        if hunter == hider {
            panic_with_error!(&env, ContractError::SelfClaim);
        }
        if env
            .storage()
            .instance()
            .has(&DataKey::RejectedHunter(hunter.clone()))
        {
            panic_with_error!(&env, ContractError::AlreadyClaimed);
        }

        let deadline: u64 = Self::get_required(&env, &DataKey::Deadline);
        if env.ledger().timestamp() > deadline {
            panic_with_error!(&env, ContractError::HuntExpired);
        }

        Self::validate_coordinates(&env, claim_gps_lat, claim_gps_lng);
        let hunt_lat: i64 = Self::get_required(&env, &DataKey::GpsLat);
        let hunt_lng: i64 = Self::get_required(&env, &DataKey::GpsLng);
        let radius: u32 = Self::get_required(&env, &DataKey::Radius);
        let distance = Self::calculate_distance(claim_gps_lat, claim_gps_lng, hunt_lat, hunt_lng);
        if distance > i64::from(radius) {
            panic_with_error!(&env, ContractError::NotInRadius);
        }

        let timestamp = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Claimer, &hunter);
        env.storage()
            .instance()
            .set(&DataKey::ClaimPhotoHash, &photo_hash);
        env.storage()
            .instance()
            .set(&DataKey::ClaimTimer, &timestamp);
        env.storage()
            .instance()
            .set(&DataKey::Status, &HuntStatus::ClaimPending);

        let hunt_id: BytesN<32> = Self::get_required(&env, &DataKey::HuntId);
        event::claim_submitted(&env, hunt_id, hunter, photo_hash, timestamp);
    }

    pub fn approve(env: Env, hider: Address) {
        hider.require_auth();
        Self::bump_ttl(&env);
        Self::require_hider(&env, &hider);
        Self::require_status(
            &env,
            HuntStatus::ClaimPending,
            ContractError::NoClaimPending,
        );

        let hunter: Address = Self::get_required(&env, &DataKey::Claimer);
        Self::pay_reward(&env, hunter, false);
    }

    pub fn reject(env: Env, hider: Address, reason_hash: BytesN<32>) {
        hider.require_auth();
        Self::bump_ttl(&env);
        Self::require_hider(&env, &hider);
        Self::require_status(
            &env,
            HuntStatus::ClaimPending,
            ContractError::NoClaimPending,
        );

        let hunter: Address = Self::get_required(&env, &DataKey::Claimer);
        env.storage()
            .instance()
            .set(&DataKey::RejectedHunter(hunter.clone()), &true);
        env.storage().instance().remove(&DataKey::Claimer);
        env.storage().instance().remove(&DataKey::ClaimPhotoHash);
        env.storage().instance().remove(&DataKey::ClaimTimer);
        env.storage()
            .instance()
            .set(&DataKey::Status, &HuntStatus::Active);

        let hunt_id: BytesN<32> = Self::get_required(&env, &DataKey::HuntId);
        event::claim_rejected(&env, hunt_id, hunter, reason_hash);
    }

    pub fn auto_release(env: Env) {
        Self::bump_ttl(&env);
        Self::require_status(
            &env,
            HuntStatus::ClaimPending,
            ContractError::NoClaimPending,
        );

        let claim_timer: u64 = Self::get_required(&env, &DataKey::ClaimTimer);
        if env.ledger().timestamp() < claim_timer.saturating_add(CLAIM_TIMER_SECONDS) {
            panic_with_error!(&env, ContractError::TimerNotExpired);
        }

        let hunter: Address = Self::get_required(&env, &DataKey::Claimer);
        Self::pay_reward(&env, hunter, true);
    }

    pub fn claim_expired(env: Env) {
        Self::bump_ttl(&env);
        Self::require_status(&env, HuntStatus::Active, ContractError::NotActive);

        let deadline: u64 = Self::get_required(&env, &DataKey::Deadline);
        if env.ledger().timestamp() < deadline {
            panic_with_error!(&env, ContractError::InvalidDeadline);
        }

        let hider: Address = Self::get_required(&env, &DataKey::Hider);
        let amount: i128 = Self::get_required(&env, &DataKey::Amount);
        Self::require_escrow_balance(&env, amount);

        env.storage()
            .instance()
            .set(&DataKey::Status, &HuntStatus::Expired);
        Self::transfer_from_escrow(&env, &hider, amount);

        let hunt_id: BytesN<32> = Self::get_required(&env, &DataKey::HuntId);
        event::reward_refunded(&env, hunt_id, hider, amount);
    }

    pub fn get_hunt(env: Env) -> HuntDetails {
        Self::bump_ttl(&env);
        HuntDetails {
            hunt_id: Self::get_required(&env, &DataKey::HuntId),
            hider: Self::get_required(&env, &DataKey::Hider),
            asset: Self::get_required(&env, &DataKey::Asset),
            amount: Self::get_required(&env, &DataKey::Amount),
            gps_lat: Self::get_required(&env, &DataKey::GpsLat),
            gps_lng: Self::get_required(&env, &DataKey::GpsLng),
            radius: Self::get_required(&env, &DataKey::Radius),
            deadline: Self::get_required(&env, &DataKey::Deadline),
            clue_hash: Self::get_required(&env, &DataKey::ClueHash),
            hunt_type: Self::get_required(&env, &DataKey::HuntType),
            status: Self::get_required(&env, &DataKey::Status),
            claimer: env.storage().instance().get(&DataKey::Claimer),
            claim_timer: env.storage().instance().get(&DataKey::ClaimTimer),
            claim_photo_hash: env.storage().instance().get(&DataKey::ClaimPhotoHash),
        }
    }

    pub fn get_status(env: Env) -> HuntStatus {
        Self::bump_ttl(&env);
        Self::get_required(&env, &DataKey::Status)
    }

    pub fn get_hunter(env: Env) -> Option<Address> {
        Self::bump_ttl(&env);
        env.storage().instance().get(&DataKey::Claimer)
    }

    pub fn get_hider(env: Env) -> Address {
        Self::bump_ttl(&env);
        Self::get_required(&env, &DataKey::Hider)
    }

    pub fn get_escrow_balance(env: Env) -> i128 {
        Self::bump_ttl(&env);
        let asset: Address = Self::get_required(&env, &DataKey::Asset);
        TokenClient::new(&env, &asset).balance(&env.current_contract_address())
    }

    pub fn get_timer_remaining(env: Env) -> u64 {
        Self::bump_ttl(&env);
        let claim_timer: Option<u64> = env.storage().instance().get(&DataKey::ClaimTimer);
        match claim_timer {
            Some(started_at) => started_at
                .saturating_add(CLAIM_TIMER_SECONDS)
                .saturating_sub(env.ledger().timestamp()),
            None => 0,
        }
    }

    pub fn get_reputation(env: Env) -> Address {
        Self::bump_ttl(&env);
        Self::get_required(&env, &DataKey::Reputation)
    }

    fn pay_reward(env: &Env, hunter: Address, automatic: bool) {
        let amount: i128 = Self::get_required(env, &DataKey::Amount);
        Self::require_escrow_balance(env, amount);

        env.storage()
            .instance()
            .set(&DataKey::Status, &HuntStatus::Claimed);
        Self::transfer_from_escrow(env, &hunter, amount);

        let hunt_id: BytesN<32> = Self::get_required(env, &DataKey::HuntId);
        Self::award_reputation(env, &hunt_id, &hunter);
        event::reward_paid(env, hunt_id, hunter, amount, automatic);
    }

    fn award_reputation(env: &Env, hunt_id: &BytesN<32>, hunter: &Address) {
        let reputation: Address = Self::get_required(env, &DataKey::Reputation);
        let caller = env.current_contract_address();

        env.authorize_as_current_contract(vec![
            env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: reputation.clone(),
                    fn_name: Symbol::new(env, "award_hunt_xp"),
                    args: vec![
                        env,
                        caller.clone().into_val(env),
                        hunt_id.clone().into_val(env),
                        hunter.clone().into_val(env),
                        HUNT_COMPLETION_XP.into_val(env),
                    ],
                },
                sub_invocations: vec![env],
            }),
        ]);

        ReputationClient::new(env, &reputation).award_hunt_xp(
            &caller,
            hunt_id,
            hunter,
            &HUNT_COMPLETION_XP,
        );
    }

    fn transfer_from_escrow(env: &Env, recipient: &Address, amount: i128) {
        let asset: Address = Self::get_required(env, &DataKey::Asset);
        let destination = MuxedAddress::from(recipient);
        TokenClient::new(env, &asset).transfer(
            &env.current_contract_address(),
            &destination,
            &amount,
        );
    }

    fn require_escrow_balance(env: &Env, amount: i128) {
        let asset: Address = Self::get_required(env, &DataKey::Asset);
        let balance = TokenClient::new(env, &asset).balance(&env.current_contract_address());
        if balance < amount {
            panic_with_error!(env, ContractError::EscrowBalanceMismatch);
        }
    }

    fn require_hider(env: &Env, hider: &Address) {
        let stored_hider: Address = Self::get_required(env, &DataKey::Hider);
        if hider != &stored_hider {
            panic_with_error!(env, ContractError::NotAuthorized);
        }
    }

    fn require_status(env: &Env, expected: HuntStatus, error: ContractError) {
        let status: HuntStatus = Self::get_required(env, &DataKey::Status);
        if status != expected {
            panic_with_error!(env, error);
        }
    }

    fn validate_hunt(
        env: &Env,
        amount: i128,
        gps_lat: i64,
        gps_lng: i64,
        radius: u32,
        deadline: u64,
    ) {
        if amount <= 0 {
            panic_with_error!(env, ContractError::InvalidAmount);
        }
        if deadline <= env.ledger().timestamp() {
            panic_with_error!(env, ContractError::InvalidDeadline);
        }
        if radius == 0 {
            panic_with_error!(env, ContractError::InvalidRadius);
        }
        Self::validate_coordinates(env, gps_lat, gps_lng);
    }

    fn validate_coordinates(env: &Env, gps_lat: i64, gps_lng: i64) {
        let max_lat = 90 * GPS_SCALE;
        let max_lng = 180 * GPS_SCALE;
        if !(-max_lat..=max_lat).contains(&gps_lat) || !(-max_lng..=max_lng).contains(&gps_lng) {
            panic_with_error!(env, ContractError::InvalidCoordinates);
        }
    }

    fn calculate_distance(lat1: i64, lng1: i64, lat2: i64, lng2: i64) -> i64 {
        let lat_diff = i128::from((lat1 - lat2).abs());
        let lng_diff = i128::from((lng1 - lng2).abs());
        let gps_scale = i128::from(GPS_SCALE);
        let meters_per_degree = i128::from(METERS_PER_DEGREE);
        let lat_m = lat_diff * meters_per_degree / gps_scale;

        let mean_abs_lat = ((lat1 + lat2) / 2).abs().min(90 * GPS_SCALE);
        let longitude_factor = i128::from(longitude_scale(mean_abs_lat));
        let lng_m = lng_diff * meters_per_degree * longitude_factor / gps_scale / gps_scale;

        integer_sqrt(lat_m * lat_m + lng_m * lng_m)
    }

    fn get_required<T>(env: &Env, key: &DataKey) -> T
    where
        T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>,
    {
        env.storage()
            .instance()
            .get(key)
            .unwrap_or_else(|| panic_with_error!(env, ContractError::NotActive))
    }

    fn bump_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD_LEDGERS, TTL_EXTEND_TO_LEDGERS);
    }
}

/// Integer cosine approximation for latitude in the range 0..=90 degrees.
/// Uses Bhaskara I via cos(lat) = sin(90° - lat), returning a 1e7 scale.
fn longitude_scale(abs_lat: i64) -> i64 {
    const DEGREE_MILLIS: i64 = 1_000;
    const HALF_TURN_MILLIS: i64 = 180 * DEGREE_MILLIS;
    const QUARTER_TURN_MILLIS: i64 = 90 * DEGREE_MILLIS;
    const BHASKARA_DENOMINATOR: i64 = 40_500 * DEGREE_MILLIS * DEGREE_MILLIS;

    let latitude_millis = (abs_lat / 10_000).min(QUARTER_TURN_MILLIS);
    let complementary_angle = QUARTER_TURN_MILLIS - latitude_millis;
    let product = complementary_angle * (HALF_TURN_MILLIS - complementary_angle);
    let numerator = 4 * product;
    let denominator = BHASKARA_DENOMINATOR - product;
    if denominator == 0 {
        0
    } else {
        numerator * GPS_SCALE / denominator
    }
}

fn integer_sqrt(n: i128) -> i64 {
    if n <= 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    if x > i128::from(i64::MAX) {
        i64::MAX
    } else {
        x as i64
    }
}

#[cfg(test)]
mod test;

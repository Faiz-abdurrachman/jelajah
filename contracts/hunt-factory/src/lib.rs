#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, panic_with_error,
    token::TokenClient, Address, BytesN, Env, MuxedAddress,
};

mod event;

const TTL_THRESHOLD_LEDGERS: u32 = 100_000;
const TTL_EXTEND_TO_LEDGERS: u32 = 2_000_000;
const GPS_SCALE: i64 = 10_000_000;

#[contractclient(name = "ReputationClient")]
#[allow(dead_code)]
trait ReputationInterface {
    fn register_hunt(env: Env, caller: Address, hunt_id: BytesN<32>, instance: Address);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[contracterror]
pub enum ContractError {
    HuntAlreadyExists = 1,
    InvalidAmount = 2,
    InvalidDeadline = 3,
    InvalidRadius = 4,
    InvalidCoordinates = 5,
    UnsupportedHuntType = 6,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Hunt {
    pub hunt_id: BytesN<32>,
    pub instance: Address,
    pub hider: Address,
    pub asset: Address,
    pub amount: i128,
    pub gps_lat: i64,
    pub gps_lng: i64,
    pub radius: u32,
    pub deadline: u64,
    pub clue_hash: BytesN<32>,
    pub hunt_type: u32,
    pub reputation: Address,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
enum DataKey {
    Count,
    InstanceWasmHash,
    Asset,
    Reputation,
    Hunt(BytesN<32>),
}

#[contract]
pub struct HuntFactory;

#[contractimpl]
impl HuntFactory {
    pub fn __constructor(
        env: Env,
        instance_wasm_hash: BytesN<32>,
        asset: Address,
        reputation: Address,
    ) {
        env.storage()
            .instance()
            .set(&DataKey::InstanceWasmHash, &instance_wasm_hash);
        env.storage().instance().set(&DataKey::Asset, &asset);
        env.storage()
            .instance()
            .set(&DataKey::Reputation, &reputation);
        env.storage().instance().set(&DataKey::Count, &0_u32);
        Self::bump_ttl(&env);
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_hunt(
        env: Env,
        hunt_id: BytesN<32>,
        hider: Address,
        amount: i128,
        gps_lat: i64,
        gps_lng: i64,
        radius: u32,
        deadline: u64,
        clue_hash: BytesN<32>,
        hunt_type: u32,
    ) -> Address {
        hider.require_auth();
        Self::bump_ttl(&env);
        Self::validate_hunt(&env, amount, gps_lat, gps_lng, radius, deadline, hunt_type);

        let hunt_key = DataKey::Hunt(hunt_id.clone());
        if env.storage().instance().has(&hunt_key) {
            panic_with_error!(&env, ContractError::HuntAlreadyExists);
        }

        let instance_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::InstanceWasmHash)
            .expect("factory is not configured");
        let asset: Address = env
            .storage()
            .instance()
            .get(&DataKey::Asset)
            .expect("factory is not configured");
        let reputation: Address = env
            .storage()
            .instance()
            .get(&DataKey::Reputation)
            .expect("factory is not configured");

        let instance = env
            .deployer()
            .with_current_contract(hunt_id.clone())
            .deploy_v2(
                instance_wasm_hash,
                (
                    hunt_id.clone(),
                    hider.clone(),
                    asset.clone(),
                    amount,
                    gps_lat,
                    gps_lng,
                    radius,
                    deadline,
                    clue_hash.clone(),
                    hunt_type,
                    reputation.clone(),
                ),
            );

        Self::register_reputation_hunt(&env, &reputation, &hunt_id, &instance);

        let destination = MuxedAddress::from(&instance);
        TokenClient::new(&env, &asset).transfer(&hider, &destination, &amount);

        let hunt = Hunt {
            hunt_id: hunt_id.clone(),
            instance: instance.clone(),
            hider: hider.clone(),
            asset: asset.clone(),
            amount,
            gps_lat,
            gps_lng,
            radius,
            deadline,
            clue_hash,
            hunt_type,
            reputation,
        };
        env.storage().instance().set(&hunt_key, &hunt);

        let count: u32 = env.storage().instance().get(&DataKey::Count).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Count, &count.saturating_add(1));

        event::hunt_created(
            &env,
            hunt_id,
            hider,
            instance.clone(),
            asset,
            amount,
            deadline,
        );

        instance
    }

    pub fn get_hunt_count(env: Env) -> u32 {
        Self::bump_ttl(&env);
        env.storage().instance().get(&DataKey::Count).unwrap_or(0)
    }

    pub fn get_hunt(env: Env, hunt_id: BytesN<32>) -> Option<Hunt> {
        Self::bump_ttl(&env);
        env.storage().instance().get(&DataKey::Hunt(hunt_id))
    }

    pub fn get_instance(env: Env, hunt_id: BytesN<32>) -> Option<Address> {
        Self::bump_ttl(&env);
        let hunt: Option<Hunt> = env.storage().instance().get(&DataKey::Hunt(hunt_id));
        hunt.map(|item| item.instance)
    }

    pub fn get_asset(env: Env) -> Address {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::Asset)
            .expect("factory is not configured")
    }

    pub fn get_reputation(env: Env) -> Address {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::Reputation)
            .expect("factory is not configured")
    }

    fn register_reputation_hunt(
        env: &Env,
        reputation: &Address,
        hunt_id: &BytesN<32>,
        instance: &Address,
    ) {
        let caller = env.current_contract_address();
        ReputationClient::new(env, reputation).register_hunt(&caller, hunt_id, instance);
    }

    #[allow(clippy::too_many_arguments)]
    fn validate_hunt(
        env: &Env,
        amount: i128,
        gps_lat: i64,
        gps_lng: i64,
        radius: u32,
        deadline: u64,
        hunt_type: u32,
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
        if hunt_type != 0 {
            panic_with_error!(env, ContractError::UnsupportedHuntType);
        }

        let max_lat = 90 * GPS_SCALE;
        let max_lng = 180 * GPS_SCALE;
        if !(-max_lat..=max_lat).contains(&gps_lat) || !(-max_lng..=max_lng).contains(&gps_lng) {
            panic_with_error!(env, ContractError::InvalidCoordinates);
        }
    }

    fn bump_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD_LEDGERS, TTL_EXTEND_TO_LEDGERS);
    }
}

#[cfg(all(test, feature = "factory-integration"))]
mod test;

#[cfg(all(test, feature = "full-integration"))]
mod full_integration;

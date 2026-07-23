#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec};

mod event;

#[contract]
pub struct HuntFactory;

#[contractimpl]
impl HuntFactory {
    /// Buat hunt baru → deploy hunt-instance contract
    pub fn create_hunt(
        env: Env,
        hider: Address,
        amount: i128,
        gps_lat: i64,
        gps_lng: i64,
        radius: u32,
        deadline: u64,
        clue_hash: BytesN<32>,
        hunt_type: u32,
    ) -> BytesN<32> {
        hider.require_auth();

        // Generate unique hunt ID (hash of hider + counter)
        let count = env.storage().instance().get::<_, u32>(&DataKey::Count).unwrap_or(0);
        let new_count = count + 1;
        env.storage().instance().set(&DataKey::Count, &new_count);

        let hunt_id = env.crypto().sha256(
            &(hider.clone(), new_count).into_val(&env)
        );

        // Store hunt metadata
        let hunt = Hunt {
            hider: hider.clone(),
            amount,
            gps_lat,
            gps_lng,
            radius,
            deadline,
            clue_hash,
            hunt_type,
        };
        env.storage().instance().set(&DataKey::Hunt(hunt_id.clone()), &hunt);

        // Emit event
        event::hunt_created(&env, hunt_id.clone(), hider, amount, deadline);

        hunt_id
    }

    /// Get total number of hunts created
    pub fn get_hunt_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Count).unwrap_or(0)
    }

    /// Get hunt details by ID
    pub fn get_hunt(env: Env, hunt_id: BytesN<32>) -> Option<Hunt> {
        env.storage().instance().get(&DataKey::Hunt(hunt_id))
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Hunt {
    pub hider: Address,
    pub amount: i128,
    pub gps_lat: i64,
    pub gps_lng: i64,
    pub radius: u32,
    pub deadline: u64,
    pub clue_hash: BytesN<32>,
    pub hunt_type: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    Count,
    Hunt(BytesN<32>),
}

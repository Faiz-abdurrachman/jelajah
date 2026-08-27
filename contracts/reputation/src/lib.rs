#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, BytesN, Env,
    Vec,
};

mod event;

const MAX_XP_PER_HUNT: u32 = 10_000;
const TTL_THRESHOLD_LEDGERS: u32 = 100_000;
const TTL_EXTEND_TO_LEDGERS: u32 = 2_000_000;
const XP_THRESHOLDS: &[u32] = &[0, 500, 2_000, 5_000, 15_000, 50_000];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[contracterror]
pub enum ContractError {
    NotAuthorized = 1,
    FactoryNotConfigured = 2,
    HuntAlreadyRegistered = 3,
    HuntNotRegistered = 4,
    HuntAlreadyRewarded = 5,
    InvalidXpAmount = 6,
    XpOverflow = 7,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[contracttype]
enum DataKey {
    Admin,
    Factory,
    HuntInstance(BytesN<32>),
    InstanceHunt(Address),
    ProcessedHunt(BytesN<32>),
    Xp(Address),
    Level(Address),
    Badges(Address),
}

#[contract]
pub struct Reputation;

#[contractimpl]
impl Reputation {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        Self::bump_ttl(&env);
    }

    /// Configure or rotate the only factory allowed to register hunt instances.
    pub fn set_factory(env: Env, admin: Address, factory: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Factory, &factory);
        Self::bump_ttl(&env);
        event::factory_configured(&env, admin, factory);
    }

    /// Register the instance deployed for a hunt. The factory contract must
    /// authorize this exact sub-contract invocation.
    pub fn register_hunt(env: Env, caller: Address, hunt_id: BytesN<32>, instance: Address) {
        caller.require_auth();
        Self::bump_ttl(&env);

        let factory: Address = env
            .storage()
            .instance()
            .get(&DataKey::Factory)
            .unwrap_or_else(|| panic_with_error!(&env, ContractError::FactoryNotConfigured));
        if caller != factory {
            panic_with_error!(&env, ContractError::NotAuthorized);
        }

        let hunt_key = DataKey::HuntInstance(hunt_id.clone());
        if env.storage().instance().has(&hunt_key)
            || env
                .storage()
                .instance()
                .has(&DataKey::InstanceHunt(instance.clone()))
        {
            panic_with_error!(&env, ContractError::HuntAlreadyRegistered);
        }

        env.storage().instance().set(&hunt_key, &instance);
        env.storage()
            .instance()
            .set(&DataKey::InstanceHunt(instance.clone()), &hunt_id);
        event::hunt_registered(&env, hunt_id, instance);
    }

    /// Award XP exactly once after the registered instance settles its escrow.
    pub fn award_hunt_xp(
        env: Env,
        caller: Address,
        hunt_id: BytesN<32>,
        user: Address,
        amount: u32,
    ) {
        caller.require_auth();
        Self::bump_ttl(&env);

        if amount == 0 || amount > MAX_XP_PER_HUNT {
            panic_with_error!(&env, ContractError::InvalidXpAmount);
        }

        let registered: Address = env
            .storage()
            .instance()
            .get(&DataKey::HuntInstance(hunt_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, ContractError::HuntNotRegistered));
        if caller != registered {
            panic_with_error!(&env, ContractError::NotAuthorized);
        }

        let processed_key = DataKey::ProcessedHunt(hunt_id.clone());
        if env.storage().instance().has(&processed_key) {
            panic_with_error!(&env, ContractError::HuntAlreadyRewarded);
        }

        let xp_key = DataKey::Xp(user.clone());
        let current_xp: u32 = env.storage().instance().get(&xp_key).unwrap_or(0);
        let new_xp = current_xp
            .checked_add(amount)
            .unwrap_or_else(|| panic_with_error!(&env, ContractError::XpOverflow));
        let new_level = Self::calculate_level(new_xp);

        env.storage().instance().set(&xp_key, &new_xp);
        env.storage()
            .instance()
            .set(&DataKey::Level(user.clone()), &new_level);
        env.storage().instance().set(&processed_key, &true);

        event::xp_awarded(&env, hunt_id, user, amount, new_xp, new_level);
    }

    /// Badges are an administrative action until a dedicated issuer is allowlisted.
    pub fn issue_badge(env: Env, admin: Address, user: Address, badge_id: u32) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        Self::bump_ttl(&env);

        let badge_key = DataKey::Badges(user.clone());
        let mut badges: Vec<u32> = env
            .storage()
            .instance()
            .get(&badge_key)
            .unwrap_or(Vec::new(&env));
        if !badges.iter().any(|existing| existing == badge_id) {
            badges.push_back(badge_id);
            env.storage().instance().set(&badge_key, &badges);
            event::badge_issued(&env, user, badge_id);
        }
    }

    pub fn get_admin(env: Env) -> Address {
        Self::bump_ttl(&env);
        Self::get_required(&env, &DataKey::Admin)
    }

    pub fn get_factory(env: Env) -> Option<Address> {
        Self::bump_ttl(&env);
        env.storage().instance().get(&DataKey::Factory)
    }

    pub fn get_hunt_instance(env: Env, hunt_id: BytesN<32>) -> Option<Address> {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::HuntInstance(hunt_id))
    }

    pub fn is_hunt_rewarded(env: Env, hunt_id: BytesN<32>) -> bool {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::ProcessedHunt(hunt_id))
            .unwrap_or(false)
    }

    pub fn get_level(env: Env, user: Address) -> u32 {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::Level(user))
            .unwrap_or(1)
    }

    pub fn get_xp(env: Env, user: Address) -> u32 {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::Xp(user))
            .unwrap_or(0)
    }

    pub fn has_badge(env: Env, user: Address, badge_id: u32) -> bool {
        Self::bump_ttl(&env);
        let badges: Vec<u32> = env
            .storage()
            .instance()
            .get(&DataKey::Badges(user))
            .unwrap_or(Vec::new(&env));
        badges.iter().any(|existing| existing == badge_id)
    }

    pub fn get_badges(env: Env, user: Address) -> Vec<u32> {
        Self::bump_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::Badges(user))
            .unwrap_or(Vec::new(&env))
    }

    fn require_admin(env: &Env, admin: &Address) {
        let stored_admin: Address = Self::get_required(env, &DataKey::Admin);
        if admin != &stored_admin {
            panic_with_error!(env, ContractError::NotAuthorized);
        }
    }

    fn get_required<T>(env: &Env, key: &DataKey) -> T
    where
        T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>,
    {
        env.storage()
            .instance()
            .get(key)
            .unwrap_or_else(|| panic_with_error!(env, ContractError::NotAuthorized))
    }

    fn calculate_level(xp: u32) -> u32 {
        for (index, threshold) in XP_THRESHOLDS.iter().enumerate().rev() {
            if xp >= *threshold {
                return (index + 1) as u32;
            }
        }
        1
    }

    fn bump_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD_LEDGERS, TTL_EXTEND_TO_LEDGERS);
    }
}

#[cfg(test)]
mod test;

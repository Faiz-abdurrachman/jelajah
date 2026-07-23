#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Vec};

// ─── Storage ──────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum DataKey {
    Xp(Address),
    Level(Address),
    Badges(Address),
}

// ─── Constants ────────────────────────────────────────

const XP_THRESHOLDS: &[u32] = &[0, 500, 2_000, 5_000, 15_000, 50_000];

// ─── Contract ─────────────────────────────────────────

#[contract]
pub struct Reputation;

#[contractimpl]
impl Reputation {
    /// Tambah XP untuk user
    pub fn add_xp(env: Env, user: Address, amount: u32) {
        // Only callable by system (hunt-instance, etc.)
        // In production, use admin check
        let current_xp: u32 = env.storage().instance()
            .get(&DataKey::Xp(user.clone()))
            .unwrap_or(0);
        let new_xp = current_xp + amount;
        env.storage().instance().set(&DataKey::Xp(user.clone()), &new_xp);

        // Update level if threshold crossed
        let new_level = Self::calculate_level(new_xp);
        env.storage().instance().set(&DataKey::Level(user.clone()), &new_level);
    }

    /// Dapetin level user
    pub fn get_level(env: Env, user: Address) -> u32 {
        env.storage().instance()
            .get(&DataKey::Level(user))
            .unwrap_or(1)
    }

    /// Dapetin XP user
    pub fn get_xp(env: Env, user: Address) -> u32 {
        env.storage().instance()
            .get(&DataKey::Xp(user))
            .unwrap_or(0)
    }

    /// Issue badge ke user (hanya bisa dipanggil sistem)
    pub fn issue_badge(env: Env, user: Address, badge_id: u32) {
        let mut badges: Vec<u32> = env.storage().instance()
            .get(&DataKey::Badges(user.clone()))
            .unwrap_or(Vec::new(&env));

        // Check if already has badge
        let exists = badges.iter().any(|b| b == badge_id);
        if !exists {
            badges.push_back(badge_id);
            env.storage().instance().set(&DataKey::Badges(user), &badges);
        }
    }

    /// Cek apakah user punya badge
    pub fn has_badge(env: Env, user: Address, badge_id: u32) -> bool {
        let badges: Vec<u32> = env.storage().instance()
            .get(&DataKey::Badges(user))
            .unwrap_or(Vec::new(&env));
        badges.iter().any(|b| b == badge_id)
    }

    /// Dapetin semua badges user
    pub fn get_badges(env: Env, user: Address) -> Vec<u32> {
        env.storage().instance()
            .get(&DataKey::Badges(user))
            .unwrap_or(Vec::new(&env))
    }

    // ── Helpers ───────────────────────────────────────

    fn calculate_level(xp: u32) -> u32 {
        for (i, threshold) in XP_THRESHOLDS.iter().enumerate().rev() {
            if xp >= *threshold {
                return (i + 1) as u32;
            }
        }
        1
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_xp_and_level() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Reputation);
        let client = ReputationClient::new(&env, &contract_id);

        let user = Address::generate(&env);

        // Initial state
        assert_eq!(client.get_xp(&user), 0);
        assert_eq!(client.get_level(&user), 1);

        // Add XP
        client.add_xp(&user, &100);
        assert_eq!(client.get_xp(&user), 100);
        assert_eq!(client.get_level(&user), 1);

        // Level up to 2
        client.add_xp(&user, &400);
        assert_eq!(client.get_level(&user), 2);

        // Issue badge
        client.issue_badge(&user, &1);
        assert!(client.has_badge(&user, &1));
        assert!(!client.has_badge(&user, &2));
    }
}

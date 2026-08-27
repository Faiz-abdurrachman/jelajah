use soroban_sdk::{contractevent, Address, BytesN, Env};

#[contractevent(topics = ["jelajah", "factory_configured"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FactoryConfigured {
    #[topic]
    pub factory: Address,
    pub admin: Address,
}

#[contractevent(topics = ["jelajah", "hunt_registered"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HuntRegistered {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub instance: Address,
}

#[contractevent(topics = ["jelajah", "xp_awarded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct XpAwarded {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub user: Address,
    pub amount: u32,
    pub total_xp: u32,
    pub level: u32,
}

#[contractevent(topics = ["jelajah", "badge_issued"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeIssued {
    #[topic]
    pub user: Address,
    #[topic]
    pub badge_id: u32,
}

pub fn factory_configured(env: &Env, admin: Address, factory: Address) {
    FactoryConfigured { factory, admin }.publish(env);
}

pub fn hunt_registered(env: &Env, hunt_id: BytesN<32>, instance: Address) {
    HuntRegistered { hunt_id, instance }.publish(env);
}

pub fn xp_awarded(
    env: &Env,
    hunt_id: BytesN<32>,
    user: Address,
    amount: u32,
    total_xp: u32,
    level: u32,
) {
    XpAwarded {
        hunt_id,
        user,
        amount,
        total_xp,
        level,
    }
    .publish(env);
}

pub fn badge_issued(env: &Env, user: Address, badge_id: u32) {
    BadgeIssued { user, badge_id }.publish(env);
}

use soroban_sdk::{Address, BytesN, Env};

pub fn hunt_claimed(env: &Env, hunter: Address, timestamp: u64) {
    env.events().publish(
        ("hunt_claimed",),
        (hunter, timestamp),
    );
}

pub fn hunt_approved(env: &Env, hunter: Address, amount: i128) {
    env.events().publish(
        ("hunt_approved",),
        (hunter, amount),
    );
}

pub fn hunt_rejected(env: &Env, reason: BytesN<32>) {
    env.events().publish(
        ("hunt_rejected",),
        (reason,),
    );
}

pub fn hunt_expired(env: &Env, hider: Address, amount: i128) {
    env.events().publish(
        ("hunt_expired",),
        (hider, amount),
    );
}

pub fn dispute_resolved(env: &Env, hunter_wins: bool) {
    env.events().publish(
        ("dispute_resolved",),
        (hunter_wins,),
    );
}

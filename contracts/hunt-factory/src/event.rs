use soroban_sdk::{Address, BytesN, Env};

pub fn hunt_created(
    env: &Env,
    hunt_id: BytesN<32>,
    hider: Address,
    amount: i128,
    deadline: u64,
) {
    env.events().publish(
        ("hunt_created",),
        (hunt_id, hider, amount, deadline),
    );
}

use soroban_sdk::{contractevent, Address, BytesN, Env};

#[contractevent(topics = ["jelajah", "hunt_created"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HuntCreated {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub hider: Address,
    pub instance: Address,
    pub asset: Address,
    pub amount: i128,
    pub deadline: u64,
}

pub fn hunt_created(
    env: &Env,
    hunt_id: BytesN<32>,
    hider: Address,
    instance: Address,
    asset: Address,
    amount: i128,
    deadline: u64,
) {
    HuntCreated {
        hunt_id,
        hider,
        instance,
        asset,
        amount,
        deadline,
    }
    .publish(env);
}

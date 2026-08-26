use soroban_sdk::{contractevent, Address, BytesN, Env};

#[contractevent(topics = ["jelajah", "claim_submitted"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimSubmitted {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub hunter: Address,
    pub photo_hash: BytesN<32>,
    pub timestamp: u64,
}

#[contractevent(topics = ["jelajah", "reward_paid"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardPaid {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub hunter: Address,
    pub amount: i128,
    pub automatic: bool,
}

#[contractevent(topics = ["jelajah", "claim_rejected"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimRejected {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub hunter: Address,
    pub reason_hash: BytesN<32>,
}

#[contractevent(topics = ["jelajah", "reward_refunded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardRefunded {
    #[topic]
    pub hunt_id: BytesN<32>,
    #[topic]
    pub hider: Address,
    pub amount: i128,
}

pub fn claim_submitted(
    env: &Env,
    hunt_id: BytesN<32>,
    hunter: Address,
    photo_hash: BytesN<32>,
    timestamp: u64,
) {
    ClaimSubmitted {
        hunt_id,
        hunter,
        photo_hash,
        timestamp,
    }
    .publish(env);
}

pub fn reward_paid(
    env: &Env,
    hunt_id: BytesN<32>,
    hunter: Address,
    amount: i128,
    automatic: bool,
) {
    RewardPaid {
        hunt_id,
        hunter,
        amount,
        automatic,
    }
    .publish(env);
}

pub fn claim_rejected(
    env: &Env,
    hunt_id: BytesN<32>,
    hunter: Address,
    reason_hash: BytesN<32>,
) {
    ClaimRejected {
        hunt_id,
        hunter,
        reason_hash,
    }
    .publish(env);
}

pub fn reward_refunded(env: &Env, hunt_id: BytesN<32>, hider: Address, amount: i128) {
    RewardRefunded {
        hunt_id,
        hider,
        amount,
    }
    .publish(env);
}

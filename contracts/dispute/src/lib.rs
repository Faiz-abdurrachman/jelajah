#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, xdr::ToXdr, Address,
    BytesN, Env, Vec,
};

// ─── Constants ────────────────────────────────────────

const REQUIRED_DISPUTE_VOTES: u32 = 2;
const REQUIRED_APPEAL_VOTES: u32 = 3;

// ─── Error Codes ──────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracterror]
pub enum ContractError {
    NotAVerifier = 1,
    InvalidReveal = 2,
    AlreadyResolved = 3,
    NotInVoting = 4,
    DisputeNotFound = 5,
    NoDispute = 6,
}

// ─── Storage ──────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum DataKey {
    Dispute(BytesN<32>),
    Appeal(BytesN<32>),
    AppealVerifiers(BytesN<32>),
    VerifierStake(Address),
    VerifierSlash(Address),
}

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub struct DisputeData {
    pub claim_id: BytesN<32>,
    pub hunt_id: BytesN<32>,
    pub verifiers: Vec<Address>,
    pub votes_commit: Vec<(Address, BytesN<32>)>,
    pub votes_reveal: Vec<(Address, bool)>,
    pub status: u32,
    pub resolution: bool,
    pub created_at: u64,
}

// ─── Contract ─────────────────────────────────────────

#[contract]
pub struct Dispute;

#[contractimpl]
impl Dispute {
    pub fn create_dispute(
        env: Env,
        dispute_id: BytesN<32>,
        claim_id: BytesN<32>,
        hunt_id: BytesN<32>,
        verifiers: Vec<Address>,
    ) {
        let dispute = DisputeData {
            claim_id,
            hunt_id,
            verifiers,
            votes_commit: Vec::new(&env),
            votes_reveal: Vec::new(&env),
            status: 0,
            resolution: false,
            created_at: env.ledger().timestamp(),
        };
        env.storage()
            .instance()
            .set(&DataKey::Dispute(dispute_id), &dispute);
    }

    pub fn commit_vote(env: Env, dispute_id: BytesN<32>, verifier: Address, vote_hash: BytesN<32>) {
        verifier.require_auth();

        let mut dispute: DisputeData = env
            .storage()
            .instance()
            .get(&DataKey::Dispute(dispute_id.clone()))
            .expect("dispute not found");

        if dispute.status != 0 {
            panic_with_error!(&env, ContractError::NotInVoting);
        }

        let is_verifier = dispute.verifiers.iter().any(|v| v == verifier);
        if !is_verifier {
            panic_with_error!(&env, ContractError::NotAVerifier);
        }

        dispute.votes_commit.push_back((verifier, vote_hash));
        env.storage()
            .instance()
            .set(&DataKey::Dispute(dispute_id), &dispute);
    }

    pub fn reveal_vote(
        env: Env,
        dispute_id: BytesN<32>,
        verifier: Address,
        vote: bool,
        salt: BytesN<32>,
    ) {
        verifier.require_auth();

        let mut dispute: DisputeData = env
            .storage()
            .instance()
            .get(&DataKey::Dispute(dispute_id.clone()))
            .expect("dispute not found");

        let computed_hash: BytesN<32> = env
            .crypto()
            .sha256(&(verifier.clone(), vote, salt).to_xdr(&env))
            .into();
        let found = dispute
            .votes_commit
            .iter()
            .any(|(addr, hash)| addr == verifier && hash == computed_hash);
        if !found {
            panic_with_error!(&env, ContractError::InvalidReveal);
        }

        dispute.votes_reveal.push_back((verifier, vote));
        env.storage()
            .instance()
            .set(&DataKey::Dispute(dispute_id), &dispute);
    }

    pub fn resolve(env: Env, dispute_id: BytesN<32>) -> bool {
        let mut dispute: DisputeData = env
            .storage()
            .instance()
            .get(&DataKey::Dispute(dispute_id.clone()))
            .expect("dispute not found");

        if dispute.status != 0 {
            panic_with_error!(&env, ContractError::AlreadyResolved);
        }

        let approve_count = dispute.votes_reveal.iter().filter(|(_, v)| *v).count() as u32;
        let resolution = approve_count >= REQUIRED_DISPUTE_VOTES;

        dispute.status = 1;
        dispute.resolution = resolution;
        env.storage()
            .instance()
            .set(&DataKey::Dispute(dispute_id), &dispute);

        resolution
    }

    // ── Appeal ────────────────────────────────────────

    pub fn appeal(env: Env, dispute_id: BytesN<32>, appellant: Address) {
        appellant.require_auth();

        let mut dispute: DisputeData = env
            .storage()
            .instance()
            .get(&DataKey::Dispute(dispute_id.clone()))
            .expect("dispute not found");

        dispute.status = 2;
        env.storage()
            .instance()
            .set(&DataKey::Dispute(dispute_id), &dispute);
    }

    pub fn select_appeal_verifiers(env: Env, dispute_id: BytesN<32>, verifiers: Vec<Address>) {
        env.storage()
            .instance()
            .set(&DataKey::AppealVerifiers(dispute_id), &verifiers);
    }

    pub fn resolve_appeal(env: Env, dispute_id: BytesN<32>, votes: Vec<(Address, bool)>) -> bool {
        let approve_count = votes.iter().filter(|(_, v)| *v).count() as u32;
        let resolution = approve_count >= REQUIRED_APPEAL_VOTES;

        let mut dispute: DisputeData = env
            .storage()
            .instance()
            .get(&DataKey::Dispute(dispute_id.clone()))
            .expect("dispute not found");

        dispute.status = 1;
        dispute.resolution = resolution;
        env.storage()
            .instance()
            .set(&DataKey::Dispute(dispute_id), &dispute);

        resolution
    }

    // ── Stake Management ──────────────────────────────

    pub fn stake(env: Env, verifier: Address, amount: i128) {
        verifier.require_auth();
        let current: i128 = env
            .storage()
            .instance()
            .get(&DataKey::VerifierStake(verifier.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::VerifierStake(verifier), &(current + amount));
    }

    pub fn slash(env: Env, verifier: Address, amount: i128) {
        let current: i128 = env
            .storage()
            .instance()
            .get(&DataKey::VerifierStake(verifier.clone()))
            .unwrap_or(0);
        let new_amount = (current - amount).max(0);
        env.storage()
            .instance()
            .set(&DataKey::VerifierStake(verifier), &new_amount);
    }

    pub fn get_stake(env: Env, verifier: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::VerifierStake(verifier))
            .unwrap_or(0)
    }
}

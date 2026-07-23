#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, Address, BytesN, Env, Vec,
};

// ─── Error Codes ──────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum Error {
    QuestNotFound = 1,
    InvalidStep = 2,
    StepNotFound = 3,
    FinalStepNotCompleted = 4,
    NotQuestHider = 5,
}

// ─── Storage ──────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum DataKey {
    Steps(BytesN<32>),
    CurrentStep(BytesN<32>, Address),
    CompletedSteps(BytesN<32>, Address),
    QuestHider(BytesN<32>),
    QuestStatus(BytesN<32>),
}

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub struct QuestStep {
    pub step_number: u32,
    pub clue_hash: BytesN<32>,
    pub gps_lat: i64,
    pub gps_lng: i64,
    pub radius: u32,
    pub is_final: bool,
}

// ─── Contract ─────────────────────────────────────────

#[contract]
pub struct QuestChain;

#[contractimpl]
impl QuestChain {
    pub fn set_quest_steps(env: Env, quest_id: BytesN<32>, hider: Address, steps: Vec<QuestStep>) {
        hider.require_auth();
        env.storage().instance().set(&DataKey::Steps(quest_id.clone()), &steps);
        env.storage().instance().set(&DataKey::QuestHider(quest_id.clone()), &hider);
        env.storage().instance().set(&DataKey::QuestStatus(quest_id), &0u32);
    }

    pub fn complete_step(
        env: Env,
        quest_id: BytesN<32>,
        hunter: Address,
        step: u32,
        photo_cid: BytesN<32>,
    ) {
        hunter.require_auth();

        let steps: Vec<QuestStep> = env.storage().instance()
            .get(&DataKey::Steps(quest_id.clone()))
            .expect("quest not found");

        let current_step: u32 = env.storage().instance()
            .get(&DataKey::CurrentStep(quest_id.clone(), hunter.clone()))
            .unwrap_or(0);

        if step != current_step {
            panic_with_error!(&env, Error::InvalidStep);
        }

        let step_exists = steps.iter().any(|s| s.step_number == step);
        if !step_exists {
            panic_with_error!(&env, Error::StepNotFound);
        }

        let mut completed: Vec<u32> = env.storage().instance()
            .get(&DataKey::CompletedSteps(quest_id.clone(), hunter.clone()))
            .unwrap_or(Vec::new(&env));
        completed.push_back(step);
        env.storage().instance().set(
            &DataKey::CompletedSteps(quest_id.clone(), hunter.clone()),
            &completed,
        );

        let next_step = current_step + 1;
        env.storage().instance().set(
            &DataKey::CurrentStep(quest_id.clone(), hunter.clone()),
            &next_step,
        );
    }

    pub fn get_current_step(env: Env, quest_id: BytesN<32>, hunter: Address) -> u32 {
        env.storage().instance()
            .get(&DataKey::CurrentStep(quest_id, hunter))
            .unwrap_or(0)
    }

    pub fn claim_quest(env: Env, quest_id: BytesN<32>, hunter: Address) {
        hunter.require_auth();

        let steps: Vec<QuestStep> = env.storage().instance()
            .get(&DataKey::Steps(quest_id.clone()))
            .expect("quest not found");

        let last_step = steps.len() as u32 - 1;
        let completed: Vec<u32> = env.storage().instance()
            .get(&DataKey::CompletedSteps(quest_id, hunter))
            .expect("no completed steps");

        let has_last = completed.iter().any(|s| *s == last_step);
        if !has_last {
            panic_with_error!(&env, Error::FinalStepNotCompleted);
        }
    }

    pub fn get_steps(env: Env, quest_id: BytesN<32>) -> Vec<QuestStep> {
        env.storage().instance()
            .get(&DataKey::Steps(quest_id))
            .expect("quest not found")
    }
}

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Vec};

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
    /// Setup quest chain steps
    pub fn set_quest_steps(env: Env, quest_id: BytesN<32>, hider: Address, steps: Vec<QuestStep>) {
        hider.require_auth();
        env.storage().instance().set(&DataKey::Steps(quest_id.clone()), &steps);
        env.storage().instance().set(&DataKey::QuestHider(quest_id.clone()), &hider);
        env.storage().instance().set(&DataKey::QuestStatus(quest_id), &0u32); // 0=active
    }

    /// Hunter complete satu step
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
            panic!("invalid step");
        }

        // Verify step exists
        let step_exists = steps.iter().any(|s| s.step_number == step);
        if !step_exists {
            panic!("step not found");
        }

        // Mark step as completed
        let mut completed: Vec<u32> = env.storage().instance()
            .get(&DataKey::CompletedSteps(quest_id.clone(), hunter.clone()))
            .unwrap_or(Vec::new(&env));
        completed.push_back(step);
        env.storage().instance().set(
            &DataKey::CompletedSteps(quest_id.clone(), hunter.clone()),
            &completed,
        );

        // Move to next step
        let next_step = current_step + 1;
        env.storage().instance().set(
            &DataKey::CurrentStep(quest_id.clone(), hunter.clone()),
            &next_step,
        );
    }

    /// Cek step hunter saat ini
    pub fn get_current_step(env: Env, quest_id: BytesN<32>, hunter: Address) -> u32 {
        env.storage().instance()
            .get(&DataKey::CurrentStep(quest_id, hunter))
            .unwrap_or(0)
    }

    /// Claim quest setelah final step
    pub fn claim_quest(env: Env, quest_id: BytesN<32>, hunter: Address) {
        hunter.require_auth();

        let steps: Vec<QuestStep> = env.storage().instance()
            .get(&DataKey::Steps(quest_id.clone()))
            .expect("quest not found");

        let last_step = steps.len() as u32 - 1;
        let completed: Vec<u32> = env.storage().instance()
            .get(&DataKey::CompletedSteps(quest_id, hunter))
            .expect("no completed steps");

        // Verify last step is completed
        let has_last = completed.iter().any(|s| *s == last_step);
        if !has_last {
            panic!("final step not completed");
        }

        // Trigger claim (in production, this calls hunt-instance)
        // For now, mark quest as completed
    }

    /// Get all quest steps
    pub fn get_steps(env: Env, quest_id: BytesN<32>) -> Vec<QuestStep> {
        env.storage().instance()
            .get(&DataKey::Steps(quest_id))
            .expect("quest not found")
    }
}

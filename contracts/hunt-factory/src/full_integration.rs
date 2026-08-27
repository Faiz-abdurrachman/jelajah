extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Bytes, BytesN, Env,
};

mod factory_contract {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/hunt_factory.wasm");
}

mod instance_contract {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/hunt_instance.wasm");
}

mod reputation_contract {
    soroban_sdk::contractimport!(file = "../target/wasm32v1-none/release/reputation.wasm");
}

const START_TIME: u64 = 10_000;
const DEADLINE: u64 = START_TIME + 7 * 24 * 60 * 60;
const REWARD: i128 = 30_000_000;
const COMPLETION_XP: u32 = 100;

#[test]
fn production_wasms_settle_escrow_and_award_xp_end_to_end() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(START_TIME);

    let admin = Address::generate(&env);
    let hider = Address::generate(&env);
    let hunter = Address::generate(&env);
    let asset_admin = Address::generate(&env);
    let stellar_asset = env.register_stellar_asset_contract_v2(asset_admin);
    let asset = stellar_asset.address();
    StellarAssetClient::new(&env, &asset).mint(&hider, &(REWARD * 2));

    let reputation = env.register(reputation_contract::WASM, (admin.clone(),));
    let instance_wasm_hash = env
        .deployer()
        .upload_contract_wasm(Bytes::from_slice(&env, instance_contract::WASM));
    let factory = env.register(
        factory_contract::WASM,
        (instance_wasm_hash, asset.clone(), reputation.clone()),
    );

    let reputation_client = reputation_contract::Client::new(&env, &reputation);
    reputation_client.set_factory(&admin, &factory);

    let hunt_id = BytesN::from_array(&env, &[21; 32]);
    let factory_client = factory_contract::Client::new(&env, &factory);
    let instance = factory_client.create_hunt(
        &hunt_id,
        &hider,
        &REWARD,
        &(-61_754_000_i64),
        &1_068_272_000_i64,
        &75_u32,
        &DEADLINE,
        &BytesN::from_array(&env, &[22; 32]),
        &0_u32,
    );

    assert_eq!(
        reputation_client.get_hunt_instance(&hunt_id),
        Some(instance.clone())
    );
    assert_eq!(TokenClient::new(&env, &asset).balance(&instance), REWARD);

    let instance_client = instance_contract::Client::new(&env, &instance);
    instance_client.submit_claim(
        &hunter,
        &BytesN::from_array(&env, &[23; 32]),
        &(-61_754_000_i64),
        &1_068_272_000_i64,
    );
    instance_client.approve(&hider);

    assert_eq!(
        instance_client.get_status(),
        instance_contract::HuntStatus::Claimed
    );
    assert_eq!(TokenClient::new(&env, &asset).balance(&hunter), REWARD);
    assert_eq!(TokenClient::new(&env, &asset).balance(&instance), 0);
    assert_eq!(reputation_client.get_xp(&hunter), COMPLETION_XP);
    assert_eq!(reputation_client.get_level(&hunter), 1);
    assert!(reputation_client.is_hunt_rewarded(&hunt_id));
}

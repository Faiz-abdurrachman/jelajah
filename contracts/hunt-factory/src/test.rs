extern crate std;

use super::*;
use soroban_sdk::{
    contractclient,
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
};

const INSTANCE_WASM: &[u8] = include_bytes!(
    "../../target/wasm32v1-none/release/hunt_instance.wasm"
);
const START_TIME: u64 = 1_000;
const DEADLINE: u64 = START_TIME + 7 * 24 * 60 * 60;
const REWARD: i128 = 50_000_000;

#[contractclient(name = "InstanceClient")]
#[allow(dead_code)]
trait InstanceInterface {
    fn get_escrow_balance(env: Env) -> i128;
    fn get_hider(env: Env) -> Address;
}

struct Fixture {
    env: Env,
    factory: Address,
    asset: Address,
    hider: Address,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(START_TIME);

        let asset_admin = Address::generate(&env);
        let hider = Address::generate(&env);
        let stellar_asset = env.register_stellar_asset_contract_v2(asset_admin);
        let asset = stellar_asset.address();
        StellarAssetClient::new(&env, &asset).mint(&hider, &(REWARD * 3));

        let wasm = soroban_sdk::Bytes::from_slice(&env, INSTANCE_WASM);
        let instance_wasm_hash = env.deployer().upload_contract_wasm(wasm);
        let factory = env.register(HuntFactory, (instance_wasm_hash, asset.clone()));

        Self {
            env,
            factory,
            asset,
            hider,
        }
    }

    fn client(&self) -> HuntFactoryClient<'_> {
        HuntFactoryClient::new(&self.env, &self.factory)
    }
}

#[test]
fn create_hunt_deploys_instance_and_funds_escrow_atomically() {
    let fixture = Fixture::new();
    let hunt_id = BytesN::from_array(&fixture.env, &[1; 32]);

    let instance = fixture.client().create_hunt(
        &hunt_id,
        &fixture.hider,
        &REWARD,
        &(-61_754_000_i64),
        &1_068_272_000_i64,
        &75_u32,
        &DEADLINE,
        &BytesN::from_array(&fixture.env, &[2; 32]),
        &0_u32,
    );

    let stored = fixture.client().get_hunt(&hunt_id).unwrap();
    assert_eq!(stored.instance, instance);
    assert_eq!(stored.asset, fixture.asset);
    assert_eq!(stored.amount, REWARD);
    assert_eq!(fixture.client().get_hunt_count(), 1);
    assert_eq!(fixture.client().get_instance(&hunt_id), Some(instance.clone()));
    assert_eq!(
        TokenClient::new(&fixture.env, &fixture.asset).balance(&fixture.hider),
        REWARD * 2
    );

    let instance_client = InstanceClient::new(&fixture.env, &instance);
    assert_eq!(instance_client.get_hider(), fixture.hider);
    assert_eq!(instance_client.get_escrow_balance(), REWARD);
}

#[test]
fn duplicate_id_does_not_deploy_or_charge_twice() {
    let fixture = Fixture::new();
    let hunt_id = BytesN::from_array(&fixture.env, &[3; 32]);
    let clue_hash = BytesN::from_array(&fixture.env, &[4; 32]);

    fixture.client().create_hunt(
        &hunt_id,
        &fixture.hider,
        &REWARD,
        &0_i64,
        &0_i64,
        &50_u32,
        &DEADLINE,
        &clue_hash,
        &0_u32,
    );
    let balance_after_first =
        TokenClient::new(&fixture.env, &fixture.asset).balance(&fixture.hider);

    assert_eq!(
        fixture.client().try_create_hunt(
            &hunt_id,
            &fixture.hider,
            &REWARD,
            &0_i64,
            &0_i64,
            &50_u32,
            &DEADLINE,
            &clue_hash,
            &0_u32,
        ),
        Err(Ok(ContractError::HuntAlreadyExists.into()))
    );
    assert_eq!(fixture.client().get_hunt_count(), 1);
    assert_eq!(
        TokenClient::new(&fixture.env, &fixture.asset).balance(&fixture.hider),
        balance_after_first
    );
}

#[test]
fn unsupported_hunt_type_is_rejected_before_funds_move() {
    let fixture = Fixture::new();
    let initial_balance =
        TokenClient::new(&fixture.env, &fixture.asset).balance(&fixture.hider);

    assert_eq!(
        fixture.client().try_create_hunt(
            &BytesN::from_array(&fixture.env, &[5; 32]),
            &fixture.hider,
            &REWARD,
            &0_i64,
            &0_i64,
            &50_u32,
            &DEADLINE,
            &BytesN::from_array(&fixture.env, &[6; 32]),
            &1_u32,
        ),
        Err(Ok(ContractError::UnsupportedHuntType.into()))
    );
    assert_eq!(fixture.client().get_hunt_count(), 0);
    assert_eq!(
        TokenClient::new(&fixture.env, &fixture.asset).balance(&fixture.hider),
        initial_balance
    );
}

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;

struct Fixture {
    env: Env,
    contract: Address,
    admin: Address,
    factory: Address,
    instance: Address,
    user: Address,
    hunt_id: BytesN<32>,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let factory = Address::generate(&env);
        let instance = Address::generate(&env);
        let user = Address::generate(&env);
        let hunt_id = BytesN::from_array(&env, &[7; 32]);
        let contract = env.register(Reputation, (admin.clone(),));
        let client = ReputationClient::new(&env, &contract);
        client.set_factory(&admin, &factory);
        client.register_hunt(&factory, &hunt_id, &instance);

        Self {
            env,
            contract,
            admin,
            factory,
            instance,
            user,
            hunt_id,
        }
    }

    fn client(&self) -> ReputationClient<'_> {
        ReputationClient::new(&self.env, &self.contract)
    }
}

#[test]
fn registered_instance_awards_xp_and_levels_up() {
    let fixture = Fixture::new();
    let client = fixture.client();

    client.award_hunt_xp(&fixture.instance, &fixture.hunt_id, &fixture.user, &500);

    assert_eq!(client.get_xp(&fixture.user), 500);
    assert_eq!(client.get_level(&fixture.user), 2);
    assert!(client.is_hunt_rewarded(&fixture.hunt_id));
}

#[test]
fn only_configured_factory_can_register_hunts() {
    let fixture = Fixture::new();
    let attacker = Address::generate(&fixture.env);
    let other_hunt = BytesN::from_array(&fixture.env, &[8; 32]);
    let other_instance = Address::generate(&fixture.env);

    assert_eq!(
        fixture
            .client()
            .try_register_hunt(&attacker, &other_hunt, &other_instance),
        Err(Ok(ContractError::NotAuthorized.into()))
    );
    assert_eq!(fixture.client().get_hunt_instance(&other_hunt), None);
}

#[test]
fn wrong_instance_cannot_award_xp() {
    let fixture = Fixture::new();
    let attacker = Address::generate(&fixture.env);

    assert_eq!(
        fixture
            .client()
            .try_award_hunt_xp(&attacker, &fixture.hunt_id, &fixture.user, &100,),
        Err(Ok(ContractError::NotAuthorized.into()))
    );
    assert_eq!(fixture.client().get_xp(&fixture.user), 0);
}

#[test]
fn hunt_reward_cannot_be_replayed() {
    let fixture = Fixture::new();
    fixture
        .client()
        .award_hunt_xp(&fixture.instance, &fixture.hunt_id, &fixture.user, &100);

    assert_eq!(
        fixture.client().try_award_hunt_xp(
            &fixture.instance,
            &fixture.hunt_id,
            &fixture.user,
            &100,
        ),
        Err(Ok(ContractError::HuntAlreadyRewarded.into()))
    );
    assert_eq!(fixture.client().get_xp(&fixture.user), 100);
}

#[test]
fn invalid_xp_amounts_are_rejected() {
    let fixture = Fixture::new();

    assert_eq!(
        fixture
            .client()
            .try_award_hunt_xp(&fixture.instance, &fixture.hunt_id, &fixture.user, &0,),
        Err(Ok(ContractError::InvalidXpAmount.into()))
    );
    assert_eq!(fixture.client().get_xp(&fixture.user), 0);
}

#[test]
fn only_admin_can_issue_unique_badges() {
    let fixture = Fixture::new();
    let attacker = Address::generate(&fixture.env);

    assert_eq!(
        fixture
            .client()
            .try_issue_badge(&attacker, &fixture.user, &1),
        Err(Ok(ContractError::NotAuthorized.into()))
    );

    fixture
        .client()
        .issue_badge(&fixture.admin, &fixture.user, &1);
    fixture
        .client()
        .issue_badge(&fixture.admin, &fixture.user, &1);
    assert!(fixture.client().has_badge(&fixture.user, &1));
    assert_eq!(fixture.client().get_badges(&fixture.user).len(), 1);
}

#[test]
fn factory_can_be_rotated_only_by_admin() {
    let fixture = Fixture::new();
    let attacker = Address::generate(&fixture.env);
    let replacement = Address::generate(&fixture.env);

    assert_eq!(
        fixture.client().try_set_factory(&attacker, &replacement),
        Err(Ok(ContractError::NotAuthorized.into()))
    );
    assert_eq!(fixture.client().get_factory(), Some(fixture.factory));
}

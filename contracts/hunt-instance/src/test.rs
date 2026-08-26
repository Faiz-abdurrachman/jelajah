extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    MuxedAddress,
};

const START_TIME: u64 = 1_000;
const DEADLINE: u64 = START_TIME + 7 * 24 * 60 * 60;
const REWARD: i128 = 50_000_000;
const HUNT_LAT: i64 = -6_175_4000;
const HUNT_LNG: i64 = 106_827_2000;
const RADIUS_METERS: u32 = 75;

struct Fixture {
    env: Env,
    contract: Address,
    asset: Address,
    hider: Address,
    hunter: Address,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(START_TIME);

        let asset_admin = Address::generate(&env);
        let hider = Address::generate(&env);
        let hunter = Address::generate(&env);
        let stellar_asset = env.register_stellar_asset_contract_v2(asset_admin);
        let asset = stellar_asset.address();
        StellarAssetClient::new(&env, &asset).mint(&hider, &(REWARD * 2));

        let hunt_id = BytesN::from_array(&env, &[1; 32]);
        let clue_hash = BytesN::from_array(&env, &[2; 32]);
        let contract = env.register(
            HuntInstance,
            (
                hunt_id,
                hider.clone(),
                asset.clone(),
                REWARD,
                HUNT_LAT,
                HUNT_LNG,
                RADIUS_METERS,
                DEADLINE,
                clue_hash,
                0_u32,
            ),
        );

        TokenClient::new(&env, &asset).transfer(
            &hider,
            &MuxedAddress::from(&contract),
            &REWARD,
        );

        Self {
            env,
            contract,
            asset,
            hider,
            hunter,
        }
    }

    fn client(&self) -> HuntInstanceClient<'_> {
        HuntInstanceClient::new(&self.env, &self.contract)
    }

    fn token(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.asset)
    }

    fn submit_valid_claim(&self) {
        self.client().submit_claim(
            &self.hunter,
            &BytesN::from_array(&self.env, &[3; 32]),
            &HUNT_LAT,
            &HUNT_LNG,
        );
    }
}

#[test]
fn approve_pays_the_hunter_exactly_once() {
    let fixture = Fixture::new();
    fixture.submit_valid_claim();

    let pending = fixture.client().get_hunt();
    assert_eq!(pending.status, HuntStatus::ClaimPending);
    assert_eq!(pending.claimer, Some(fixture.hunter.clone()));
    assert_eq!(fixture.client().get_escrow_balance(), REWARD);

    fixture.client().approve(&fixture.hider);

    assert_eq!(fixture.client().get_status(), HuntStatus::Claimed);
    assert_eq!(fixture.token().balance(&fixture.hunter), REWARD);
    assert_eq!(fixture.client().get_escrow_balance(), 0);
    assert_eq!(
        fixture.client().try_approve(&fixture.hider),
        Err(Ok(ContractError::NoClaimPending.into()))
    );
}

#[test]
fn auto_release_only_pays_after_twenty_four_hours() {
    let fixture = Fixture::new();
    fixture.submit_valid_claim();

    assert_eq!(
        fixture.client().try_auto_release(),
        Err(Ok(ContractError::TimerNotExpired.into()))
    );
    assert_eq!(fixture.client().get_timer_remaining(), CLAIM_TIMER_SECONDS);

    fixture
        .env
        .ledger()
        .set_timestamp(START_TIME + CLAIM_TIMER_SECONDS);
    fixture.client().auto_release();

    assert_eq!(fixture.client().get_status(), HuntStatus::Claimed);
    assert_eq!(fixture.token().balance(&fixture.hunter), REWARD);
    assert_eq!(fixture.client().get_timer_remaining(), 0);
}

#[test]
fn expired_unclaimed_hunt_refunds_the_hider() {
    let fixture = Fixture::new();
    assert_eq!(fixture.token().balance(&fixture.hider), REWARD);
    assert_eq!(
        fixture.client().try_claim_expired(),
        Err(Ok(ContractError::InvalidDeadline.into()))
    );

    fixture.env.ledger().set_timestamp(DEADLINE);
    fixture.client().claim_expired();

    assert_eq!(fixture.client().get_status(), HuntStatus::Expired);
    assert_eq!(fixture.token().balance(&fixture.hider), REWARD * 2);
    assert_eq!(fixture.client().get_escrow_balance(), 0);
}

#[test]
fn claim_outside_the_radius_is_rejected_without_changing_state() {
    let fixture = Fixture::new();
    let far_away_lat = HUNT_LAT + GPS_SCALE / 100;

    assert_eq!(
        fixture.client().try_submit_claim(
            &fixture.hunter,
            &BytesN::from_array(&fixture.env, &[4; 32]),
            &far_away_lat,
            &HUNT_LNG,
        ),
        Err(Ok(ContractError::NotInRadius.into()))
    );
    assert_eq!(fixture.client().get_status(), HuntStatus::Active);
    assert_eq!(fixture.client().get_hunter(), None);
    assert_eq!(fixture.client().get_escrow_balance(), REWARD);
}

#[test]
fn only_one_claim_can_be_pending() {
    let fixture = Fixture::new();
    fixture.submit_valid_claim();
    let second_hunter = Address::generate(&fixture.env);

    assert_eq!(
        fixture.client().try_submit_claim(
            &second_hunter,
            &BytesN::from_array(&fixture.env, &[5; 32]),
            &HUNT_LAT,
            &HUNT_LNG,
        ),
        Err(Ok(ContractError::NotActive.into()))
    );
    assert_eq!(fixture.client().get_hunter(), Some(fixture.hunter));
}

#[test]
fn only_the_hider_can_approve_and_reject_reopens_the_hunt() {
    let fixture = Fixture::new();
    fixture.submit_valid_claim();
    let impostor = Address::generate(&fixture.env);

    assert_eq!(
        fixture.client().try_approve(&impostor),
        Err(Ok(ContractError::NotAuthorized.into()))
    );

    fixture.client().reject(
        &fixture.hider,
        &BytesN::from_array(&fixture.env, &[6; 32]),
    );
    assert_eq!(fixture.client().get_status(), HuntStatus::Active);
    assert_eq!(fixture.client().get_hunter(), None);
    assert_eq!(fixture.client().get_escrow_balance(), REWARD);

    assert_eq!(
        fixture.client().try_submit_claim(
            &fixture.hunter,
            &BytesN::from_array(&fixture.env, &[7; 32]),
            &HUNT_LAT,
            &HUNT_LNG,
        ),
        Err(Ok(ContractError::AlreadyClaimed.into()))
    );

    let next_hunter = Address::generate(&fixture.env);
    fixture.client().submit_claim(
        &next_hunter,
        &BytesN::from_array(&fixture.env, &[8; 32]),
        &HUNT_LAT,
        &HUNT_LNG,
    );
    assert_eq!(fixture.client().get_hunter(), Some(next_hunter));
}

#[test]
fn hider_cannot_claim_their_own_reward() {
    let fixture = Fixture::new();
    assert_eq!(
        fixture.client().try_submit_claim(
            &fixture.hider,
            &BytesN::from_array(&fixture.env, &[9; 32]),
            &HUNT_LAT,
            &HUNT_LNG,
        ),
        Err(Ok(ContractError::SelfClaim.into()))
    );
    assert_eq!(fixture.client().get_status(), HuntStatus::Active);
    assert_eq!(fixture.client().get_escrow_balance(), REWARD);
}

#[test]
fn distance_math_scales_longitude_by_latitude() {
    assert_eq!(longitude_scale(0), GPS_SCALE);
    assert_eq!(longitude_scale(90 * GPS_SCALE), 0);

    let equator = HuntInstance::calculate_distance(0, 0, 0, GPS_SCALE);
    let sixty_degrees = HuntInstance::calculate_distance(
        60 * GPS_SCALE,
        0,
        60 * GPS_SCALE,
        GPS_SCALE,
    );
    assert!((111_000..=112_000).contains(&equator));
    assert!((54_000..=58_000).contains(&sixty_degrees));
}

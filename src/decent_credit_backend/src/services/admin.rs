use ic_cdk::export::{Principal, candid::{CandidType, Deserialize}};
use crate::models::{Institution, TokenTrading};
use std::collections::HashMap;

pub struct AdminService {
    institutions: HashMap<Principal, Institution>,
}

impl AdminService {
    pub fn register_institution(&mut self, name: String, full_name: String) -> Principal {
        let id = Principal::new_self_authenticating(&name.as_bytes());
        let institution = Institution {
            id: id.clone(),
            name,
            full_name,
            status: InstitutionStatus::Active,
            join_time: ic_cdk::api::time(),
            last_active: ic_cdk::api::time(),
            api_calls: 0,
            dcc_consumed: 0,
            data_uploads: 0,
            credit_score: CreditScore { score: 80, last_update: ic_cdk::api::time() },
            token_trading: TokenTrading { bought: 0, sold: 0 },
        };
        self.institutions.insert(id.clone(), institution);
        id
    }

    pub fn get_institution(&self, id: Principal) -> Option<Institution> {
        self.institutions.get(&id).cloned()
    }

    pub fn get_all_institutions(&self) -> Vec<Institution> {
        self.institutions.values().cloned().collect()
    }

    pub fn update_status(&mut self, id: Principal, is_active: bool) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.status = if is_active { InstitutionStatus::Active } else { InstitutionStatus::Inactive };
            institution.last_active = ic_cdk::api::time();
        }
    }

    pub fn record_token_trading(&mut self, id: Principal, is_buy: bool, amount: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            if is_buy {
                institution.token_trading.bought += amount;
            } else {
                institution.token_trading.sold += amount;
            }
            institution.last_active = ic_cdk::api::time();
        }
    }
}

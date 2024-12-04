use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use log::{info, debug, warn, error};
use serde::Serialize;
use std::collections::HashMap;
use crate::models::credit::*;
use crate::services::credit_service::CREDIT_SERVICE;



#[query]
pub fn get_risk_assessment(institution_id: Principal, user_did: String) -> Result<RiskAssessment, String> {
    let caller = ic_cdk::caller();
    debug!("Get risk assessment by {} for user {}", caller.to_text(), user_did);

    CREDIT_SERVICE.with(|service| {
        let mut service = service.borrow_mut(); // 改为可变引用
        match service.assess_user_risk(institution_id, &user_did) {
            Ok(assessment) => {
                debug!("Successfully retrieved risk assessment");
                Ok(assessment)
            },
            Err(e) => {
                warn!("Failed to get risk assessment: {}", e);
                Err(e)
            }
        }
    })
}

#[query]
pub async fn query_assessment_reports(institution_id: Principal, days: Option<u64>) -> AssessmentListResponse {
    let caller = ic_cdk::caller();
    debug!("query_assessment_reports {}", institution_id);

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        service.query_assessment_reports(institution_id, days)
    })
}




candid::export_service!();

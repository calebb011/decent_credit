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
    info!("Starting query_assessment_reports for institution: {}", institution_id);
    
    let response = CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        let result = service.query_assessment_reports(institution_id, days);
        
        info!(
            "Query result - Status: {}, Reports count: {}", 
            result.status,
            result.data.len()
        );
        
        if result.data.is_empty() {
            info!("No reports found for institution");
        } else {
            info!("Found {} reports for institution", result.data.len());
            // 可以添加一些报告的基本信息
            for (index, report) in result.data.iter().enumerate() {
                info!(
                    "Report {}: ID: {}, User: {}, Created: {}", 
                    index + 1,
                    report.report_id,
                    report.user_did,
                    report.created_at
                );
            }
        }
        
        result
    });
    
    info!(
        "Completed query_assessment_reports for institution: {}, returned {} reports",
        institution_id,
        response.data.len()
    );
    
    response
}


candid::export_service!();

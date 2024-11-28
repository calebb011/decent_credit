use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use log::{info, debug, warn, error};
use serde::Serialize;
use std::collections::HashMap;
use crate::models::credit::{
    CreateCreditRecordRequest, CreditDeductionRecord,
    RiskAssessment, InstitutionRecordResponse, CreditRecord,
    RecordSubmissionRequest, RecordSubmissionResponse,
    BatchSubmissionRequest, BatchSubmissionResponse,
    RecordQueryParams, GetRecordsResponse,
    RecordStatistics, UploadHistoryParams, UploadHistoryResponse
};
use crate::services::credit_service::CREDIT_SERVICE;






/// 获取记录统计信息
#[query]
pub fn get_record_statistics(institution_id: Option<Principal>) -> Result<RecordStatistics, String> {
    let caller = ic_cdk::caller();
    debug!("Get record statistics by {}", caller.to_text());

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        match service.get_record_statistics(institution_id) {
            Ok(stats) => {
                debug!("Successfully retrieved statistics");
                Ok(stats)
            },
            Err(e) => {
                warn!("Failed to get statistics: {}", e);
                Err(e)
            }
        }
    })
}


/// 创建信用扣分记录
#[update]
pub async fn create_credit_record(request: CreateCreditRecordRequest) -> Result<CreditDeductionRecord, String> {
    let caller = ic_cdk::caller();
    info!("Create credit deduction record by {}", caller.to_text());
    debug!("Deduction points: {}", request.deduction_points);

    CREDIT_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.create_deduction_record(caller, request) {
            Ok(record) => {
                info!("Successfully created deduction record");
                Ok(record)
            },
            Err(e) => {
                error!("Failed to create deduction record: {}", e);
                Err(e)
            }
        }
    })
}

/// 获取信用扣分记录列表
#[query]
pub fn get_credit_records(institution_id: Option<Principal>) -> Vec<CreditDeductionRecord> {
    let caller = ic_cdk::caller();
    debug!("Get credit deduction records by {}", caller.to_text());

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_deduction_records(institution_id)
    })
}

/// 查询机构详细信用记录
#[query]
pub fn query_institution_records(institution_id: Principal, user_did: String) -> Result<InstitutionRecordResponse, String> {
    let caller = ic_cdk::caller();
    debug!("Query institution records by {}", caller.to_text());

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        match service.get_institution_records(institution_id, &user_did) {
            Ok(response) => {
                debug!("Successfully retrieved institution records");
                Ok(response)
            },
            Err(e) => {
                warn!("Failed to get institution records: {}", e);
                Err(e)
            }
        }
    })
}

/// 获取用户风险评估
#[query]
pub fn get_risk_assessment(user_did: String) -> Result<RiskAssessment, String> {
    let caller = ic_cdk::caller();
    debug!("Get risk assessment by {} for user {}", caller.to_text(), user_did);

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        match service.assess_user_risk(&user_did) {
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

candid::export_service!();
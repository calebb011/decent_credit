use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use crate::models::*;
use log::{info, debug, warn, error};  // 替换原来的 log_info
use crate::services::record_service::RECORD_SERVICE;
use crate::models::record::*;
use crate::services::credit_service::CREDIT_SERVICE;



#[update]
pub async fn submit_record(request: RecordSubmissionRequest) -> Result<RecordSubmissionResponse, String> {
    let caller = ic_cdk::caller();
    info!("Submit record by caller: {}", caller.to_text());
    debug!("Record submission details - User DID: {}, Event Date: {}, Record Type: {:?}", 
        request.user_did,
        request.event_date,
        request.record_type
    );

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.submit_record(request) {
            Ok(record_id) => {
                info!("Successfully submitted record: {}", record_id);
                Ok(RecordSubmissionResponse {
                    record_id,
                    status: RecordStatus::Pending,
                    timestamp: ic_cdk::api::time(),
                    reward_amount: None
                })
            },
            Err(e) => {
                error!("Failed to submit record: {:?}", e);  
                Err(format!("提交记录失败: {:?}", e))
            }
        }
    })
}
/// 批量提交记录
#[update]
pub async fn submit_records_batch(request: BatchSubmissionRequest) -> Result<BatchSubmissionResponse, String> {
    let caller = ic_cdk::caller();

    info!("Institution registration attempt by {}", caller.to_text());

    // 批量提交限制检查
    if request.records.is_empty() {
        return Err("没有有效的记录".to_string());
    }
    
    if request.records.len() > 1000 {
        return Err("单次提交不能超过1000条记录".to_string());
    }

    let mut submitted = 0;
    let mut failed = 0;
    let mut record_ids = Vec::new();

    // 遍历处理每条记录
    for record_request in request.records {
        RECORD_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            match service.submit_record(record_request) {
                Ok(record_id) => {
                    submitted += 1;
                    record_ids.push(record_id);
                }
                Err(_) => {
                    failed += 1;
                }
            }
        });
    }

    Ok(BatchSubmissionResponse {
        submitted,
        failed,
        record_ids,
        timestamp: ic_cdk::api::time(),
        status: RecordStatus::Pending,
    })
}




#[query]
pub fn query_records_by_user_did(user_did: String) -> Vec<CreditRecord> {

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.get_record_userId(user_did)
    })
}

/// 按参数查询记录
#[query]
pub fn query_records(params: RecordQueryParams) -> Vec<CreditRecord> {

    RECORD_SERVICE.with(|service| {
        let service = service.borrow();
        service.query_records(params)
    })
}


/// 获取记录统计信息
#[query]
pub fn get_record_statistics(institution_id: Option<Principal>) -> Result<RecordStatistics, String> {
    let caller = ic_cdk::caller();
    debug!("Get record statistics by {}", caller.to_text());

    RECORD_SERVICE.with(|service| {
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

    RECORD_SERVICE.with(|service| {
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

/// 扣减查询代币
#[update]
pub async fn deduct_query_token(institution_id: Principal, user_did: String) -> Result<bool, String> {
    let caller = ic_cdk::caller();
    info!("Deduct query token by {}", caller.to_text());
    debug!("Institution: {}, User DID: {}", institution_id.to_text(), user_did);

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.deduct_query_token(institution_id, user_did) {
            Ok(result) => {
                info!("Successfully deducted query token for institution: {}", institution_id.to_text());
                Ok(result)
            },
            Err(e) => {
                error!("Failed to deduct query token: {}", e);
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

    RECORD_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_deduction_records(institution_id)
    })
}

/// 查询机构某个用户did的详细信用记录
#[update]
pub   fn query_institution_records_list(institution_id: Principal, user_did: String) -> Result<InstitutionRecordResponse, String> {
    debug!("Query institution records by {}", institution_id);

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();  // 获取可变引用
        match service.get_institution_records(institution_id, &user_did) {
            Ok(response) => {
                debug!("Successfully retrieved institution records");
                Ok(response)
            },
            Err(e) => {
                warn!("Failed to get institution records: {}", e);
                Err(e.to_string())
            }
        }
    })
}

/// 查询机构某个用户did的详细信用记录
#[update]
pub   fn query_institution_records_failed_list(institution_id: Principal) -> Result<InstitutionRecordResponse, String> {
    debug!("Query institution records by {}", institution_id);

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();  // 获取可变引用
        match service.get_failed_records(institution_id) {
            Ok(response) => {
                debug!("Successfully retrieved institution records");
                Ok(response)
            },
            Err(e) => {
                warn!("Failed to get institution records: {}", e);
                Err(e.to_string())
            }
        }
    })
}

#[derive(CandidType, Debug)]
pub enum Error {
    // ... 你的错误类型
}
candid::export_service!(); 
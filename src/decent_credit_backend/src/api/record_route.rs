use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;
use crate::models::*;

use crate::services::record_services::{RECORD_SERVICE, Error};
use crate::models::*;



/// 提交单条记录
#[update]
pub async fn submit_record(request: RecordSubmissionRequest) -> Result<RecordSubmissionResponse, String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "Record submission attempt for user: {}", 
        request.user_did
    ));

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.submit_record(request) {
            Ok(record_id) => Ok(RecordSubmissionResponse {
                record_id,
                status: RecordStatus::Pending,
                timestamp: ic_cdk::api::time(),
                reward_amount: None // 奖励金额可以后续添加
            }),
            Err(e) => Err(format!("提交记录失败: {:?}", e))
        }
    })
}

/// 批量提交记录
#[update]
pub async fn submit_records_batch(request: BatchSubmissionRequest) -> Result<BatchSubmissionResponse, String> {
    log_info(format!(
        "Batch submitting {} records", 
        request.records.len()
    ));

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

/// 记录验证与确认
#[update]
pub async fn verify_and_commit(record_id: String) -> Result<bool, String> {
    log_info(format!(
        "Record verification attempt for record: {}", 
        record_id
    ));

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.verify_and_commit(&record_id).await {
            Ok(is_valid) => Ok(is_valid),
            Err(e) => Err(format!("记录验证失败: {:?}", e))
        }
    })
}

// === 记录查询接口 ===

/// 按用户DID查询记录
#[query]
pub fn query_records_by_user_did(user_did: String) -> Vec<CreditRecord> {
    log_info(format!(
        "Querying records for user: {}", 
        user_did
    ));

    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.get_record(user_did)
    })
}

/// 按参数查询记录
#[query]
pub fn query_records(params: RecordQueryParams) -> Vec<CreditRecord> {
    log_info("Querying records with params");

    RECORD_SERVICE.with(|service| {
        let service = service.borrow();
        service.query_records(params)
    })
}

// === 批量验证接口 ===

/// 批量验证记录
#[update]
pub async fn verify_records_batch(record_ids: Vec<String>) -> Result<Vec<(String, bool)>, String> {
    log_info(format!(
        "Batch verifying {} records", 
        record_ids.len()
    ));

    let mut results = Vec::new();

    for record_id in record_ids {
        RECORD_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            match service.verify_and_commit(&record_id).await {
                Ok(is_valid) => {
                    results.push((record_id.clone(), is_valid));
                }
                Err(e) => {
                    results.push((record_id.clone(), false));
                    log_info(format!("Verification failed for record {}: {:?}", record_id, e));
                }
            }
        });
    }

    Ok(results)
}

// === 错误处理 ===
impl From<Error> for String {
    fn from(error: Error) -> Self {
        match error {
            Error::InvalidData(msg) => format!("无效的数据: {}", msg),
            Error::InvalidDID => "无效的DID".to_string(),
            Error::InvalidProof => "无效的证明".to_string(),
            Error::SerializationFailed => "序列化失败".to_string(),
            Error::EncryptionFailed(msg) => format!("加密失败: {}", msg),
            Error::ProofGenerationFailed(msg) => format!("证明生成失败: {}", msg),
            Error::StorageFailed => "存储失败".to_string(),
            Error::RecordNotFound => "记录未找到".to_string(),
            Error::VerificationFailed(msg) => format!("验证失败: {}", msg),
            Error::TokenRewardFailed(msg) => format!("代币奖励失败: {}", msg),
            Error::InitializationError(msg) => format!("初始化错误: {}", msg),
        }
    }
}

// === 初始化函数 ===
#[init]
pub fn init() {
    crate::services::record_services::init_record_service();
}

#[post_upgrade]
pub fn post_upgrade() {
    init();
}


candid::export_service!(); 
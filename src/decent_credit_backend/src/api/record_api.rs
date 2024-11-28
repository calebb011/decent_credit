use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use crate::models::*;
use log::{info, debug, warn, error};  // 替换原来的 log_info

use crate::services::record_service::{RECORD_SERVICE};
use crate::api::record_api::credit::{
    RecordSubmissionRequest, RecordSubmissionResponse,
    BatchSubmissionRequest, BatchSubmissionResponse,
    CreditRecord, RecordQueryParams, RecordStatus
};



/// 提交单条记录
#[update]
pub async fn submit_record(request: RecordSubmissionRequest) -> Result<RecordSubmissionResponse, String> {
    let caller = ic_cdk::caller();
    info!("Institution registration attempt by {}", caller.to_text());
    debug!("Registration details - event_date: {}, ", request.event_date);


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



/// 按用户DID查询记录
#[query]
pub fn query_records_by_user_did(user_did: String) -> Vec<CreditRecord> {


    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.get_record(user_did)
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

// // === 批量验证接口 ===

// /// 记录验证与确认
// #[update]
// pub  fn verify_and_commit(record_id: String) -> Result<bool,Error> {  // 添加 async
//     log_info(format!(
//         "Record verification attempt for record: {}", 
//         record_id
//     ));

//     RECORD_SERVICE.with(|service| {
//         let mut service = service.borrow_mut();
//         service.verify_and_commit(&record_id)
//     })；  // 添加 .await
// }

// /// 批量验证记录
// #[update]
// pub async fn verify_records_batch(record_ids: Vec<String>) -> Result<Vec<(String, bool)>, String> {
//     log_info(format!(
//         "Batch verifying {} records", 
//         record_ids.len()
//     ));

//     let mut results = Vec::new();

//     for record_id in record_ids {
//         // 创建拥有所有权的克隆
//         let record_id_clone = record_id.clone();
        
//         // 修改服务调用方式
//         let result = RECORD_SERVICE.with(|s| {
//             let service = &mut *s.borrow_mut();
//             // 克隆或移动所需数据,避免引用
//             service.verify_and_commit(&record_id_clone)
//         }).await;

//         match result {
//             Ok(is_valid) => {
//                 results.push((record_id.clone(), is_valid));
//             }
//             Err(e) => {
//                 results.push((record_id.clone(), false));
//                 log_info(format!("Verification failed for record {}: {:?}", record_id, e));
//             }
//         }
//     }

//     Ok(results)
// }
#[derive(CandidType, Debug)]
pub enum Error {
    // ... 你的错误类型
}
candid::export_service!(); 
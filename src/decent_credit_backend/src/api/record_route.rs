use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;
use crate::services::record_services::Error as ServiceError;

use crate::models::record::{
    CreditRecord,
    RecordStatus,
    RecordSubmissionRequest,
    RecordSubmissionResponse
};

#[derive(CandidType, Deserialize)]
pub struct GetRecordsResponse {
   pub status: String,
   pub records: Vec<CreditRecord>
}

use crate::services::record_services::{RECORD_SERVICE};
use std::rc::Rc;

#[update]
pub  fn submit_credit_record(request: RecordSubmissionRequest) -> Result<RecordSubmissionResponse, String> {
   log_info(format!("Submitting credit record: {}", request.user_did));

   let record_id = RECORD_SERVICE.with(|service| {
       let mut service = service.borrow_mut();
       service.submit_record(request)
   });

   Ok(RecordSubmissionResponse {
       record_id: "aa".to_string(), 
       status: RecordStatus::Pending,
       timestamp: ic_cdk::api::time(),
       reward_amount: None
   })
}
#[update]
pub async fn get_records_by_did(user_did: String) -> Result<GetRecordsResponse, String> {
    log_info(format!("Getting credit records for did: {}", user_did));

    let records = RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.get_record(user_did)
    });

    Ok(GetRecordsResponse {
        status: "success".to_string(),
        records:records
    })
}
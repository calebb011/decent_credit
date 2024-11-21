use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;

use crate::models::record::{
    RecordStatus,
    RecordSubmissionRequest,
    RecordSubmissionResponse
};

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
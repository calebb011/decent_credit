use candid::{CandidType, Deserialize, Principal};


#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct CreditRecord {
    pub id: String,
    pub institution_id: Principal,
    pub record_type: RecordType,
    pub user_did: String,
    // pub event_date: String,
    pub content: RecordContent, 
    // pub encrypted_content: Vec<u8>,
    // pub proof: Vec<u8>,
    pub canister_id: String,
    pub timestamp: u64,
    pub status: RecordStatus,
    // pub reward_amount: Option<u64>
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordType {
    LoanRecord,
    RepaymentRecord,
    NotificationRecord
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordContent {
    Loan(LoanContent),
    Repayment(RepaymentContent),
    Notification(NotificationContent)
}

// 为 Content 类型添加 PartialEq
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct LoanContent {
    pub amount: u64,
    pub loan_id: String,
    pub term_months: u64,
    pub interest_rate: f64
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)] 
pub struct RepaymentContent {
    pub amount: u64,
    pub loan_id: String,
    pub repayment_date: String
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct NotificationContent {
    pub amount: u64,
    pub days: u64,
    pub period_amount: u64
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordStatus {
    Pending,
    Confirmed,
    Rejected
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct RecordSubmissionRequest {
    pub record_type: RecordType,
    pub user_did: String,
    pub event_date: String,
    pub content: RecordContent
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct RecordSubmissionResponse {
    pub record_id: String,
    pub status: RecordStatus,
    pub timestamp: u64,
    pub reward_amount: Option<u64>
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct RecordQueryParams {
    pub institution_id: Option<Principal>,
    pub user_did: Option<String>,
    pub record_type: Option<RecordType>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<RecordStatus>
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct RecordStatistics {
    pub total_records: u64,
    pub pending_records: u64,
    pub confirmed_records: u64,
    pub rejected_records: u64,
    pub total_rewards: u64
}


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
pub struct RecordData {
    pub amount: u64,
    pub user_id: Vec<u8>,
    pub record_type: u8,
    pub timestamp: u64,
    pub term_months: Option<u64>,
    pub interest_rate: Option<f64>,
    pub loan_id: Option<String>,
    pub days: Option<u64>,
    pub period_amount: Option<u64>,
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





// 数据模型定义
#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct RecordContent {
    amount: f64,
    timestamp: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    term: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    interest_rate: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    original_loan_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    overdue_days: Option<u32>,
}

#[derive(CandidType, Deserialize)]
pub struct RecordSubmissionRequest {
    pub record_type: String,
    pub user_did: String,
    pub content: RecordContent,
}

#[derive(CandidType, Serialize)]
pub struct RecordSubmissionResponse {
    pub record_id: String,
    pub timestamp: u64,
    pub status: String,
}

#[derive(CandidType, Deserialize)]
pub struct BatchSubmissionRequest {
    pub records: Vec<RecordSubmissionRequest>,
}

#[derive(CandidType, Serialize)]
pub struct BatchSubmissionResponse {
    pub submitted: usize,
    pub failed: usize,
    pub record_ids: Vec<String>,
    pub timestamp: u64,
    pub status: String,
}

#[derive(CandidType, Serialize, Clone)]
pub struct CreditRecord {
    pub id: String,
    pub institution_id: Principal,
    pub record_type: String,
    pub content: RecordContent,
    pub status: String,
    pub timestamp: u64,
    pub user_did: String,
    pub canister_id: Principal,
}

#[derive(CandidType, Serialize)]
pub struct GetRecordsResponse {
    pub status: String,
    pub records: Vec<CreditRecord>,
}



// 数据结构定义
#[derive(Debug, Serialize, Deserialize)]
pub struct UploadHistoryParams {
    status: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewResult {
    passed: bool,
    reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadRecord {
    id: String,
    user_did: String,
    institution_id: Principal,
    status: String,
    submitted_at: String,
    review_result: ReviewResult,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadHistoryResponse {
    data: Vec<UploadRecord>,
    total: usize,
}


// === 批量提交相关结构 ===
#[derive(CandidType, Deserialize)]
pub struct BatchSubmissionRequest {
    pub records: Vec<RecordSubmissionRequest>
}

#[derive(CandidType, Deserialize)]
pub struct BatchSubmissionResponse {
    pub submitted: usize,
    pub failed: usize,
    pub record_ids: Vec<String>,
    pub timestamp: u64,
    pub status: RecordStatus
}
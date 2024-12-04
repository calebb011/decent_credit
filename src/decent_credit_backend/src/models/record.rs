use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;


// === 核心记录结构 ===
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub struct CreditRecord {
    pub id: String,                    // 记录ID
    pub institution_id: Principal,      // 机构ID
    pub institution_name: String,      // 机构ID
    pub institution_full_name: String,      // 机构ID
    pub record_type: RecordType,       // 记录类型
    pub user_did: String,              // 用户DID
    pub event_date: String,            // 发生日期
    pub content: RecordContent,        // 具体内容
    pub encrypted_content: Vec<u8>,    // 加密后的内容
    pub proof: Vec<u8>,                // zk-SNARK证明
    pub canister_id: String,           // 存储Canister ID
    pub timestamp: u64,                // 记录时间戳
    pub status: RecordStatus,          // 记录状态
    pub reward_amount: Option<u64>     // 奖励代币数量
}

// === 记录类型和状态枚举 ===
#[derive(CandidType, Deserialize,Serialize, Clone, Debug, PartialEq)]
pub enum RecordType {
    LoanRecord,
    RepaymentRecord,
    NotificationRecord
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub enum RecordStatus {
    Pending,
    Confirmed,
    Rejected
}

// === 记录内容结构 ===
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub enum RecordContent {
    Loan(LoanContent),
    Repayment(RepaymentContent),
    Notification(NotificationContent)
}



// === 上传历史相关结构 ===
#[derive(Debug, Serialize, Deserialize)]
pub struct RecordHistoryParams {
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewResult {
    pub passed: bool,
    pub reason: Option<String>,
}

// === DCC交易相关结构 ===
#[derive(CandidType, Deserialize)]
pub struct DCCTransactionRequest {
    pub dcc_amount: u64,
    pub usdt_amount: f64,
    pub tx_hash: String,
    pub remarks: String,
    pub created_at: u64,  // Add timestamp field
}

#[derive(CandidType, Serialize)]
pub struct BalanceResponse {
    pub dcc: u64,
    pub usdt_value: f64,
}


// === 原始数据结构 ===
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
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

// === API 请求/响应结构 ===
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]  // Added Serialize
pub struct RecordSubmissionRequest {
    pub institution_id: Principal,
    pub record_type: RecordType,
    pub user_did: String,
    pub event_date: String,
    pub content: RecordContent
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub struct RecordSubmissionResponse {
    pub record_id: String,
    pub status: RecordStatus,
    pub timestamp: u64,
    pub reward_amount: Option<u64>
}

// === 批量提交相关结构 ===
#[derive(CandidType, Deserialize)]  // Added Serialize
pub struct BatchSubmissionRequest {
    pub records: Vec<RecordSubmissionRequest>
}

#[derive(CandidType, Deserialize, Serialize)]  // Added Serialize
pub struct BatchSubmissionResponse {
    pub submitted: usize,
    pub failed: usize,
    pub record_ids: Vec<String>,
    pub timestamp: u64,
    pub status: RecordStatus
}

// === 查询相关结构 ===
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct RecordQueryParams {
    pub institution_id: Option<Principal>,
    pub user_did: Option<String>,
    pub record_type: Option<RecordType>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<RecordStatus>
}

#[derive(CandidType, Serialize)]
pub struct GetRecordsResponse {
    pub status: String,
    pub records: Vec<CreditRecord>,
}

// === 统计相关结构 ===
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct RecordStatistics {
    pub total_records: u64,
    pub pending_records: u64,
    pub confirmed_records: u64,
    pub rejected_records: u64,
    pub total_rewards: u64
}



#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadRecord {
    pub id: String,
    pub user_did: String,
    pub institution_id: Principal,
    pub status: String,
    pub submitted_at: String,
    pub review_result: ReviewResult,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordHistoryResponse {
    pub data: Vec<UploadRecord>,
    pub total: usize,
}

// === 信用扣分相关结构 ===
#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct CreditDeductionRecord {
    pub id: String,
    pub record_id: String,
    pub institution_id: Principal,
    pub institution_name: String,
    pub deduction_points: u32,
    pub reason: String,
    pub data_quality_issue: String,
    pub created_at: u64,
    pub operator_id: Principal,
    pub operator_name: String,
}

#[derive(CandidType, Deserialize)]
pub struct CreateCreditRecordRequest {
    pub institution_id: Principal,
    pub deduction_points: u32,
    pub reason: String,
    pub data_quality_issue: String,
}

// === 机构记录相关结构 ===
#[derive(CandidType, Serialize)]
pub struct InstitutionRecordResponse {
    pub institution_id: Principal,
    pub institution_name: String,
    pub user_did: String,
    pub records: Vec<CreditRecord>,
}




#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub struct LoanContent {
    pub amount: u64,           // 金额
    pub loan_id: String,       // 贷款编号
    pub term_months: u64,      // 贷款期限(月)
    pub interest_rate: f64     // 年化利率(%)
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub struct RepaymentContent {
    pub amount: u64,           // 还款金额
    pub loan_id: String,       // 原贷款编号
    pub repayment_date: String // 还款日期
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]  // Added Serialize
pub struct NotificationContent {
    pub amount: u64,           // 通知金额
    pub days: u64,             // 通期天数
    pub period_amount: u64     // 通期金额
}
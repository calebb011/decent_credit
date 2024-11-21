// models/credit.rs
use candid::{CandidType, Deserialize};
use candid::Principal;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreditRecord {
    pub id: String,                    // 记录ID
    pub institution_id: Principal,      // 机构ID
    pub record_type: RecordType,       // 记录类型
    pub user_did: String,              // 用户DID
    pub event_date: String,            // 发生日期
    pub proof: Vec<u8>,                // zk-SNARK证明
    pub encrypted_content: Vec<u8>,    // 加密后的内容
    pub canister_id: String,           // 存储Canister ID
    pub timestamp: u64,                // 记录时间戳
    pub status: RecordStatus,          // 记录状态
    pub reward_amount: Option<u64>,    // 奖励代币数量
    pub content: RecordContent,        // 具体内容
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordType {
    LoanRecord,
    RepaymentRecord, 
    NotificationRecord
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordStatus {
    Pending,
    Confirmed,
    Rejected
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RecordContent {
    Loan(LoanRecord),
    Repayment(RepaymentRecord),
    Notification(NotificationRecord)
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LoanRecord {
    pub amount: u64,           // 金额
    pub loan_id: String,       // 贷款编号
    pub term_months: u64,      // 贷款期限(月)
    pub interest_rate: f64,    // 年化利率(%)
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RepaymentRecord {
    pub amount: u64,           // 还款金额
    pub loan_id: String,       // 原贷款编号
    pub repayment_date: String // 还款日期
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct NotificationRecord {
    pub amount: u64,           // 通知金额
    pub days: u64,             // 通期天数
    pub period_amount: u64,    // 通期金额
}

// API请求/响应结构
#[derive(CandidType, Deserialize)]
pub struct RecordSubmissionRequest {
    pub record_type: RecordType,
    pub user_did: String,
    pub event_date: String,
    pub content: RecordContent
}

#[derive(CandidType, Deserialize)]
pub struct RecordSubmissionResponse {
    pub record_id: String,
    pub status: RecordStatus,
    pub timestamp: u64,
    pub reward_amount: Option<u64>
}

// 记录查询参数
#[derive(CandidType, Deserialize)]
pub struct RecordQueryParams {
    pub institution_id: Option<Principal>,
    pub user_did: Option<String>,
    pub record_type: Option<RecordType>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<RecordStatus>
}
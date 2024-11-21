use candid::{CandidType, Deserialize, Principal};

#[derive(CandidType, Deserialize, Clone)]
pub struct Institution {
    pub id: Principal,
    pub name: String,
    pub full_name: String,
    pub password_hash: String, // 添加密码哈希字段
    pub status: InstitutionStatus,
    pub join_time: u64,
    pub last_active: u64,
    pub api_calls: u64,
    pub dcc_consumed: u64,
    pub data_uploads: u64,
    pub credit_score: CreditScore,
    pub token_trading: TokenTrading,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreditScore {
    pub score: u64,
    pub last_update: u64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TokenTrading {
    pub bought: u64,
    pub sold: u64,
}

#[derive(CandidType, Deserialize, Clone, PartialEq)]
pub enum InstitutionStatus {
    Active,
    Inactive,
}

// 登录相关结构
#[derive(CandidType, Deserialize)]
pub struct LoginRequest {
    pub name: String,
    pub password: String,
}

#[derive(CandidType, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub institution_id: Option<Principal>,
    pub message: String,
}

// 注册请求结构
#[derive(CandidType, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub full_name: String,
    pub password: Option<String>, // 可选密码，如果不提供则使用默认密码
}
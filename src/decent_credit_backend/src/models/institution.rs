use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

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
    // 新增字段
    pub data_service_enabled: bool,      // 数据服务开关
    pub query_price: u64,                // 查询价格(基础单价，单位：分)
    pub reward_share_ratio: u8,          // 奖励分成比例(0-100)
      pub inbound_queries: u64,     // 被其他机构查询次数
      pub outbound_queries: u64,    // 查询其他机构次数
      pub rewards: u64,     
      pub consumption: u64,
      pub balance: u64, 
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

#[derive(CandidType,Serialize, Deserialize, Clone, PartialEq)]
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
    pub full_name:String,
    pub message: String,
}

// 注册请求结构
#[derive(CandidType, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub full_name: String,
    pub password: Option<String>, // 可选密码，如果不提供则使用默认密码
    pub principal: String
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UpdateServiceSettingsRequest {
    pub data_service_enabled: bool,
    pub query_price: u64,
    pub reward_share_ratio: u8,
}


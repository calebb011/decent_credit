use candid::{CandidType, Deserialize};
use candid::Principal;
use serde::Serialize;
use crate::models::institution::*;

// === 统计相关结构 ===

// 基础统计信息结构
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AdminStatistics {
    pub total_institutions: u64,
    pub active_institutions: u64,
    pub total_dcc_consumed: u64,
}

// === 管理员看板相关结构 ===

#[derive(CandidType, Serialize)]
pub struct AdminDashboardData {
    pub institution_stats: InstitutionStats,
    pub data_stats: DataStats,
    pub api_stats: ApiStats,
    pub token_stats: TokenStats,
    pub credit_stats: CreditStats,
    pub system_status: SystemStatus,
}

#[derive(CandidType, Serialize)]
pub struct InstitutionStats {
    pub total_count: u64,
    pub active_count: u64,
    pub today_new_count: u64,
    pub monthly_new_count: u64,
    pub institution_growth_rate: f64,
}

#[derive(CandidType, Serialize)]
pub struct DataStats {
    pub total_records: u64,
    pub today_records: u64,
    pub monthly_records: u64,
    pub growth_rate: f64,
    pub data_distribution: DataDistribution,
}

#[derive(CandidType, Serialize)]
pub struct DataDistribution {
    pub loan_records: u64,
    pub repayment_records: u64,
    pub notification_records: u64,
}

#[derive(CandidType, Serialize)]
pub struct ApiStats {
    pub total_calls: u64,
    pub today_calls: u64,
    pub monthly_calls: u64,
    pub success_rate: f64,
    pub query_stats: QueryStats,
}

#[derive(CandidType, Serialize)]
pub struct QueryStats {
    pub total_queries: u64,
    pub today_queries: u64,
    pub outbound_queries: u64,
    pub inbound_queries: u64,
}

#[derive(CandidType, Serialize)]
pub struct TokenStats {
    pub total_rewards: u64,
    pub total_consumption: u64,
    pub today_rewards: u64,
    pub today_consumption: u64,
    pub monthly_rewards: u64,
    pub monthly_consumption: u64,
    pub total_circulation: u64,
    pub average_daily_consumption: f64,
}

#[derive(CandidType, Serialize)]
pub struct CreditStats {
    pub average_score: f64,
    pub level_distribution: LevelDistribution,
}

#[derive(CandidType, Serialize,Default)]
pub struct LevelDistribution {
    pub aaa_count: u64,
    pub aa_count: u64,
    pub a_count: u64,
    pub bbb_count: u64,
    pub bb_count: u64,
    pub other_count: u64,
}

#[derive(CandidType, Serialize)]
pub struct ScoreTrend {
    pub date: String,
    pub score: f64,
}

// === 机构仪表板相关结构 ===

#[derive(CandidType, Serialize)]
pub struct InstitutionDashboardData {
    pub basic_info: BasicInfo,
    pub submission_stats: SubmissionStats,
    pub usage_stats: InstitutionUsageStats,
    pub token_info: TokenInfo,
    pub credit_info: CreditInfo,
    pub system_status: SystemStatus,
}

#[derive(CandidType, Serialize)]
pub struct BasicInfo {
    pub name: String,
    pub id: String,
    pub status: InstitutionStatus,
    pub join_time: u64,
    pub credit_level: String,
    pub credit_score: u64,
}

#[derive(CandidType, Serialize)]
pub struct SubmissionStats {
    pub today_submissions: u64,
    pub monthly_submissions: u64,
    pub total_submissions: u64,
    pub submission_distribution: DataDistribution,
}

#[derive(CandidType, Serialize)]
pub struct InstitutionUsageStats {
    pub query_others: u64,
    pub queried_by_others: u64,
    pub today_query_others: u64,
    pub today_queried_by_others: u64,
    pub monthly_queries: u64,
    pub total_queries: u64,
    pub api_quota: ApiQuota,
}

#[derive(CandidType, Serialize)]
pub struct ApiQuota {
    pub used: u64,
    pub total: u64,
}

#[derive(CandidType, Serialize)]
pub struct TokenInfo {
    pub balance: u64,
    pub total_spent: u64,
    pub today_spent: u64,
    pub total_reward: u64,
    pub today_reward: u64,
    pub monthly_earned: u64,
    pub monthly_spent: u64,
}

#[derive(CandidType, Serialize)]
pub struct CreditInfo {
    pub credit_score: u64,
    pub credit_level: String,
    pub data_quality_score: u64,
}


#[derive(CandidType, Serialize)]
pub struct SystemStatus {
    pub api_health: bool,
    pub has_announcement: bool,
    pub last_update_time: u64,
    pub system_version: String,
}

// 每日统计数据
#[derive(Default)]
struct DailyStats {
    new_institutions: u64,
    api_calls: u64,
    data_uploads: u64,
    token_rewards: u64,
    token_consumption: u64,
    outbound_queries: u64,
    inbound_queries: u64,
    last_update: u64,
}

// 月度统计数据
#[derive(Default)]
struct MonthlyStats {
    new_institutions: u64,
    api_calls: u64,
    data_uploads: u64,
    token_rewards: u64,
    token_consumption: u64,
    last_update: u64,
}

// === 错误类型 ===

#[derive(CandidType, Serialize, Debug)]
pub enum DashboardError {
    NotFound,
    Unauthorized,
    InvalidData,
    SystemError(String),
}

impl std::fmt::Display for DashboardError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DashboardError::NotFound => write!(f, "数据不存在"),
            DashboardError::Unauthorized => write!(f, "未授权访问"),
            DashboardError::InvalidData => write!(f, "数据无效"),
            DashboardError::SystemError(msg) => write!(f, "系统错误: {}", msg),
        }
    }
}

impl std::error::Error for DashboardError {}
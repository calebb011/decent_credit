// models/credit.rs
use candid::{CandidType, Deserialize};
use candid::Principal;

// === 统计相关结构 ===
#[derive(CandidType, Serialize)]
pub struct DashboardStats {
    pub institution_stats: InstitutionStats,
    pub data_stats: DataStats,
    pub api_stats: ApiStats,
    pub token_stats: TokenStats,
}

#[derive(CandidType, Serialize)]
pub struct InstitutionStats {
    pub total_count: u64,
    pub active_count: u64,
    pub today_new_count: u64,
}

#[derive(CandidType, Serialize)]
pub struct DataStats {
    pub total_records: u64,
    pub today_records: u64,
    pub growth_rate: f64,
}

#[derive(CandidType, Serialize)]
pub struct ApiStats {
    pub total_calls: u64,
    pub today_calls: u64,
    pub success_rate: f64,
}

#[derive(CandidType, Serialize)]
pub struct TokenStats {
    pub total_rewards: u64,
    pub total_consumption: u64,
    pub today_rewards: u64,
    pub today_consumption: u64,
}

#[derive(CandidType, Serialize)]
pub struct AdminStatistics {
    pub total_institutions: u64,
    pub active_institutions: u64,
    pub total_dcc_consumed: u64,
}



// 管理员看板数据
#[derive(CandidType, Serialize)]
pub struct AdminDashboardData {
    pub institution_stats: InstitutionStats,
    pub data_stats: DataStats,
    pub api_stats: ApiStats,
    pub token_stats: TokenStats,
}

#[derive(CandidType, Serialize)]
pub struct InstitutionStats {
    pub total_count: u64,
    pub active_count: u64,
    pub today_new_count: u64,
}

#[derive(CandidType, Serialize)]
pub struct DataStats {
    pub total_records: u64,
    pub today_records: u64,
    pub growth_rate: f64,
}

#[derive(CandidType, Serialize)]
pub struct ApiStats {
    pub total_calls: u64,
    pub today_calls: u64,
    pub success_rate: f64,
}

#[derive(CandidType, Serialize)]
pub struct TokenStats {
    pub total_rewards: u64,
    pub total_consumption: u64,
    pub today_rewards: u64,
    pub today_consumption: u64,
}

// 机构仪表板数据
#[derive(CandidType, Serialize)]
pub struct InstitutionDashboardData {
    pub basic_info: BasicInfo,
    pub submission_stats: SubmissionStats,
    pub usage_stats: UsageStats,
    pub token_info: TokenInfo,
    pub reward_info: RewardInfo,
    pub system_status: SystemStatus,
}

#[derive(CandidType, Serialize)]
pub struct BasicInfo {
    pub name: String,
    pub id: String,
    pub status: String,
    pub join_time: u64,
}

#[derive(CandidType, Serialize)]
pub struct SubmissionStats {
    pub today_submissions: u64,
    pub monthly_submissions: u64,
    pub total_submissions: u64,
}

#[derive(CandidType, Serialize)]
pub struct UsageStats {
    pub today_queries: u64,
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
    pub monthly_earned: u64,
    pub monthly_spent: u64,
}

#[derive(CandidType, Serialize)]
pub struct RewardInfo {
    pub today_reward: u64,
    pub total_reward: u64,
}

#[derive(CandidType, Serialize)]
pub struct SystemStatus {
    pub api_health: bool,
    pub has_announcement: bool,
}

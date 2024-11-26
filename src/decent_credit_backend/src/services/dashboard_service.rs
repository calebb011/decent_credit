use candid::Principal;
use std::cell::RefCell;
use std::collections::HashMap;
use ic_cdk::api::time;

use crate::models::{
    dashboard::*,
    institution::{Institution,InstitutionStatus},
};

thread_local! {
    pub static DASHBOARD_SERVICE: RefCell<DashboardService> = RefCell::new(DashboardService::new());
}

// 每日统计数据
#[derive(Default)]
struct DailyStats {
    new_institutions: u64,
    api_calls: u64,
    data_uploads: u64,
    token_rewards: u64,
    token_consumption: u64,
    last_update: u64,
}

pub struct DashboardService {
    institutions: HashMap<Principal, Institution>,
    daily_stats: DailyStats,
    // 配置值
    api_quota_limit: u64,
}

impl DashboardService {
    pub fn new() -> Self {
        Self {
            institutions: HashMap::new(),
            daily_stats: DailyStats::default(),
            api_quota_limit: 20000,
        }
    }

    /// 获取管理员看板数据
    pub fn get_admin_dashboard(&mut self) -> AdminDashboardData {
        self.check_and_update_stats();

        // 统计机构数据
        let active_institutions = self.institutions
            .values()
            .filter(|inst| inst.status == InstitutionStatus::Active)
            .count() as u64;

        let total_api_calls = self.institutions.values().map(|inst| inst.api_calls).sum();
        let total_uploads = self.institutions.values().map(|inst| inst.data_uploads).sum();
        let total_rewards = self.institutions.values().map(|inst| inst.token_trading.bought).sum();
        let total_consumption = self.institutions.values().map(|inst| inst.token_trading.sold).sum();

        AdminDashboardData {
            institution_stats: InstitutionStats {
                total_count: self.institutions.len() as u64,
                active_count: active_institutions,
                today_new_count: self.daily_stats.new_institutions,
            },
            data_stats: DataStats {
                total_records: total_uploads,
                today_records: self.daily_stats.data_uploads,
                growth_rate: ((self.daily_stats.data_uploads as f64) / (total_uploads as f64) * 100.0).round() / 10.0,
            },
            api_stats: ApiStats {
                total_calls: total_api_calls,
                today_calls: self.daily_stats.api_calls,
                success_rate: 99.8,
            },
            token_stats: TokenStats {
                total_rewards,
                total_consumption,
                today_rewards: self.daily_stats.token_rewards,
                today_consumption: self.daily_stats.token_consumption,
            },
        }
    }

    /// 获取机构仪表板数据
    pub fn get_institution_dashboard(&self, institution_id: Principal) -> Result<InstitutionDashboardData, String> {
        let institution = self.institutions
            .get(&institution_id)
            .ok_or_else(|| "机构不存在".to_string())?
            .clone();

        Ok(InstitutionDashboardData {
            basic_info: BasicInfo {
                name: institution.name,
                id: institution_id.to_text(),
                status: InstitutionStatus::Active,
                join_time: institution.join_time,
            },
            submission_stats: SubmissionStats {
                today_submissions: self.get_today_stat(institution_id, |i| i.data_uploads),
                monthly_submissions: self.get_monthly_stat(institution_id, |i| i.data_uploads),
                total_submissions: institution.data_uploads,
            },
            usage_stats: UsageStats {
                today_queries: self.get_today_stat(institution_id, |i| i.api_calls),
                monthly_queries: self.get_monthly_stat(institution_id, |i| i.api_calls),
                total_queries: institution.api_calls,
                api_quota: ApiQuota {
                    used: institution.api_calls,
                    total: self.api_quota_limit,
                },
            },
            token_info: TokenInfo {
                balance: institution.token_trading.bought.saturating_sub(institution.token_trading.sold),
                monthly_earned: self.get_monthly_stat(institution_id, |i| i.token_trading.bought),
                monthly_spent: self.get_monthly_stat(institution_id, |i| i.token_trading.sold),
            },
            reward_info: RewardInfo {
                today_reward: self.get_today_stat(institution_id, |i| i.token_trading.bought),
                total_reward: institution.token_trading.bought,
            },
            system_status: SystemStatus {
                api_health: true,
                has_announcement: false,
            },
        })
    }

    
    fn check_and_update_stats(&mut self) {
        let now = time();
        let today_start = now - (now % (24 * 60 * 60 * 1_000_000_000));
        
        if self.daily_stats.last_update < today_start {
            // 重置每日统计
            self.daily_stats = DailyStats {
                new_institutions: self.count_today_institutions(),
                api_calls: 0,
                data_uploads: 0,
                token_rewards: 0,
                token_consumption: 0,
                last_update: now,
            };
        }
    }

    fn count_today_institutions(&self) -> u64 {
        let today_start = time() - (time() % (24 * 60 * 60 * 1_000_000_000));
        self.institutions
            .values()
            .filter(|i| i.join_time >= today_start)
            .count() as u64
    }

    fn get_today_stat<F>(&self, id: Principal, f: F) -> u64 
    where F: Fn(&Institution) -> u64 {
        self.institutions
            .get(&id)
            .map(|i| f(i))
            .unwrap_or(0)
    }

    fn get_monthly_stat<F>(&self, id: Principal, f: F) -> u64 
    where F: Fn(&Institution) -> u64 {
        self.institutions
            .get(&id)
            .map(|i| f(i))
            .unwrap_or(0)
    }
}
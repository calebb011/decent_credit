use candid::Principal;
use std::cell::RefCell;
use ic_cdk::api::time;
use crate::utils::error::Error;
use crate::models::{
    record::*,
    dashboard::*,
    institution::{Institution, InstitutionStatus},
};
use crate::services::admin_institution_service::ADMIN_SERVICE;  // 移到顶部
use crate::services::record_service::RECORD_SERVICE;


thread_local! {
    pub static DASHBOARD_SERVICE: RefCell<DashboardService> = RefCell::new(DashboardService::new());
}

pub struct DashboardService {
    daily_stats: DailyStats,
    api_quota_limit: u64,
}

impl DashboardService {
    pub fn new() -> Self {
        Self {
            daily_stats: DailyStats::default(),
            api_quota_limit: 20000,
        }
    }

    /// 获取管理员看板数据
    pub fn get_admin_dashboard(&mut self) -> AdminDashboardData {
        self.check_and_update_stats();

        // 获取所有机构数据
        let institutions = ADMIN_SERVICE.with(|service| {
            service.borrow().get_all_institutions()
        });

        // 计算统计数据
        let active_institutions = institutions.iter()
            .filter(|inst| inst.status == InstitutionStatus::Active)
            .count() as u64;

        let total_api_calls: u64 = institutions.iter()
            .map(|inst| inst.api_calls)
            .sum();

        let total_uploads: u64 = institutions.iter()
            .map(|inst| inst.data_uploads)
            .sum();

        let total_rewards: u64 = institutions.iter()
            .map(|inst| inst.token_trading.bought)
            .sum();

        let total_consumption: u64 = institutions.iter()
            .map(|inst| inst.token_trading.sold)
            .sum();

        AdminDashboardData {
            institution_stats: InstitutionStats {
                total_count: institutions.len() as u64,
                active_count: active_institutions,
                today_new_count: self.daily_stats.new_institutions,
            },
            data_stats: DataStats {
                total_records: total_uploads,
                today_records: self.daily_stats.data_uploads,
                data_distribution: self.calculate_data_distribution(),
            },
            api_stats: ApiStats {
                total_calls: total_api_calls,
                today_calls: self.daily_stats.api_calls,
                success_rate: 99.8,
                query_stats: QueryStats {
                    total_queries: total_api_calls,
                    today_queries: self.daily_stats.api_calls,
                    outbound_queries: self.daily_stats.outbound_queries,
                    inbound_queries: self.daily_stats.inbound_queries,
                },
            },
            token_stats: TokenStats {
                total_rewards,
                total_consumption,
                today_rewards: self.daily_stats.token_rewards,
                today_consumption: self.daily_stats.token_consumption,
                total_circulation: total_rewards.saturating_sub(total_consumption),
                average_daily_consumption: (total_consumption as f64) / 30.0,
            },
            credit_stats: self.calculate_credit_stats(),
            system_status: SystemStatus {
                api_health: true,
                has_announcement: false,
                last_update_time: self.daily_stats.last_update,
                system_version: "1.0.0".to_string(),
            },
        }
    }
     // 添加获取机构每日统计的方法
     fn get_institution_today_stats(&self, institution_id: Principal) -> (u64, u64) {
        let today_start = time() - (time() % (24 * 60 * 60 * 1_000_000_000));
        RECORD_SERVICE.with(|service| {
            let service = service.borrow();
            let records = service.query_records(RecordQueryParams {
                institution_id: Some(institution_id),
                status: None,
                record_type: None,
                user_did: None,
                start_date: today_start.to_string()
            });
            
            let mut outbound = 0;
            let mut inbound = 0;
            for record in records {
                if record.institution_id == institution_id {
                    outbound += 1;
                } else {
                    inbound += 1;
                }
            }
            (outbound, inbound)
        })
    }
    /// 获取机构仪表板数据
    pub fn get_institution_dashboard(&self, institution_id: Principal) -> Result<InstitutionDashboardData, String> {
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(institution_id)
                .ok_or_else(|| "机构不存在".to_string())
        })?;
        let (today_outbound, today_inbound) = self.get_institution_today_stats(institution_id);

        Ok(InstitutionDashboardData {
            basic_info: BasicInfo {
                name: institution.name.clone(),
                id: institution_id.to_text(),
                status: institution.status.clone(),
                join_time: institution.join_time,
                credit_level: self.get_credit_level(&institution),
                credit_score: self.calculate_institution_credit_score(&institution),
            },
            submission_stats: SubmissionStats {
                today_submissions: self.get_today_stat(institution_id),
                total_submissions: institution.data_uploads,
                submission_distribution: self.get_institution_data_distribution(&institution),
            },
            usage_stats: InstitutionUsageStats {
                query_others: institution.outbound_queries,
                queried_by_others: institution.inbound_queries,
                today_query_others: today_outbound,           // 使用机构今日统计 
                today_queried_by_others: today_inbound,       // 使用机构今日统计
                total_queries: institution.api_calls,
                api_quota: ApiQuota {
                    used: institution.api_calls,
                    total: self.api_quota_limit,
                },
            },
            token_info: TokenInfo {
                balance: institution.token_trading.bought.saturating_sub(institution.token_trading.sold),
                total_spent: institution.token_trading.sold,
                today_spent: self.daily_stats.token_consumption,
                total_reward: institution.token_trading.bought,
                today_reward: self.daily_stats.token_rewards,
            },
            credit_info: CreditInfo {
                credit_score: self.calculate_institution_credit_score(&institution),
                credit_level: self.get_credit_level(&institution),
                data_quality_score: self.calculate_data_quality_score(&institution),
            },
            system_status: SystemStatus {
                api_health: true,
                has_announcement: false,
                last_update_time: self.daily_stats.last_update,
                system_version: "1.0.0".to_string(),
            },
        })
    }

    fn get_today_stat(&self, id: Principal) -> u64 {
        let today_start = time() - (time() % (24 * 60 * 60 * 1_000_000_000));
        RECORD_SERVICE.with(|service| {
            let service = service.borrow();
            let params = RecordQueryParams {
                institution_id: Some(id),
                status: None,
                record_type: None,
                user_did: None,
                start_date: today_start.to_string()
            };
            service.query_records(params).len() as u64
        })
    }



    fn calculate_data_distribution(&self) -> DataDistribution {
        let records = RECORD_SERVICE.with(|service| {
            let service = service.borrow();
            let params = RecordQueryParams {
                institution_id: None,
                status: Some(RecordStatus::Confirmed),
                record_type: None,
                user_did: None,
                start_date: "".to_string(),
            };
            service.query_records(params)
        });

        let mut distribution = DataDistribution {
            loan_records: 0,
            repayment_records: 0,
            notification_records: 0,
        };

        for record in records {
            match record.record_type {
                RecordType::LoanRecord => distribution.loan_records += 1,
                RecordType::RepaymentRecord => distribution.repayment_records += 1,
                RecordType::NotificationRecord => distribution.notification_records += 1,
            }
        }

        distribution
    }

    fn calculate_credit_stats(&self) -> CreditStats {
        let institutions = ADMIN_SERVICE.with(|service| {
            service.borrow().get_all_institutions()
        });

        let mut total_score = 0f64;
        let mut level_distribution = LevelDistribution::default();
        
        for inst in &institutions {
            total_score += inst.credit_score.score as f64;
            match inst.credit_score.score {
                90..=100 => level_distribution.aaa_count += 1,
                80..=89 => level_distribution.aa_count += 1, 
                70..=79 => level_distribution.a_count += 1,
                60..=69 => level_distribution.bbb_count += 1,
                50..=59 => level_distribution.bb_count += 1,
                _ => level_distribution.other_count += 1,
            }
        }

        let average_score = if !institutions.is_empty() {
            total_score / institutions.len() as f64
        } else {
            0.0
        };



        CreditStats {
            average_score,
            level_distribution,
        }
    }

    fn get_credit_level(&self, institution: &Institution) -> String {
        match institution.credit_score.score {
            90..=100 => "AAA",
            80..=89 => "AA",
            70..=79 => "A", 
            60..=69 => "BBB",
            50..=59 => "BB",
            _ => "C",
        }.to_string()
    }

    fn calculate_institution_credit_score(&self, institution: &Institution) -> u64 {
        institution.credit_score.score
    }



    fn calculate_data_quality_score(&self, institution: &Institution) -> u64 {
        // 统计机构的记录情况
        let records = RECORD_SERVICE.with(|service| {
            let service = service.borrow();
            let params = RecordQueryParams {
                institution_id: Some(institution.id),
                status: None,
                record_type: None,
                user_did: None,
                start_date: "".to_string(),
            };
            service.query_records(params)
        });

        let total_records = records.len();
        if total_records == 0 {
            return 100; // 暂无数据时返回满分
        }

        // 计算验证通过的记录比例
        let confirmed_records = records.iter()
            .filter(|r| r.status == RecordStatus::Confirmed)
            .count();

        ((confirmed_records as f64 / total_records as f64) * 100.0) as u64
    }

    fn get_institution_data_distribution(&self, institution: &Institution) -> DataDistribution {
        let records = RECORD_SERVICE.with(|service| {
            let service = service.borrow();
            let params = RecordQueryParams {
                institution_id: Some(institution.id),
                status: Some(RecordStatus::Confirmed),
                record_type: None,
                user_did: None,
                start_date: "".to_string(),
            };
            service.query_records(params)
        });

        let mut distribution = DataDistribution {
            loan_records: 0,
            repayment_records: 0, 
            notification_records: 0,
        };

        for record in records {
            match record.record_type {
                RecordType::LoanRecord => distribution.loan_records += 1,
                RecordType::RepaymentRecord => distribution.repayment_records += 1,
                RecordType::NotificationRecord => distribution.notification_records += 1, 
            }
        }

        distribution
    }

    fn check_and_update_stats(&mut self) {
        let now = time();
        self.update_daily_stats(now);
    }

    fn update_daily_stats(&mut self, now: u64) {
        let today_start = now - (now % (24 * 60 * 60 * 1_000_000_000));
        
        if self.daily_stats.last_update < today_start {
            self.daily_stats = DailyStats {
                new_institutions: self.count_today_institutions(),
                api_calls: 0,
                data_uploads: 0,
                token_rewards: 0,
                token_consumption: 0,
                outbound_queries: 0,
                inbound_queries: 0,
                last_update: now,
            };
        }
    }

    fn count_today_institutions(&self) -> u64 {
        let today_start = time() - (time() % (24 * 60 * 60 * 1_000_000_000));
        ADMIN_SERVICE.with(|service| {
            service.borrow().get_all_institutions()
                .into_iter()
                .filter(|i| i.join_time >= today_start)
                .count() as u64
        })
    }

 
    pub fn update_token_stats(&mut self, rewards: u64, consumption: u64) {
        self.daily_stats.token_rewards += rewards;
        self.daily_stats.token_consumption += consumption;
    }
}
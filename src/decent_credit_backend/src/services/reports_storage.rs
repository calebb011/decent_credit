use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use log::{info, warn};

use crate::models::credit::{RiskAssessmentReport};

#[derive(Default)]
pub struct ReportsStorage {
    // HashMap<机构ID, HashMap<用户DID, Vec<报告>>>
    reports: HashMap<Principal, HashMap<String, Vec<RiskAssessmentReport>>>,
}

thread_local! {
    pub static REPORTS_STORAGE: RefCell<ReportsStorage> = RefCell::new(ReportsStorage::default());
}

impl ReportsStorage {
    // 存储新的报告
    pub fn store_report(&mut self, institution_id: Principal, user_did: &str, report: RiskAssessmentReport) {
        let institution_reports = self.reports
            .entry(institution_id)
            .or_insert_with(HashMap::new);
            
        let user_reports = institution_reports
            .entry(user_did.to_string())
            .or_insert_with(Vec::new);

        user_reports.push(report);
        
        // 保持最新的报告在前面
        user_reports.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        // 限制每个用户的报告数量，只保留最近的50条
        const MAX_REPORTS_PER_USER: usize = 50;
        if user_reports.len() > MAX_REPORTS_PER_USER {
            user_reports.truncate(MAX_REPORTS_PER_USER);
        }

        info!(
            "Stored new report for institution {} and user {}", 
            institution_id.to_text(), user_did
        );
    }

    // 查询报告，支持按时间范围筛选
    pub fn query_reports(
        &self, 
        institution_id: Principal,
        days: Option<u64>
    ) -> Vec<RiskAssessmentReport> {
        let mut all_reports = Vec::new();
        
        // 获取机构的所有报告
        if let Some(institution_reports) = self.reports.get(&institution_id) {
            // 获取当前时间
            let current_time = time();
            
            // 遍历所有用户的报告
            for user_reports in institution_reports.values() {
                for report in user_reports {
                    // 如果指定了天数，则只返回指定天数内的报告
                    if let Some(days) = days {
                        let time_threshold = current_time - (days * 24 * 60 * 60 * 1_000_000_000);
                        if report.created_at >= time_threshold {
                            all_reports.push(report.clone());
                        }
                    } else {
                        all_reports.push(report.clone());
                    }
                }
            }
        }

        // 按时间倒序排序
        all_reports.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        
        info!(
            "Query returned {} reports for institution {}", 
            all_reports.len(), 
            institution_id.to_text()
        );

        all_reports
    }

    // 获取指定用户的最新报告
    pub fn get_latest_report(
        &self,
        institution_id: Principal,
        user_did: &str
    ) -> Option<RiskAssessmentReport> {
        self.reports
            .get(&institution_id)
            .and_then(|institution_reports| institution_reports.get(user_did))
            .and_then(|user_reports| user_reports.first())
            .cloned()
    }

    // 清理旧报告
    pub fn cleanup_old_reports(&mut self, days: u64) -> usize {
        let mut total_removed = 0;
        let threshold = time() - (days * 24 * 60 * 60 * 1_000_000_000);

        // 使用 retain 方法保留符合条件的报告
        for institution_reports in self.reports.values_mut() {
            for user_reports in institution_reports.values_mut() {
                let original_len = user_reports.len();
                user_reports.retain(|report| report.created_at >= threshold);
                total_removed += original_len - user_reports.len();
            }
        }

        // 清理空的用户记录和机构记录
        self.cleanup_empty_entries();

        info!("Removed {} old reports", total_removed);
        total_removed
    }

    // 清理空的记录条目
    fn cleanup_empty_entries(&mut self) {
        // 清理空的用户记录
        for institution_reports in self.reports.values_mut() {
            institution_reports.retain(|_, reports| !reports.is_empty());
        }

        // 清理空的机构记录
        self.reports.retain(|_, institution_reports| !institution_reports.is_empty());
    }

    // 获取存储统计信息
    pub fn get_storage_stats(&self) -> StorageStats {
        let mut total_reports = 0;
        let mut institution_count = self.reports.len();
        let mut user_count = 0;

        for institution_reports in self.reports.values() {
            user_count += institution_reports.len();
            for user_reports in institution_reports.values() {
                total_reports += user_reports.len();
            }
        }

        StorageStats {
            total_reports,
            institution_count,
            user_count
        }
    }
}

#[derive(CandidType, Deserialize, Debug)]
pub struct StorageStats {
    pub total_reports: usize,
    pub institution_count: usize,
    pub user_count: usize,
}
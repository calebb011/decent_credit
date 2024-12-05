use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use std::borrow::Borrow;
use log::{info, warn};
use crate::models::credit::*;
use crate::services::storage_service::*;
use crate::services::crypto_service::*;

#[derive(CandidType, Deserialize, Default, Clone)]
pub struct ReportsStorage {
    reports: HashMap<Principal, Vec<RiskAssessmentReport>>,
}

thread_local! {
    pub static REPORTS_STORAGE: RefCell<ReportsStorage> = RefCell::new(ReportsStorage::default());
}

impl ReportsStorage {
    pub fn save_state(&self) -> Result<(), String> {
        match ic_cdk::storage::stable_save((&*self,)) {
            Ok(_) => {
                info!("Successfully saved ReportsStorage state");
                Ok(())
            },
            Err(e) => {
                warn!("Failed to save ReportsStorage state: {:?}", e);
                Err(format!("Failed to save state: {:?}", e))
            }
        }
    }

    pub fn store_report(&mut self, institution_id: Principal, report: RiskAssessmentReport) {
        info!("Starting to store report for institution: {}", institution_id.to_text());
    
        // 先存本地
        let report_clone = report.clone();
        let reports = self.reports.entry(institution_id).or_insert_with(Vec::new);
        reports.push(report_clone);
    
        info!("Added report to local storage, current count: {}", reports.len());
    
        // 序列化报告
        match candid::encode_one(&report) {
            Ok(report_bytes) => {
                // 使用专门的报告存储方法
                match with_storage_service(|service| {
                    // 1. 存储报告数据
                    let storage_id = service.store_report_data(report_bytes.clone())?;
                    
                    // 2. 存储到链上
                    service.store_report_on_chain(
                        report.report_id.clone(),
                        storage_id.clone(),
                        report_bytes.clone()
                    )?;
                    
                    Ok::<_, String>(storage_id)
                }) {
                    Ok(storage_id) => {
                        info!(
                            "Successfully stored report. Key: REPORT-{}, Storage ID: {}", 
                            report.report_id,
                            storage_id
                        );
                    }
                    Err(e) => warn!("Failed to store report: {:?}", e),
                }
            },
            Err(e) => warn!("Failed to serialize report: {:?}", e),
        }
    
        info!(
            "Completed storing report for institution {}, report ID: {}", 
            institution_id.to_text(),
            report.report_id
        );
    }

    pub fn query_reports(&self, institution_id: Principal) -> Vec<RiskAssessmentReport> {
        info!("Starting query reports for institution: {}", institution_id.to_text());
        
        let mut verified_reports = Vec::new();
        
        // 使用新的方法获取所有链上数据
        with_storage_service(|service| {
            info!("Searching chain data records...");
            
            // 获取所有链上数据
            let chain_data = service.get_all_chain_data();
            
            for (record_key, storage_id, _) in chain_data {
                info!("Checking record: {}", record_key);
                
                // 从存储服务获取数据
                if let Some(data) = service.get_data(&storage_id) {
                    match candid::decode_one::<RiskAssessmentReport>(data) {
                        Ok(report) => {
                            // 检查是否是目标机构的报告
                            // if report.institution_id == institution_id {
                                info!("Found matching report: {}", report.report_id);
                                verified_reports.push(report);
                            // }
                        },
                        Err(e) => warn!("Failed to decode report data: {:?}", e),
                    }
                } else {
                    warn!("No data found for storage ID: {}", storage_id);
                }
            }
        });
    
        info!(
            "Retrieved {} verified reports for institution {}", 
            verified_reports.len(),
            institution_id.to_text()
        );
        
        verified_reports
    }
    fn print_storage_status(&self) {
        info!("=== Storage Status ===");
        info!("Total institutions: {}", self.reports.len());
        for (institution_id, reports) in &self.reports {
            info!(
                "Institution {}: {} reports", 
                institution_id.to_text(), 
                reports.len()
            );
        }
        info!("=== End Storage Status ===");
    }

    pub fn get_latest_report(&self, institution_id: Principal) -> Option<RiskAssessmentReport> {
        self.reports
            .get(&institution_id)
            .and_then(|reports| reports.last())
            .cloned()
    }
}

pub fn init_reports_storage() {
    REPORTS_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.print_storage_status();
    });
}

pub fn with_reports_storage<F, R>(f: F) -> R 
where
    F: FnOnce(&mut ReportsStorage) -> R 
{
    REPORTS_STORAGE.with(|storage| {
        f(&mut storage.borrow_mut())
    })
}
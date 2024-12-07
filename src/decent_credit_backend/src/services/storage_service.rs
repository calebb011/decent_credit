use std::cell::RefCell;
use std::collections::HashMap;
use candid::Principal;
use ic_cdk::api::time;
use log::{info, debug, warn, error};
use crate::models::credit::*;
use crate::utils::error::Error;

thread_local! {
    static STORAGE_SERVICE: RefCell<StorageService> = RefCell::new(StorageService::new());
}

pub struct StorageService {
    stored_data: HashMap<String, Vec<u8>>,
    chain_data: HashMap<String, (String, Vec<u8>)>,
    reports: Vec<(Principal, RiskAssessmentReport)>,

}

impl StorageService {
    pub fn new() -> Self {
        Self {
            stored_data: HashMap::new(),
            chain_data: HashMap::new(),
            reports: Vec::new(),
        }
    }
    // 添加一个新的方法来获取所有链上数据
pub fn get_all_chain_data(&self) -> Vec<(String, String, Vec<u8>)> {
    self.chain_data
        .iter()
        .map(|(record_id, (storage_id, proof))| {
            (record_id.clone(), storage_id.clone(), proof.clone())
        })
        .collect()
}
    // 专门用于存储报告的方法
    pub fn store_report_data(&mut self, data: Vec<u8>) -> Result<String, String> {
        let id = format!("report-storage-{}", time());
        self.stored_data.insert(id.clone(), data);
        debug!("Stored report data with ID: {}", id);
        Ok(id)
    }

    // 专门用于链上存储报告的方法
    pub fn store_report_on_chain(&mut self, report_id: String, storage_id: String, data: Vec<u8>) -> Result<(), String> {
        let key = format!("REPORT-{}", report_id);
        self.chain_data.insert(key.clone(), (storage_id.clone(), data));
        debug!("Stored report chain data for report: {}, storage: {}", report_id, storage_id);
        Ok(())
    }
    pub fn store_data(&mut self, data: Vec<u8>) -> Result<String, String> {
        let id = format!("storage-{}", time());
        self.stored_data.insert(id.clone(), data);
        debug!("Stored data with ID: {}", id);
        Ok(id)
    }

    pub fn store_on_chain(&mut self, record_id: String, storage_id: String, proof: Vec<u8>) -> Result<(), String> {
        self.chain_data.insert(record_id.clone(), (storage_id.clone(), proof));
        debug!("Stored chain data for record: {}, storage: {}", record_id, storage_id);
        Ok(())
    }

    pub fn get_chain_data(&self, record_id: &str) -> Option<(String, Vec<u8>)> {
        self.chain_data.get(record_id).map(|(id, proof)| {
            (id.clone(), proof.clone())
        })
    }

    pub fn get_data(&self, storage_id: &str) -> Option<&Vec<u8>> {
        self.stored_data.get(storage_id)
    }
    // 清空所有数据的方法
    pub fn clear_all_data(&mut self) {
        let stored_count = self.stored_data.len();
        let chain_count = self.chain_data.len();
        
        self.stored_data.clear();
        self.chain_data.clear();
        
        info!("Storage cleared - Removed {} stored records and {} chain records", 
              stored_count, chain_count);
    }
     // ID生成方法
     fn generate_record_ids(&self, institution_id: &Principal, report: &RiskAssessmentReport) -> (String, String) {
        // 存储ID: storage-timestamp
        let storage_id = format!("storage-{}", report.created_at);
        
        // 记录ID: REC-{institution_id}-{report_id}
        let record_id = format!("REC-{}-{}", institution_id.to_text(), report.report_id);
        
        info!("Generated IDs:");
        info!("  Record ID: {}", record_id);
        info!("  Storage ID: {}", storage_id);
        
        (record_id, storage_id)
    }
    
// 新增辅助函数用于调试
pub fn print_all_records(&self) {
    info!("\n=== All Storage Records ===");
    info!("Total chain_data records: {}", self.chain_data.len());
    info!("Total stored_data records: {}", self.stored_data.len());
    
    if self.chain_data.is_empty() {
        info!("No records found.");
        return;
    }
    
    for (record_id, (storage_id, _)) in &self.chain_data {
        info!("\nRecord ID: {}", record_id);
        info!("Storage ID: {}", storage_id);
        
        if let Some(data) = self.stored_data.get(storage_id) {
            match candid::decode_one::<RiskAssessmentReport>(data) {
                Ok(report) => {
                    info!("Report details:");
                    info!("  Institution: {}", report.institution_id.to_text());
                    info!("  Report ID: {}", report.report_id);
                    info!("  User: {}", report.user_did);
                    info!("  Created at: {}", report.created_at);
                },
                Err(e) => warn!("  Failed to decode report: {:?}", e),
            }
        } else {
            warn!("  No data found for this storage ID");
        }
    }
    info!("\n=== End Records ===\n");
}

pub fn store_report(&mut self, institution_id: Principal, report: RiskAssessmentReport) -> Result<(), String> {
    info!("Storing report:");
    info!("  Institution: {}", institution_id.to_text());
    info!("  Report ID: {}", report.report_id);
    
    self.reports.push((institution_id, report));
    info!("Total reports: {}", self.reports.len());
    
    Ok(())
}

pub fn get_institution_reports(&self, institution_id: Principal) -> Vec<RiskAssessmentReport> {
    info!("\n=== Starting Report Search ===");
    info!("Institution ID: {}", institution_id.to_text());
    info!("Total reports: {}", self.reports.len());

    let reports: Vec<RiskAssessmentReport> = self.reports
        .iter()
        .filter(|(id, _)| *id == institution_id)
        .map(|(_, report)| report.clone())
        .collect();

    info!("Found {} matching reports", reports.len());
    reports
}
    // 可以添加一个打印当前所有记录的调试方法
    pub fn debug_print_records(&self) {
        info!("=== Current Records ===");
        for (record_id, (storage_id, _)) in &self.chain_data {
            info!("Record: {}, Storage: {}", record_id, storage_id);
        }
        info!("=== End Records ===");
    }
    // 可以添加一个按用户ID获取报告的方法
    pub fn get_user_reports(&self, user_did: &str) -> Vec<RiskAssessmentReport> {
        info!("Getting reports for user: {}", user_did);
        
        let reports: Vec<RiskAssessmentReport> = self.chain_data
            .iter()
            .filter_map(|(record_id, (storage_id, _))| {
                if record_id.contains(user_did) {
                    if let Some(data) = self.stored_data.get(storage_id) {
                        match candid::decode_one::<RiskAssessmentReport>(data) {
                            Ok(report) => Some(report),
                            Err(e) => {
                                warn!("Failed to decode report: {:?}", e);
                                None
                            }
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect();

        info!("Found {} reports for user {}", reports.len(), user_did);
        reports
    }
    // 清理过期数据
    pub fn cleanup_old_data(&mut self, before_time: u64) -> usize {
        let mut removed = 0;
        
        // 清理过期的链上数据
        let mut to_remove = Vec::new();
        for (record_id, (storage_id, _)) in &self.chain_data {
            if let Some(data) = self.stored_data.get(storage_id) {
                if let Ok(report) = candid::decode_one::<RiskAssessmentReport>(data) {
                    if report.created_at < before_time {
                        to_remove.push(record_id.clone());
                        removed += 1;
                    }
                }
            }
        }

        // 移除过期数据
        for record_id in to_remove {
            if let Some((storage_id, _)) = self.chain_data.remove(&record_id) {
                self.stored_data.remove(&storage_id);
                debug!("Removed old data for record: {}", record_id);
            }
        }

        info!("Cleaned up {} old records", removed);
        removed
    }
}

// Helper function for storage service access
pub fn with_storage_service<F, R>(f: F) -> R 
where
    F: FnOnce(&mut StorageService) -> R 
{
    STORAGE_SERVICE.with(|service| {
        f(&mut service.borrow_mut())
    })
}



// 添加新的便捷调试函数
pub fn print_storage_status() {
    with_storage_service(|service| {
        info!("\n=== Storage Status ===");
        info!("Total records: {}", service.chain_data.len());
        info!("Total stored data: {}", service.stored_data.len());
        
        info!("\nRecord Details:");
        for (record_id, (storage_id, _)) in &service.chain_data {
            info!("Record: {} -> Storage: {}", record_id, storage_id);
            if let Some(data) = service.stored_data.get(storage_id) {
                match candid::decode_one::<RiskAssessmentReport>(data) {
                    Ok(report) => {
                        info!("  Institution: {}", report.institution_id.to_text());
                        info!("  User: {}", report.user_did);
                        info!("  Report ID: {}", report.report_id);
                    },
                    Err(e) => warn!("  Failed to decode: {:?}", e),
                }
            }
        }
        info!("=== End Status ===\n");
    });
}


use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use std::borrow::Borrow;
use log::{info, warn, error};
use crate::models::credit::*;
use crate::services::storage_service::*;
use crate::services::crypto_service::*;

#[derive(CandidType, Deserialize, Default, Clone)]
pub struct ReportsStorage {
    reports: HashMap<Principal, Vec<RiskAssessmentReport>>,
    version: u32,  // 添加版本控制
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
                error!("Failed to save ReportsStorage state: {:?}", e);
                Err(format!("Failed to save state: {:?}", e))
            }
        }
    }

    // 辅助函数：计算数据哈希
    fn calculate_hash(data: &[u8]) -> Vec<u8> {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data);
        hasher.finalize().to_vec()
    }

    // 辅助函数：验证数据完整性
    fn verify_data_integrity(&self, original: &[u8], stored: &[u8]) -> bool {
        let original_hash = Self::calculate_hash(original);
        let stored_hash = Self::calculate_hash(stored);
        original_hash == stored_hash
    }

    pub fn store_report(&mut self, institution_id: Principal, report: RiskAssessmentReport) -> Result<String, String> {
        info!("Starting to store report for institution: {}", institution_id.to_text());
        
        // 本地存储
        let report_clone = report.clone();
        let reports = self.reports.entry(institution_id).or_insert_with(Vec::new);
        reports.push(report_clone.clone());
        
        info!("Added report to local storage, current count: {}", reports.len());
        
        // 序列化报告
        match candid::encode_one(&report) {
            Ok(report_bytes) => {
                info!("Original data hash: {:?}", Self::calculate_hash(&report_bytes));
                
                // 使用存储服务
                match with_storage_service(|service| {
                    // 1. 存储报告数据
                    let storage_id = service.store_report_data(report_bytes.clone())?;
                    
                    // 验证存储的数据
                    if let Some(stored_data) = service.get_data(&storage_id) {
                        if !self.verify_data_integrity(&report_bytes, &stored_data) {
                            return Err("Data integrity check failed after storage".to_string());
                        }
                        info!("Data integrity verified after storage");
                    }
                    
                    // 2. 存储到链上
                    service.store_report_on_chain(
                        report.report_id.clone(),
                        storage_id.clone(),
                        report_bytes
                    )?;
                    
                    Ok::<_, String>(storage_id)
                }) {
                    Ok(storage_id) => {
                        info!(
                            "Successfully stored report. Key: REPORT-{}, Storage ID: {}", 
                            report.report_id,
                            storage_id
                        );
                        Ok(storage_id)
                    }
                    Err(e) => {
                        error!("Failed to store report: {:?}", e);
                        Err(format!("Storage service error: {}", e))
                    }
                }
            },
            Err(e) => {
                error!("Failed to serialize report: {:?}", e);
                Err(format!("Serialization error: {}", e))
            }
        }
    }
    pub fn query_reports(&self, institution_id: Principal) -> Vec<RiskAssessmentReport> {
        info!("Starting query reports for institution: {}", institution_id.to_text());
        
        let mut all_reports = Vec::new();
        
        // 1. 从本地存储获取
        if let Some(local_reports) = self.reports.get(&institution_id) {
            all_reports.extend(local_reports.clone());
            info!("Found {} reports in local storage", local_reports.len());
        }
        
        // 2. 从链上获取
        with_storage_service(|service| {
            info!("Searching chain data records...");
            let chain_data = service.get_all_chain_data();
            
            for (record_key, storage_id, raw_data) in chain_data {
                info!("Processing chain record: {}, storage_id: {}", record_key, storage_id);
                
                // 直接使用原始数据进行解码
                match candid::decode_one::<RiskAssessmentReport>(&raw_data) {
                    Ok(report) => {
                        if report.institution_id == institution_id {
                            // 检查是否已存在此报告
                            if !all_reports.iter().any(|r| r.report_id == report.report_id) {
                                info!("Found new report {} for institution", report.report_id);
                                all_reports.push(report);
                            }
                        }
                    },
                    Err(e) => {
                        // 尝试从存储服务获取数据
                        if let Some(data) = service.get_data(&storage_id) {
                            match candid::decode_one::<RiskAssessmentReport>(data) {
                                Ok(report) => {
                                    if report.institution_id == institution_id {
                                        if !all_reports.iter().any(|r| r.report_id == report.report_id) {
                                            info!("Found new report {} using storage_id", report.report_id);
                                            all_reports.push(report);
                                        }
                                    }
                                },
                                Err(e2) => {
                                    error!("Failed to decode both raw data and stored data for record {}", record_key);
                                    error!("Raw data error: {:?}", e);
                                    error!("Stored data error: {:?}", e2);
                                    
                                    // 打印数据信息以便调试
                                    error!("Raw data length: {}", raw_data.len());
                                    if raw_data.len() >= 32 {
                                        error!("Raw data first 32 bytes: {:?}", &raw_data[..32]);
                                    }
                                    
                                    if let Some(stored_data) = service.get_data(&storage_id) {
                                        error!("Stored data length: {}", stored_data.len());
                                        if stored_data.len() >= 32 {
                                            error!("Stored data first 32 bytes: {:?}", &stored_data[..32]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    
        info!(
            "Retrieved total {} reports for institution {}", 
            all_reports.len(),
            institution_id.to_text()
        );
        
        all_reports
    }

    pub fn get_latest_report(&self, institution_id: Principal) -> Option<RiskAssessmentReport> {
        self.reports
            .get(&institution_id)
            .and_then(|reports| reports.last())
            .cloned()
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
        info!("Version: {}", self.version);
        info!("=== End Storage Status ===");
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
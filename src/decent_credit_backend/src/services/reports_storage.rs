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
   stored_data: HashMap<String, Vec<u8>>,
   chain_data: HashMap<String, (String, Vec<u8>)>,
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

   // 专门用于存储报告的方法
   fn store_report_data(&mut self, data: Vec<u8>) -> Result<String, String> {
       let id = format!("report-storage-{}", time());
       self.stored_data.insert(id.clone(), data);
       info!("Stored report data with ID: {}", id);
       Ok(id)
   }

   // 专门用于链上存储报告的方法
   fn store_report_on_chain(&mut self, report_id: String, storage_id: String, data: Vec<u8>) -> Result<(), String> {
       let key = format!("REPORT-{}", report_id);
       self.chain_data.insert(key.clone(), (storage_id.clone(), data));
       info!("Stored report chain data for report: {}, storage: {}", report_id, storage_id);
       Ok(())
   }

   fn get_all_chain_data(&self) -> Vec<(String, String, Vec<u8>)> {
       self.chain_data
           .iter()
           .map(|(record_id, (storage_id, data))| {
               (record_id.clone(), storage_id.clone(), data.clone())
           })
           .collect()
   }

   pub fn store_report(&mut self, institution_id: Principal, report: RiskAssessmentReport) -> Result<String, String> {
       info!("Starting to store report for institution: {}", institution_id.to_text());
       
       // 序列化报告数据
       let report_bytes = candid::encode_one(&report)
           .map_err(|e| format!("Failed to serialize report: {}", e))?;
       
       // 本地存储
       let reports = self.reports.entry(institution_id).or_insert_with(Vec::new);
       reports.push(report.clone());
       
       // 存储序列化数据
       let storage_id = self.store_report_data(report_bytes.clone())?;
       
       // 存储到链上
       self.store_report_on_chain(
           report.report_id.clone(), 
           storage_id.clone(),
           report_bytes
       )?;
       
       Ok(storage_id)
   }
   
   pub fn query_reports(&self, institution_id: Principal) -> Vec<RiskAssessmentReport> {
    info!("Starting query reports for institution: {}", institution_id.to_text());
    
    let mut all_reports = Vec::new();
    
    // 1. 从本地存储获取
    if let Some(local_reports) = self.reports.get(&institution_id) {
        all_reports.extend(local_reports.clone());
        info!("Found {} reports in local storage", local_reports.len());
    }
    
    // 2. 从存储服务和链上获取
    for (record_key, storage_id, data) in self.get_all_chain_data() {
        info!("Processing record: {}, storage_id: {}", record_key, storage_id);
        
        // 尝试从 chain_data 解析
        match candid::decode_one::<RiskAssessmentReport>(&data) {
            Ok(report) => {
                if report.institution_id == institution_id 
                   && !all_reports.iter().any(|r| r.report_id == report.report_id) {
                    info!("Found report from chain data: {}", report.report_id);
                    all_reports.push(report);
                }
            },
            Err(_) => {
                // 如果直接解析失败，尝试从 stored_data 获取
                if let Some(stored_data) = self.stored_data.get(&storage_id) {
                    if let Ok(report) = candid::decode_one::<RiskAssessmentReport>(stored_data) {
                        if report.institution_id == institution_id 
                           && !all_reports.iter().any(|r| r.report_id == report.report_id) {
                            info!("Found report from stored data: {}", report.report_id);
                            all_reports.push(report);
                        }
                    } else {
                        info!("Failed to decode report from stored data for {}", storage_id);
                    }
                }
            }
        }
    }

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
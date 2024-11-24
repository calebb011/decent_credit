use candid::Principal;
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::models::*;

// 获取上传历史记录接口
#[query]
pub fn get_upload_history(institution_id: Principal, params: UploadHistoryParams) -> UploadHistoryResponse {
    log_info(
        format!("Fetching upload history for institution: {}", institution_id.to_text())
    );
    
    UPLOAD_SERVICE.with(|service| {
        let service = service.borrow();
        let mut records = service.get_upload_records(institution_id);
        
        // 应用状态筛选
        if let Some(status) = params.status {
            records = records
                .into_iter()
                .filter(|record| record.status == status)
                .collect();
        }
        
        // 应用日期筛选
        if let Some(start_date) = params.start_date {
            if let Ok(start) = DateTime::parse_from_rfc3339(&start_date) {
                records = records
                    .into_iter()
                    .filter(|record| {
                        if let Ok(record_date) = DateTime::parse_from_rfc3339(&record.submitted_at) {
                            record_date >= start
                        } else {
                            false
                        }
                    })
                    .collect();
            }
        }
        
        if let Some(end_date) = params.end_date {
            if let Ok(end) = DateTime::parse_from_rfc3339(&end_date) {
                records = records
                    .into_iter()
                    .filter(|record| {
                        if let Ok(record_date) = DateTime::parse_from_rfc3339(&record.submitted_at) {
                            record_date <= end
                        } else {
                            false
                        }
                    })
                    .collect();
            }
        }
        
        UploadHistoryResponse {
            total: records.len(),
            data: records,
        }
    })
}

// 服务实现
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! {
    static UPLOAD_SERVICE: RefCell<UploadService> = RefCell::new(UploadService::new());
}

pub struct UploadService {
    records: HashMap<Principal, Vec<UploadRecord>>,
}

impl UploadService {
    pub fn new() -> Self {
        Self {
            records: HashMap::new(),
        }
    }
    
    pub fn get_upload_records(&self, institution_id: Principal) -> Vec<UploadRecord> {
        self.records
            .get(&institution_id)
            .cloned()
            .unwrap_or_default()
    }
}


candid::export_service!(); 
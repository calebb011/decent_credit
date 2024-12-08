use candid::{Principal, Encode, Decode, CandidType, Deserialize};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use log::{info, debug, warn, error};
use crate::services::admin_institution_service::ADMIN_SERVICE;  // 移到顶部
use crate::services::reports_storage::*;  // 移到顶部
use crate::services::record_service::RECORD_SERVICE;  // 移到顶部
use crate::services::storage_service::*;  // 移到顶部
use crate::utils::error::Error;

use crate::models::credit::*;
use crate::models::record::*;

pub struct CreditService {
    credit_records: Vec<CreditRecord>,
    deduction_records: Vec<CreditDeductionRecord>,
    institution_records: HashMap<Principal, Vec<CreditRecord>>,
    admin_principals: Vec<Principal>,
   }

thread_local! {
    pub static CREDIT_SERVICE: RefCell<CreditService> = RefCell::new(CreditService::new());
}

impl CreditService {
    pub fn new() -> Self {
        Self {
            credit_records: Vec::new(),
            deduction_records: Vec::new(),
            institution_records: HashMap::new(),
            admin_principals: Vec::new(),
        }
    }


    pub fn assess_user_risk(&self, institution_id: Principal, user_did: &str) -> Result<RiskAssessment, String> {
        let user_records: Vec<&CreditRecord> = self.credit_records
            .iter()
            .filter(|r| r.user_did == user_did)
            .collect();

        info!("Found {} credit records for user1111 {}", user_records.len(), user_did);
        
        let credit_score = self.calculate_credit_score(&user_records);
        let (risk_level, details, suggestions) = self.analyze_risk_level(credit_score, &user_records);
        
        let assessment = RiskAssessment {
            credit_score,
            risk_level: risk_level.clone(),
            assessment_details: details.clone(),
            suggestions: suggestions.clone(),
        };

        // 创建报告
        let report = RiskAssessmentReport {
            report_id: format!("RAR{}", time() / 1_000_000_000),
            user_did: user_did.to_string(),
            institution_id,
            assessment: assessment.clone(),
            created_at: time(),
        };

        // 使用独立的 REPORTS_STORAGE 存储报告
        REPORTS_STORAGE.with(|storage| {
            let mut storage = storage.borrow_mut();
            storage.store_report(institution_id, report);
        });

        info!("Successfully created and stored risk assessment for user {}", user_did);

        Ok(assessment)
    }

    pub fn query_assessment_reports(
        &self,
        institution_id: Principal,
        days: Option<u64>
    ) -> AssessmentListResponse {
       // 使用 with_reports_storage 辅助函数来确保正确的借用
    let reports = with_reports_storage(|storage| {
        storage.query_reports(institution_id)
    });
        AssessmentListResponse {
            status: "SUCCESS".to_string(),
            message: None,
            data: reports,
        }
    }
    // === 辅助方法 ===
    fn calculate_credit_score(&self, records: &[&CreditRecord]) -> u32 {
        // 基础分数
        let base_score = 80;
        
        // 根据记录数量和类型进行调整
        let record_score = records.len() as u32 * 2;
        
        // TODO: 实现更复杂的评分逻辑
        base_score + record_score.min(20)
    }

    fn analyze_risk_level(&self, credit_score: u32, records: &[&CreditRecord]) -> (String, Vec<String>, Vec<String>) {
        let risk_level = match credit_score {
            0..=60 => "High Risk",
            61..=80 => "Medium Risk",
            _ => "Low Risk",
        };
    
        let details = vec![
            format!("Credit Score: {}", credit_score),
            format!("Historical Records Count: {}", records.len()),
            "Credit Record Assessment Completed".to_string(),
        ];
    
        let suggestions = match risk_level {
            "High Risk" => vec![
                "Recommended to build more positive credit records".to_string(),
                "Avoid overdue payments".to_string(),
            ],
            "Medium Risk" => vec![
                "Continue maintaining good credit records".to_string(),
                "Consider increasing credit limit".to_string(),
            ],
            _ => vec![
                "Good credit status, maintain current practices".to_string(),
                "Eligible for additional credit services".to_string(),
            ],
        };
    
        (risk_level.to_string(), details, suggestions)
    }
}

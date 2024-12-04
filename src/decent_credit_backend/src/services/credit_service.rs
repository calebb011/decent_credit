use candid::{Principal, Encode, Decode, CandidType, Deserialize};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use log::{info, debug, warn, error};
use crate::services::admin_institution_service::ADMIN_SERVICE;  // 移到顶部
use crate::services::reports_storage::REPORTS_STORAGE;  // 移到顶部
use crate::services::record_service::RECORD_SERVICE;  // 移到顶部
use crate::services::storage_service::{with_storage_service};  // 移到顶部
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



    // 修改后的 assess_user_risk 方法
    pub fn assess_user_risk(&self, institution_id: Principal, user_did: &str) -> Result<RiskAssessment, String> {
        let user_records: Vec<&CreditRecord> = self.credit_records
            .iter()
            .filter(|r| r.user_did == user_did)
            .collect();

        info!("Found {} credit records for user {}", user_records.len(), user_did);
        
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
            storage.store_report(institution_id, user_did, report);
        });

        info!("Successfully created and stored risk assessment for user {}", user_did);

        Ok(assessment)
    }

    pub fn query_assessment_reports(
        &self,
        institution_id: Principal,
        days: Option<u64>
    ) -> AssessmentListResponse {
        let reports = REPORTS_STORAGE.with(|storage| {
            let storage = storage.borrow();
            storage.query_reports(institution_id, days)
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
            0..=60 => "高风险",
            61..=80 => "中等风险",
            _ => "低风险",
        };

        let details = vec![
            format!("信用评分: {}", credit_score),
            format!("历史记录数量: {}", records.len()),
            "信用记录评估完成".to_string(),
        ];

        let suggestions = match risk_level {
            "高风险" => vec![
                "建议增加更多正面的信用记录".to_string(),
                "避免出现逾期还款".to_string(),
            ],
            "中等风险" => vec![
                "继续保持良好的信用记录".to_string(),
                "可以考虑增加信用额度".to_string(),
            ],
            _ => vec![
                "信用状况良好，继续保持".to_string(),
                "可以享受更多信用服务".to_string(),
            ],
        };

        (risk_level.to_string(), details, suggestions)
    }
}

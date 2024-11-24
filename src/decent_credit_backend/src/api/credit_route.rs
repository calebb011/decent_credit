use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;
use serde::Serialize;
use std::collections::HashMap;
use crate::models::*;


/// 创建信用扣分记录
#[update]
pub async fn create_credit_record(request: CreateCreditRecordRequest) -> Result<CreditDeductionRecord, String> {
    log_info(format!(
        "Creating credit deduction record for institution: {}", 
        request.institution_id.to_text()
    ));

    let caller = ic_cdk::caller();
    
    // 检查调用者权限
    if !CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        service.is_admin(caller)
    }) {
        return Err("没有创建信用扣分记录的权限".to_string());
    }

    CREDIT_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.create_deduction_record(caller, request)
    })
}

/// 获取信用扣分记录列表
#[query]
pub fn get_credit_records(institution_id: Option<Principal>) -> Vec<CreditDeductionRecord> {
    log_info("Fetching credit deduction records");
    
    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        let records = service.get_deduction_records();
        
        match institution_id {
            Some(id) => records
                .into_iter()
                .filter(|record| record.institution_id == id)
                .collect(),
            None => records,
        }
    })
}

/// 查询机构详细信用记录
#[query]
pub fn query_institution_records(institution_id: Principal, user_did: String) -> Result<InstitutionRecordResponse, String> {
    log_info(format!(
        "Querying detailed records for institution {} and user {}", 
        institution_id.to_text(), 
        user_did
    ));

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution_records(institution_id, &user_did)
    })
}

/// 扣除查询代币
#[update]
pub async fn deduct_query_token(institution_id: Principal) -> Result<bool, String> {
    log_info(format!(
        "Deducting query token for institution: {}", 
        institution_id.to_text()
    ));

    CREDIT_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.deduct_token(institution_id)
    })
}

/// 获取用户风险评估
#[query]
pub fn get_risk_assessment(user_did: String) -> Result<RiskAssessment, String> {
    log_info(format!(
        "Generating risk assessment for user: {}", 
        user_did
    ));

    CREDIT_SERVICE.with(|service| {
        let service = service.borrow();
        service.assess_user_risk(&user_did)
    })
}

// === 服务实现 ===
use std::cell::RefCell;
thread_local! {
    static CREDIT_SERVICE: RefCell<CreditService> = RefCell::new(CreditService::new());
}

pub struct CreditService {
    deduction_records: Vec<CreditDeductionRecord>,
    institution_records: HashMap<Principal, Vec<CreditRecord>>,
    admin_principals: Vec<Principal>,
    institution_tokens: HashMap<Principal, u64>,
}

impl CreditService {
    pub fn new() -> Self {
        Self {
            deduction_records: Vec::new(),
            institution_records: HashMap::new(),
            admin_principals: Vec::new(),
            institution_tokens: HashMap::new(),
        }
    }

    /// 检查是否是管理员
    pub fn is_admin(&self, principal: Principal) -> bool {
        self.admin_principals.contains(&principal)
    }

    /// 创建信用扣分记录
    pub fn create_deduction_record(
        &mut self,
        operator: Principal,
        request: CreateCreditRecordRequest,
    ) -> Result<CreditDeductionRecord, String> {
        let record = CreditDeductionRecord {
            id: format!("{}", self.deduction_records.len() + 1),
            record_id: format!("CR{}{:03}", 
                ic_cdk::api::time() / 1_000_000_000, 
                self.deduction_records.len() + 1
            ),
            institution_id: request.institution_id,
            institution_name: "机构名称".to_string(), // 实际应用中需要查询机构信息
            deduction_points: request.deduction_points,
            reason: request.reason,
            data_quality_issue: request.data_quality_issue,
            created_at: ic_cdk::api::time(),
            operator_id: operator,
            operator_name: "管理员".to_string(), // 实际应用中需要查询操作员信息
        };

        self.deduction_records.push(record.clone());
        Ok(record)
    }

    /// 获取所有扣分记录
    pub fn get_deduction_records(&self) -> Vec<CreditDeductionRecord> {
        self.deduction_records.clone()
    }

    /// 获取机构记录
    pub fn get_institution_records(
        &self,
        institution_id: Principal,
        user_did: &str,
    ) -> Result<InstitutionRecordResponse, String> {
        let records = self.institution_records
            .get(&institution_id)
            .cloned()
            .unwrap_or_default();

        Ok(InstitutionRecordResponse {
            institution_id,
            institution_name: "机构名称".to_string(), // 实际应用中需要查询
            user_did: user_did.to_string(),
            records,
        })
    }

    /// 扣除查询代币
    pub fn deduct_token(&mut self, institution_id: Principal) -> Result<bool, String> {
        let tokens = self.institution_tokens
            .entry(institution_id)
            .or_insert(100); // 默认100个代币

        if *tokens == 0 {
            return Err("代币余额不足".to_string());
        }

        *tokens -= 1;
        Ok(true)
    }

    /// 评估用户风险
    pub fn assess_user_risk(&self, user_did: &str) -> Result<RiskAssessment, String> {
        // 示例实现，实际应用中需要根据用户历史记录进行复杂计算
        Ok(RiskAssessment {
            credit_score: 85,
            risk_level: "低风险".to_string(),
            assessment_details: vec![
                "历史还款记录良好，从未出现逾期".to_string(),
                "当前总负债率较低，约为收入的30%".to_string(),
                "信用卡使用频率适中，额度利用率保持在合理水平".to_string(),
            ],
            suggestions: vec![
                "建议继续保持良好的还款习惯".to_string(),
                "可以考虑适度提高信用额度".to_string(),
                "定期检查信用报告，确保信息准确性".to_string(),
            ],
        })
    }
}


candid::export_service!(); 
use candid::{Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use log::{info, debug, warn, error};
use crate::services::admin_service::ADMIN_SERVICE;  // 移到顶部
use crate::services::record_service::RECORD_SERVICE;  // 移到顶部

use crate::models::credit::*;

pub struct CreditService {
    credit_records: Vec<CreditRecord>,
    deduction_records: Vec<CreditDeductionRecord>,
    institution_records: HashMap<Principal, Vec<CreditRecord>>,
    upload_history: Vec<UploadRecord>,
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
            upload_history: Vec::new(),
            admin_principals: Vec::new(),
        }
    }


    // === 查询相关方法 ===
    pub fn query_records(
        &self,
        caller: Principal,
        params: &RecordQueryParams
    ) -> Result<GetRecordsResponse, String> {
        let mut records = self.credit_records.clone();

        // Apply filters
        if let Some(institution_id) = params.institution_id {
            records.retain(|r| r.institution_id == institution_id);
        }
        if let Some(ref user_did) = params.user_did {
            records.retain(|r| r.user_did == *user_did);
        }
        if let Some(record_type) = &params.record_type {
            records.retain(|r| r.record_type == *record_type);
        }
        if let Some(ref start_date) = params.start_date {
            records.retain(|r| r.event_date >= *start_date);
        }
        if let Some(ref end_date) = params.end_date {
            records.retain(|r| r.event_date <= *end_date);
        }
        if let Some(status) = &params.status {
            records.retain(|r| r.status == *status);
        }

        Ok(GetRecordsResponse {
            status: "SUCCESS".to_string(),
            records,
        })
    }

    pub fn get_record_statistics(
        &self,
        institution_id: Option<Principal>
    ) -> Result<RecordStatistics, String> {
        let records = match institution_id {
            Some(id) => self.credit_records
                .iter()
                .filter(|r| r.institution_id == id)
                .collect::<Vec<_>>(),
            None => self.credit_records.iter().collect(),
        };

        Ok(RecordStatistics {
            total_records: records.len() as u64,
            pending_records: records.iter().filter(|r| matches!(r.status, RecordStatus::Pending)).count() as u64,
            confirmed_records: records.iter().filter(|r| matches!(r.status, RecordStatus::Confirmed)).count() as u64,
            rejected_records: records.iter().filter(|r| matches!(r.status, RecordStatus::Rejected)).count() as u64,
            total_rewards: records.iter().filter_map(|r| r.reward_amount).sum(),
        })
    }

    

pub fn create_deduction_record(
    &mut self,
    operator: Principal,
    request: CreateCreditRecordRequest
) -> Result<CreditDeductionRecord, String> {
    // 1. 通过 ADMIN_SERVICE 获取机构信息和分数
    let current_score = ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution(request.institution_id)
            .map(|inst| inst.credit_score.score)
            .ok_or_else(|| "机构不存在".to_string())
    })?;
    
    // 2. 检查扣分后是否会小于0
    if current_score < request.deduction_points as u64 {
        return Err(format!(
            "扣分分数({})大于当前信用分数({})", 
            request.deduction_points,
            current_score
        ));
    }

    // 3. 更新机构分数
    let new_score = current_score - request.deduction_points as u64;
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.update_credit_score(request.institution_id, new_score)
    })?;

    // 4. 获取机构名称并创建扣分记录
    let institution_name = ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution(request.institution_id)
            .map(|inst| inst.name)
            .unwrap_or_else(|| "未知机构".to_string())
    });

    let record = CreditDeductionRecord {
        id: format!("{}", self.deduction_records.len() + 1),
        record_id: format!("CR{}{:03}", 
            time() / 1_000_000_000,
            self.deduction_records.len() + 1
        ),
        institution_id: request.institution_id,
        institution_name,
        deduction_points: request.deduction_points,
        reason: request.reason,
        data_quality_issue: request.data_quality_issue,
        created_at: time(),
        operator_id: operator,
        operator_name: "管理员".to_string(), 
    };

    // 5. 保存记录
    self.deduction_records.push(record.clone());
    
    Ok(record)
}

pub fn deduct_query_token(
    &mut self,
    institution_id: Principal,
    user_did: String
) -> Result<bool, String> {
    // 1. 从 ADMIN_SERVICE 获取机构当前代币余额
    let balance = ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution_balance(institution_id)
            .map(|balance| balance.dcc)
            .map_err(|e| e.to_string())
    })?;
    
    // 2. 扣减代币
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        let request = DCCTransactionRequest {
            dcc_amount: 1,
            usdt_amount: 0.0,  // 不涉及USDT
            tx_hash: format!("QRY{}_{}", 
                time() / 1_000_000_000,
                user_did.chars().take(8).collect::<String>()
            ),
            remarks: format!("查询用户{}的信用记录", user_did),
            created_at: time(),
        };
        
        service.process_dcc_deduction(institution_id, request)
    })?;

    Ok(true)
}
    pub fn get_deduction_records(&self, institution_id: Option<Principal>) -> Vec<CreditDeductionRecord> {
        match institution_id {
            Some(id) => self.deduction_records
                .iter()
                .filter(|record| record.institution_id == id)
                .cloned()
                .collect(),
            None => self.deduction_records.clone(),
        }
    }

    pub fn get_institution_records(
        &mut self,
        institution_id: Principal,
        user_did: &str,
    ) -> Result<InstitutionRecordResponse, String> {
        // 1. 扣减代币
        self.deduct_query_token(institution_id, user_did.to_string())?;
        
        // 2. 获取机构信息
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(institution_id)
                .ok_or_else(|| "机构不存在".to_string())
        })?;
        info!("get_institution_records for institution full_name: {}", institution.full_name);
    
        // 3. 调用 RECORD_SERVICE 获取记录
        let records = RECORD_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            service.get_record(user_did.to_string())
        });
    
        // 4. 记录API调用
        ADMIN_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            service.institution_record_api_call(institution_id, 1);
        });
    
        // 5. 返回响应
        Ok(InstitutionRecordResponse {
            institution_id,
            institution_name: institution.full_name,
            user_did: user_did.to_string(),
            records,
        })
    }

    // === 风险评估相关方法 ===
    pub fn assess_user_risk(&self, user_did: &str) -> Result<RiskAssessment, String> {
        // 收集用户的所有信用记录
        let user_records: Vec<&CreditRecord> = self.credit_records
            .iter()
            .filter(|r| r.user_did == user_did)
            .collect();

        if user_records.is_empty() {
            return Err("未找到用户信用记录".to_string());
        }

        // TODO: 实现更复杂的风险评估逻辑
        let credit_score = self.calculate_credit_score(&user_records);
        let (risk_level, details, suggestions) = self.analyze_risk_level(credit_score, &user_records);

        Ok(RiskAssessment {
            credit_score,
            risk_level,
            assessment_details: details,
            suggestions,
        })
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


    pub async fn create_deduction_record_async(
        &mut self,
        operator: Principal,
        request: CreateCreditRecordRequest
    ) -> Result<CreditDeductionRecord, String> {
        self.create_deduction_record(operator, request)
    }
}
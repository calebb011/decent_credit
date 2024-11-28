use candid::{Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use log::{info, debug, warn, error};
use crate::services::admin_service::ADMIN_SERVICE;  // 移到顶部

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

    // === 权限检查 ===
    pub fn is_admin(&self, principal: Principal) -> bool {
        self.admin_principals.contains(&principal)
    }

    // === 记录提交相关方法 ===
    pub fn submit_record(
        &mut self,
        caller: Principal,
        request: RecordSubmissionRequest
    ) -> Result<RecordSubmissionResponse, String> {
        let record_id = format!("CR{}{:03}", 
            time() / 1_000_000_000,
            self.credit_records.len() + 1
        );

        let record = CreditRecord {
            id: record_id.clone(),
            institution_id: caller,
            record_type: request.record_type,
            user_did: request.user_did.clone(),
            event_date: request.event_date,
            content: request.content,
            encrypted_content: Vec::new(), // TODO: Implement encryption
            proof: Vec::new(), // TODO: Implement zk-SNARK proof
            canister_id: ic_cdk::id().to_string(),
            timestamp: time(),
            status: RecordStatus::Pending,
            reward_amount: Some(10), // Default reward amount
        };

        // Store the record
        self.credit_records.push(record.clone());
        
        // Update institution records
        self.institution_records
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(record);

        // Add to upload history
        self.upload_history.push(UploadRecord {
            id: record_id.clone(),
            user_did: request.user_did,
            institution_id: caller,
            status: "PENDING".to_string(),
            submitted_at: format!("{}", time() / 1_000_000_000),
            review_result: ReviewResult {
                passed: true,
                reason: None,
            },
        });

        Ok(RecordSubmissionResponse {
            record_id,
            status: RecordStatus::Pending,
            timestamp: time(),
            reward_amount: Some(10),
        })
    }

    pub fn batch_submit_records(
        &mut self,
        caller: Principal,
        request: BatchSubmissionRequest
    ) -> Result<BatchSubmissionResponse, String> {
        let mut submitted = 0;
        let mut failed = 0;
        let mut record_ids = Vec::new();

        for record_request in request.records {
            match self.submit_record(caller, record_request) {
                Ok(response) => {
                    submitted += 1;
                    record_ids.push(response.record_id);
                }
                Err(_) => {
                    failed += 1;
                }
            }
        }

        Ok(BatchSubmissionResponse {
            submitted,
            failed,
            record_ids,
            timestamp: time(),
            status: RecordStatus::Pending,
        })
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

    // === 机构记录相关方法 ===
    pub fn get_institution_records(
        &self,
        institution_id: Principal,
        user_did: &str,
    ) -> Result<InstitutionRecordResponse, String> {
        let records = self.institution_records
            .get(&institution_id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter(|r| r.user_did == user_did)
            .collect();

        Ok(InstitutionRecordResponse {
            institution_id,
            institution_name: "机构名称".to_string(), // TODO: 实际应用中需要查询
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

    // === 异步方法封装 ===
    pub async fn submit_record_async(
        &mut self,
        caller: Principal,
        request: RecordSubmissionRequest
    ) -> Result<RecordSubmissionResponse, String> {
        self.submit_record(caller, request)
    }

    pub async fn batch_submit_records_async(
        &mut self,
        caller: Principal,
        request: BatchSubmissionRequest
    ) -> Result<BatchSubmissionResponse, String> {
        self.batch_submit_records(caller, request)
    }

    pub async fn create_deduction_record_async(
        &mut self,
        operator: Principal,
        request: CreateCreditRecordRequest
    ) -> Result<CreditDeductionRecord, String> {
        self.create_deduction_record(operator, request)
    }
}
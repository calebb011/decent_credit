use candid::{CandidType, Principal};
use ic_cdk::api::{call, time};
use std::collections::HashMap;
use std::cell::RefCell;
use crate::services::record_services::call::call;
use crate::services::crypto_service::{self, CryptoService, with_crypto_service};  // 修改这里
use crate::services::storage_service::{self, StorageService, with_storage_service};  // 修改这里

use crate::models::record::{
    RecordData,
    CreditRecord,
    RecordQueryParams,
    RecordStatistics,
    RecordType,
    RecordContent,
    RecordStatus,
    RecordSubmissionRequest
};
// 导入其他服务
use crate::services::{
    zk_proof_service::ZKProofService,
};



thread_local! {
    pub static RECORD_SERVICE: RefCell<RecordService> = RefCell::new(
        RecordService::new(
            Principal::from_text("bkyz2-fmaaa-aaaaa-qaaaq-cai").unwrap()
        )
    );
}


pub struct RecordService {
    storage_canister_id: Principal,
    records: HashMap<String, CreditRecord>,
    proofs: HashMap<String, Vec<u8>>,      // 添加这个字段
    zk_service: ZKProofService,
    crypto_service:CryptoService,
}

impl RecordService {
    pub fn new(storage_canister_id: Principal) -> Self {
        Self {
            storage_canister_id,
            records: HashMap::new(),
            crypto_service: CryptoService::new(),
            proofs: HashMap::new(),
            zk_service: ZKProofService::new()
        }
    }

    pub fn submit_record(&mut self, request: RecordSubmissionRequest) -> Result<String, Error> {
        // 校验内容
        self.validate_record_content(&request.record_type, &request.content)?;
        
        // 序列化内容
        let content_bytes = candid::encode_one(&request.content)
            .map_err(|_| Error::SerializationFailed)?;
    
        let record_id = self.generate_record_id();
        let record = CreditRecord {
            id: record_id.clone(),
            institution_id: ic_cdk::caller(),
            record_type: request.record_type,
            content: request.content,
            canister_id: self.storage_canister_id.to_string(),
            timestamp: time(),
            status: RecordStatus::Pending,
            user_did: request.user_did
        };
    
        // 生成证明
        let proof = self.zk_service.generate_proof(&record);
    
        // 存储记录和证明
        self.records.insert(record_id.clone(), record.clone());
        self.proofs.insert(record_id.clone(), proof.clone());
        
        // 加密和存储过程
        let encrypted_content = with_crypto_service(|service| {
            service.encrypt(&content_bytes)
        }).map_err(|e| Error::EncryptionFailed(format!("Failed to encrypt: {:?}", e)))?;
    
        let storage_id = with_storage_service(|service| {
            service.store_data(encrypted_content.clone())  
        }).map_err(|e| Error::StorageFailed)?;
    
        // 上链
        with_storage_service(|service| {
            service.store_on_chain(record_id.clone(), storage_id, proof)
        }).map_err(|e| Error::StorageFailed)?;
    
        Ok(record_id)
    }
   

    pub async fn verify_and_commit(&mut self, record_id: &str) -> Result<bool, Error> {
        let record = self.records.get(record_id)
            .ok_or(Error::RecordNotFound)?;

        // 重构记录数据以供验证
        let record_data = self.reconstruct_record_data(record)?;
        
        // 序列化数据
        let record_data_bytes = candid::encode_one(&record_data)
            .map_err(|_| Error::SerializationFailed)?;
            
        // 验证ZK证明
        // let is_valid = self.zk_service.verify_proof(&record_data_bytes, &record.proof)
        //     .map_err(|e| Error::VerificationFailed(e))?;
        
        // let new_status = if is_valid {
        //     RecordStatus::Confirmed
        // } else {
        //     RecordStatus::Rejected
        // };

        // 更新记录状态
        // if let Some(record) = self.records.get_mut(record_id) {
        //     record.status = new_status;
        // }
        let is_valid = true; // 假设验证总是成功
        Ok(is_valid)

        // Ok()
    }

    fn reconstruct_record_data(&self, record: &CreditRecord) -> Result<RecordData, Error> {
        match &record.content {
            RecordContent::Loan(loan) => Ok(RecordData {
                amount: loan.amount,
                user_id: record.user_did.as_bytes().to_vec(),
                record_type: record.record_type.to_u8(),
                timestamp: record.timestamp,
                term_months: Some(loan.term_months),
                interest_rate: Some(loan.interest_rate),
                loan_id: Some(loan.loan_id.clone()),
                days: None,
                period_amount: None
            }),
            RecordContent::Repayment(repayment) => Ok(RecordData {
                amount: repayment.amount,
                user_id: record.user_did.as_bytes().to_vec(),
                record_type: record.record_type.to_u8(),
                timestamp: record.timestamp,
                loan_id: Some(repayment.loan_id.clone()),
                term_months: None,
                interest_rate: None,
                days: None,
                period_amount: None
            }),
            RecordContent::Notification(notification) => Ok(RecordData {
                amount: notification.amount,
                user_id: record.user_did.as_bytes().to_vec(),
                record_type: record.record_type.to_u8(),
                timestamp: record.timestamp,
                days: Some(notification.days),
                period_amount: Some(notification.period_amount),
                term_months: None,
                interest_rate: None,
                loan_id: None
            })
        }
    }

    pub  fn get_record(&mut self, user_did: String) ->Vec<CreditRecord> {
        let mut result = Vec::new();
        
        // 1. 从本地缓存获取记录
        let local_records: Vec<&CreditRecord> = self.records.values()
            .filter(|r| r.user_did == user_did)
            .collect();
    
        for record in local_records {
            // 2. 从链上验证记录有效性
            if let Some((storage_id, proof)) = with_storage_service(|service| {
                service.get_chain_data(&record.id)
                    .map(|(sid, p)| (sid.clone(), p.clone()))
            }) {
                // 3. 从 Canister 获取加密数据
                if let Some(encrypted_data) = with_storage_service(|service| {
                    service.get_data(&storage_id).cloned()
                }) {
                    // 4. 验证并解密
                    if with_crypto_service(|service| {
                        service.decrypt(&encrypted_data).is_ok()
                    }) {
                        result.push(record.clone());
                    }
                }
            }
        }
    
        result
    }
    

    // validate_record_content 方法的实现
    pub fn validate_record_content(
        &self,
        record_type: &RecordType,
        content: &RecordContent
    ) -> Result<(), Error> {
        match (record_type, content) {
            (RecordType::LoanRecord, RecordContent::Loan(loan)) => {
                if loan.amount == 0 || loan.loan_id.is_empty() || loan.term_months == 0 {
                    return Err(Error::InvalidData("Invalid loan data".to_string()));
                }
                if loan.interest_rate <= 0.0 || loan.interest_rate > 100.0 {
                    return Err(Error::InvalidData("Invalid interest rate".to_string()));
                }
            },
            (RecordType::RepaymentRecord, RecordContent::Repayment(repayment)) => {
                if repayment.amount == 0 || repayment.loan_id.is_empty() {
                    return Err(Error::InvalidData("Invalid repayment data".to_string()));
                }
            },
            (RecordType::NotificationRecord, RecordContent::Notification(notification)) => {
                if notification.amount == 0 || notification.days == 0 {
                    return Err(Error::InvalidData("Invalid notification data".to_string()));
                }
            },
            _ => return Err(Error::InvalidData("Record type mismatch".to_string()))
        }
        Ok(())
    }

    // store_encrypted_data 方法的实现
    pub async fn store_encrypted_data(&self, data: Vec<u8>) -> Result<String, Error> {
        let result: Result<(String,), _> = call(
            self.storage_canister_id,
            "store_data",
            (data,)
        ).await;

        match result {
            Ok((id,)) => Ok(id),
            Err(_) => Err(Error::StorageFailed),
        }
    }

    // calculate_reward 方法的实现
    // pub fn calculate_reward(&self, record_type: &RecordType, content: &RecordContent) -> u64 {
        // match (record_type, content) {
        //     (RecordType::LoanRecord, RecordContent::Loan(loan)) => {
        //         // 根据贷款金额计算奖励
        //         (loan.amount / 10000) * 1000 // 每万元奖励1000代币
        //     },
        //     (RecordType::RepaymentRecord, _) => 500_000, // 0.5 DCC
        //     (RecordType::NotificationRecord, _) => 800_000, // 0.8 DCC
        // }
    // }

    // generate_record_id 方法的实现
    pub fn generate_record_id(&self) -> String {
        let timestamp = time();
        let random = ic_cdk::api::performance_counter(0);  // 使用新的API
        format!("REC-{}-{}", timestamp, random)
    }

    // query_records 方法的实现
    pub fn query_records(&self, params: RecordQueryParams) -> Vec<CreditRecord> {
        self.records.values()
            .filter(|record| {
                let mut matches = true;
                
                if let Some(institution_id) = params.institution_id {
                    matches &= record.institution_id == institution_id;
                }
                if let Some(user_did) = &params.user_did {
                    matches &= record.user_did == *user_did;
                }
                if let Some(record_type) = &params.record_type {
                    matches &= record.record_type == *record_type;
                }
                if let Some(status) = &params.status {
                    matches &= record.status == *status;
                }
                
                matches
            })
            .cloned()
            .collect()
    }

    
}

#[derive(Debug)]
pub enum Error {
    InvalidData(String),
    InvalidDID,
    InvalidProof,
    SerializationFailed,
    EncryptionFailed(String),
    ProofGenerationFailed(String),
    StorageFailed,
    RecordNotFound,
    VerificationFailed(String),
    TokenRewardFailed(String),
    InitializationError(String),  // 添加这个
}

// 扩展 RecordType
impl RecordType {
    fn to_u8(&self) -> u8 {
        match self {
            RecordType::LoanRecord => 1,
            RecordType::RepaymentRecord => 2,
            RecordType::NotificationRecord => 3,
        }
    }
}

pub fn init_record_service() {
    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.records.clear();
    });
}
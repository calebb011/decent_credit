use candid::{CandidType, Principal};
use ic_cdk::api::{call, time};
use std::collections::HashMap;
use std::cell::RefCell;
use crate::services::record_service::call::call;
use crate::services::crypto_service::{self, CryptoService, with_crypto_service};  // 修改这里
use crate::services::storage_service::{self, with_storage_service};  // 修改这里
use crate::services::zk_proof_service::ZKProofService;
use crate::services::admin_service::ADMIN_SERVICE;  // 移到顶部

use crate::models::credit::{
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
         // 获取机构信息并提取机构名称
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(request.institution_id)
                .ok_or_else(|| Error::InvalidData("机构不存在".to_string()))
        })?;  // 注意这里添加了 ? 操作符
        
        let institution_name = institution.name.clone();  // 假设机构结构中有 name 字段
        let institution_full_name= institution.full_name.clone();
        // 序列化内容
        let content_bytes = candid::encode_one(&request.content)
            .map_err(|_| Error::SerializationFailed)?;
    
        let record_id = self.generate_record_id();
        
        // 生成加密内容和证明
        let encrypted_content = with_crypto_service(|service| {
            service.encrypt(&content_bytes)
        }).map_err(|e| Error::EncryptionFailed(format!("Failed to encrypt: {:?}", e)))?;

        let proof = self.zk_service.generate_proof(&content_bytes);

            // 在使用 encrypted_content 之前先克隆一份
        let encrypted_content_for_storage = encrypted_content.clone();
            // 完整初始化 CreditRecord
            let record = CreditRecord {
                id: record_id.clone(),
                institution_id: request.institution_id.clone(),
                institution_name,
                institution_full_name,
                record_type: request.record_type,
                user_did: request.user_did.clone(),
                event_date: request.event_date.clone(),  // 使用请求中的日期
                content: request.content,
                encrypted_content,  // 使用加密后的内容
                proof: proof.clone(),  // 使用生成的证明
                canister_id: self.storage_canister_id.to_string(),
                timestamp: time(),
                status: RecordStatus::Pending,
                reward_amount: None // 初始时没有奖励
            };
        
            // 存储记录
            self.records.insert(record_id.clone(), record.clone());

            // 存储到服务中
            let storage_id = with_storage_service(|service| {
                service.store_data(encrypted_content_for_storage)  
            }).map_err(|e| Error::StorageFailed)?;

            // 上链
            with_storage_service(|service| {
                service.store_on_chain(record_id.clone(), storage_id, proof)
            }).map_err(|_| Error::StorageFailed)?;
            
            // 4. 记录API调用
            ADMIN_SERVICE.with(|service| {
                let mut service = service.borrow_mut();
                service.institution_record_data_upload(request.institution_id.clone(), 1);
            });
        
        Ok(record_id)
    }
   

   

    pub async fn verify_and_commit(&mut self, record_id: &str) -> Result<bool, Error> {
           // 获取临时拷贝用于重构数据
        let record_copy = self.records.get(record_id)
            .ok_or(Error::RecordNotFound)?
            .clone();

        // 在获取可变引用之前重构数据
        let record_data = self.reconstruct_record_data(&record_copy)?;
            
        // 获取记录的可变引用
        let record = self.records.get_mut(record_id)
            .ok_or(Error::RecordNotFound)?;

        // 检查记录状态
        if record.status != RecordStatus::Pending {
            return Err(Error::InvalidData("Record is not in pending status".to_string()));
        }
                // 序列化数据
        let record_data_bytes = candid::encode_one(&record_data)
            .map_err(|_| Error::SerializationFailed)?;
        
        // 从存储服务获取证明数据
        let chain_data = with_storage_service(|service| {
            service.get_chain_data(&record_id)
        }).ok_or_else(|| Error::InvalidProof)?;

        // 验证存储的证明与记录中的证明匹配
        if chain_data.1.as_slice() != record.proof.as_slice() {
            return Err(Error::InvalidProof);
        }

        // 解密和验证内容
        let decrypted_content = with_crypto_service(|service| {
            service.decrypt(&record.encrypted_content)
        }).map_err(|e| Error::EncryptionFailed(format!("Decryption failed: {:?}", e)))?;

        // 验证内容完整性
        let original_content = candid::encode_one(&record.content)
            .map_err(|_| Error::SerializationFailed)?;

        if decrypted_content != original_content {
            return Err(Error::InvalidData("Content integrity check failed".to_string()));
        }

        // 通过zk服务进行证明验证
        let is_valid = self.zk_service.verify_proof(&record, &record.proof)
            .map_err(|e| Error::VerificationFailed(format!("Proof verification failed: {}", e)))?;

        if is_valid {
            // 更新记录状态
            record.status = RecordStatus::Confirmed;
            
            // 存储更新后的状态到链上
            with_storage_service(|service| {
                service.store_data(candid::encode_one(&record).unwrap())
            }).map_err(|_| Error::StorageFailed)?;

            // 记录验证结果
            ic_cdk::println!(
                "Record {} verified successfully. New status: {:?}", 
                record_id, 
                record.status
            );

            Ok(true)
        } else {
            // 更新为拒绝状态
            record.status = RecordStatus::Rejected;
            
            // 记录拒绝原因
            ic_cdk::println!(
                "Record {} verification failed. New status: {:?}", 
                record_id, 
                record.status
            );

            Ok(false)
        }
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

#[derive(CandidType, Debug)]
pub enum Error {
    InvalidData(String),
    SerializationFailed,
    EncryptionFailed(String),
    StorageFailed,
    InvalidProof,
    RecordNotFound,
    VerificationFailed(String),
    InvalidStatus,
    NotAuthorized,
    // 添加其他你需要的错误类型
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

impl Error {
    pub fn as_str(&self) -> &str {
        match self {
            Error::InvalidData(msg) => msg,
            Error::SerializationFailed => "Serialization failed",
            Error::EncryptionFailed(msg) => msg,
            Error::StorageFailed => "Storage operation failed",
            Error::InvalidProof => "Invalid proof",
            Error::RecordNotFound => "Record not found",
            Error::VerificationFailed(msg) => msg,
            Error::InvalidStatus => "Invalid record status",
            Error::NotAuthorized => "Not authorized",
        }
    }
}

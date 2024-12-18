use candid::{CandidType, Principal};
use ic_cdk::api::{call, time};
use std::collections::HashMap;
use std::cell::RefCell;
use log::{info, debug, warn, error};
use crate::services::record_service::call::call;
use crate::services::crypto_service::{self, CryptoService, with_crypto_service};  // 修改这里
use crate::services::storage_service::{self, with_storage_service};  // 修改这里
use crate::services::zk_proof_service::ZKProofService;
use crate::services::admin_institution_service::ADMIN_SERVICE;  // 移到顶部
use crate::utils::error::Error;
use crate::services::dashboard_service::DASHBOARD_SERVICE;
use crate::services::token_service::*;
use crate::services::credit_service::*;

use crate::models::record::*;

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
    credit_records: Vec<CreditRecord>,
    deduction_records: Vec<CreditDeductionRecord>,
    institution_records: HashMap<Principal, Vec<CreditRecord>>,
    upload_history: Vec<UploadRecord>,
}

impl RecordService {
  

    pub fn new(storage_canister_id: Principal) -> Self {
        Self {
            storage_canister_id,
            records: HashMap::new(),
            crypto_service: CryptoService::new(),
            proofs: HashMap::new(),
            zk_service: ZKProofService::new(),
            credit_records: Vec::new(),
            deduction_records: Vec::new(),
            institution_records: HashMap::new(),
            upload_history: Vec::new(),
        }
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

    
    pub fn submit_record(&mut self, request: RecordSubmissionRequest) -> Result<String, Error> {
        // 校验内容
        self.validate_record_content(
            &request.record_type,
            &request.content,
            request.institution_id,
            request.user_did.clone(),
            request.event_date.clone()
        )?;
     // 获取机构信息并提取机构名称
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(request.institution_id)
                .ok_or_else(|| Error::InvalidData("机构不存在".to_string()))
        })?;  // 注意这里添加了 ? 操作符
        info!("query_price for institution_id: {}", institution.query_price);

        let institution_name = institution.name.clone();  
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
                reward_amount: None, // 初始时没有奖励,
                query_price:institution.query_price.clone()
            };
        
            // 存储记录
            self.records.insert(record_id.clone(), record.clone());

            CREDIT_SERVICE.with(|service| {
                let mut credit_service = service.borrow_mut();
                credit_service.records.insert(record_id.clone(), record.clone());
            });
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
            RecordContent::Overdue(overdue) => Ok(RecordData {
                amount: overdue.amount,
                user_id: record.user_did.as_bytes().to_vec(),
                record_type: record.record_type.to_u8(),
                timestamp: record.timestamp,
                days: Some(overdue.overdueDays),
                period_amount: Some(overdue.period_amount),
                term_months: None,
                interest_rate: None,
                loan_id: None
            })
        }
    }
    
  // 保持同步查询，异步代币操作    
    pub fn get_record_by_id(&self, record_id: &str, institution_id: Principal) -> Option<CreditRecord> {
        if let Some(record) = self.records.get(record_id) {
            if let Some((storage_id, proof)) = with_storage_service(|service| {
                service.get_chain_data(record_id)
                    .map(|(sid, p)| (sid.clone(), p.clone()))
            }) {
                if let Some(encrypted_data) = with_storage_service(|service| {
                    service.get_data(&storage_id).cloned()
                }) {
                    if with_crypto_service(|service| {
                        service.decrypt(&encrypted_data).is_ok()
                    }) {
                        // 记录API调用
                        ADMIN_SERVICE.with(|service| {
                            let mut service = service.borrow_mut();
                            service.institution_record_api_call(institution_id, record.clone(), 1);
                        });

 
                        
                        return Some(record.clone());
                    } else {
                        error!("无法解密记录数据: {}", record_id);
                    }
                } else {
                    error!("未找到加密数据，存储ID: {}", storage_id);
                }
            } else {
                error!("未找到链上数据，记录ID: {}", record_id);
            }
        }
        None
    }
    
    pub async fn process_token_operation(op: TokenOperation) -> Result<(), String> {
        info!("Starting token operation processing for user: {}", op.user_did);
        
        let TokenOperation {
            from_id,
            to_id,
            user_did,
            query_price,
            record: _record,  // 添加下划线避免警告
        } = op;
    
        // 1. 获取 token canister id
        let token_canister_id = TOKEN_SERVICE.with(|service| {
            service.borrow().token_canister_id
        });
    
        // 2. 检查余额 - 修改异步调用方式
        let balance = TOKEN_SERVICE.with(|service| {
            let token_service = service.borrow();
            TokenService::query_balance_static(token_canister_id, op.from_id)
        }).await?;

  
        
    
        if balance < query_price {
            info!("余额不足，跳过转账: 当前余额 {}, 需要 {}", balance, query_price);
        }
    
        // 3. 准备费用转账参数
        let fee_transfer_args = TOKEN_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            service.prepare_query_fee(
                from_id, 
                to_id, 
                user_did.clone(), 
                query_price
            ).map_err(|e| format!("准备转账参数失败: {:?}", e))
        })?;
    
        // 4. 执行费用转账
        info!("Executing fee transfer...");
        TokenService::execute_transfer(token_canister_id, fee_transfer_args)
            .await
            .map_err(|e| format!("费用转账失败: {:?}", e))?;
    
        // 5. 准备奖励转账参数
        let reward_transfer_args = TOKEN_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            service.prepare_query_reward(
                to_id,
                user_did.clone()
            ).map_err(|e| format!("准备奖励参数失败: {:?}", e))
        })?;
    
        // 6. 如果有奖励，执行奖励转账
        if let Some(reward_args) = reward_transfer_args {
            info!("Executing rewards transfer...");
            TokenService::execute_transfer(token_canister_id, reward_args)
                .await
                .map_err(|e| format!("奖励转账失败: {:?}", e))?;
        } else {
            info!("No rewards transfer needed");
        }
    
        info!("Token operation completed successfully");
        Ok(())
    }
        
    
    
    
    pub fn get_record_userId(
            &mut self, 
            institution_id: Principal,
            user_did: String
        ) -> Result<Vec<CreditRecord>, String> {
            let local_records: Vec<CreditRecord> = self.records.values()
                .filter(|r| r.user_did == user_did)
                .cloned()
                .collect();
            
            let mut result = Vec::new();
            let mut token_operations = Vec::new();
        
            for mut  record in local_records {
                if let Some((storage_id, _)) = with_storage_service(|service| {
                    service.get_chain_data(&record.id)
                }) {
                    if let Some(encrypted_data) = with_storage_service(|service| {
                        service.get_data(&storage_id).cloned()
                    }) {
                        if with_crypto_service(|service| {
                            service.decrypt(&encrypted_data).is_ok()
                        }) {
                            if record.institution_id != institution_id {
                                // 检查被查询机构是否开启服务
                                let target_institution = ADMIN_SERVICE.with(|service| {
                                    let service = service.borrow();
                                    service.get_institution(record.institution_id)
                                        .ok_or_else(|| "机构不存在".to_string())
                                })?;
        
                                if !target_institution.data_service_enabled {
                                    return Err(format!(
                                        "机构 {} 未开启数据服务",
                                        target_institution.name
                                    ));
                                }
        
                                // 立即更新查询统计
                                ADMIN_SERVICE.with(|service| {
                                    let mut service = service.borrow_mut();
                                    service.increment_outbound_queries(institution_id);
                                    service.increment_inbound_queries(record.institution_id);
                                });
        
                                // 收集代币操作信息
                                token_operations.push(TokenOperation {
                                    from_id: institution_id,
                                    to_id: record.institution_id,
                                    user_did: user_did.clone(),
                                    query_price: target_institution.query_price,
                                    record: record.clone(),
                                });
                                record.query_price  = target_institution.query_price;
                                result.push(record);
                            }else{
                                record.query_price  =0;
                                result.push(record);

                            }

                        }
                    }
                }
            }
    
            // // 异步处理代币操作
            // if !token_operations.is_empty() {
            //     ic_cdk::spawn(async move {
            //         for op in token_operations {
            //             if let Err(e) = Self::process_token_operation(op).await {
            //                 error!("代币操作处理失败: {:?}", e);
            //                 // TODO: 可以添加重试逻辑或错误补偿机制
            //             }
            //         }
            //     });
            // }
        
            Ok(result)
        }
    
   
    
    pub fn get_failed_records_storage(&mut self, institution_id: Principal) -> Result<InstitutionRecordResponse, String> {
        // 1. 验证机构信息
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(institution_id)
                .ok_or_else(|| "机构不存在".to_string())
        })?;
        
        info!("Fetching records for institution: {}", institution.full_name);
    
        let mut records = Vec::new();
        
        // 2. 从本地缓存获取记录
        let local_records: Vec<&CreditRecord> = self.records.values()
            .filter(|r| r.institution_id == institution_id)
            .collect();
            info!("Fetching records for local_records: {}", local_records.len());

        // 3. 验证记录
        for record in local_records {
            if let Some((storage_id, _proof)) = with_storage_service(|service| {
                service.get_chain_data(&record.id)
                    .map(|(sid, p)| (sid.clone(), p.clone()))
            }) {
                if let Some(encrypted_data) = with_storage_service(|service| {
                    service.get_data(&storage_id).cloned()
                }) {
                    if with_crypto_service(|service| {
                        service.decrypt(&encrypted_data).is_ok()
                    }) {
                        records.push(record.clone());
                    }
                }
            }
        }
    
        info!("Found {} failed records for institution", records.len());
        
        // 4. 返回 InstitutionRecordResponse
        Ok(InstitutionRecordResponse {
            institution_id,
            institution_name: institution.full_name,
            user_did: String::from(""), // 对于失败记录列表，这个字段可以为空
            records  // 返回找到的失败记录
        })
    }
    
    pub fn validate_record_content(
        &mut self,
        record_type: &RecordType,
        content: &RecordContent,
        institution_id: Principal,
        user_did: String,
        event_date: String
    ) -> Result<(), Error> {
        // 1. 首先进行基础验证
        let validation_result = match (record_type, content) {
            (RecordType::LoanRecord, RecordContent::Loan(loan)) => {
                if loan.amount == 0 || loan.loan_id.is_empty() || loan.term_months == 0 {
                    Err("Invalid loan data: missing required fields")
                } else if loan.interest_rate <= 0.0 || loan.interest_rate > 100.0 {
                    Err("Invalid loan data: interest rate out of range")
                } else {
                    Ok(())
                }
            },
            (RecordType::RepaymentRecord, RecordContent::Repayment(repayment)) => {
                if repayment.amount == 0 || repayment.loan_id.is_empty() {
                    Err("Invalid repayment data: missing required fields")
                } else {
                    Ok(())
                }
            },
            (RecordType::OverdueRecord, RecordContent::Overdue(overdue)) => {
                if overdue.amount == 0 || overdue.overdueDays == 0 {
                    Err("Invalid overdue data: missing required fields")
                } else {
                    Ok(())
                }
            },
            _ => Err("Record type mismatch")
        };
    
        // 2. 如果验证失败，创建失败记录并存储
        if let Err(error_msg) = validation_result {
            // 获取机构信息
            let institution = ADMIN_SERVICE.with(|service| {
                let service = service.borrow();
                service.get_institution(institution_id)
                    .ok_or_else(|| Error::InvalidData("机构不存在".to_string()))
            })?;
    
            let record_id = self.generate_record_id();
            
            // 序列化内容并加密
            let content_bytes = candid::encode_one(&content)
                .map_err(|_| Error::SerializationFailed)?;
    
            let encrypted_content = with_crypto_service(|service| {
                service.encrypt(&content_bytes)
            }).map_err(|e| Error::EncryptionFailed(format!("Failed to encrypt: {:?}", e)))?;
    
            let proof = self.zk_service.generate_proof(&content_bytes);
    
            // 创建失败记录
            let failed_record = CreditRecord {
                id: record_id.clone(),
                institution_id,
                institution_name: institution.name,
                institution_full_name: institution.full_name,
                record_type: record_type.clone(),
                user_did,
                event_date,
                content: content.clone(),
                encrypted_content: encrypted_content.clone(),
                proof: proof.clone(),
                canister_id: self.storage_canister_id.to_string(),
                timestamp: time(),
                status: RecordStatus::Rejected,
                reward_amount: None,
                query_price: 0
            };
    
            // 保存记录到本地和链上
            self.records.insert(record_id.clone(), failed_record.clone());
    
            let storage_id = with_storage_service(|service| {
                service.store_data(encrypted_content)
            }).map_err(|_| Error::StorageFailed)?;
    
            with_storage_service(|service| {
                service.store_on_chain(record_id, storage_id, proof)
            }).map_err(|_| Error::StorageFailed)?;
    
            // 记录API调用
            ADMIN_SERVICE.with(|service| {
                let mut service = service.borrow_mut();
                service.institution_record_data_upload(institution_id, 1);
            });
    
            // 返回验证错误
            return Err(Error::ValidationError(error_msg.to_string()));
        }
    
        // 3. 验证通过
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

    
    pub fn get_institution_records(
        &mut self,
        institution_id: Principal,
        user_did: &str,
    ) -> Result<InstitutionRecordResponse, String> {
        // 验证机构信息
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(institution_id)
                .ok_or_else(|| "机构不存在".to_string())
        })?;
        
        info!("Fetching records for institution: {}", institution.full_name);

        // 获取用户记录，这个方法已经包含了异步的代币处理
        let records = self.get_record_userId(institution_id, user_did.to_string())?;
        
        if records.is_empty() {
            info!("No records found for user: {}", user_did);
        } else {
            info!("Found {} records for user", records.len());
        }
    
        Ok(InstitutionRecordResponse {
            institution_id,
            institution_name: institution.full_name,
            user_did: user_did.to_string(),
            records
        })
    }












    pub fn create_deduction_record(
        &mut self,
        operator: Principal,
        request: CreateCreditRecordRequest
    ) -> Result<CreditDeductionRecord, String> {
        info!("Starting create_deduction_record for institution: {}", request.institution_id);
        debug!("Request details: deduction_points={}, reason={}", request.deduction_points, request.reason);
        
        // 1. 通过 ADMIN_SERVICE 获取机构信息和分数
        info!("Fetching institution information");
        let institution = ADMIN_SERVICE.with(|service| {
            let service = service.borrow();
            service.get_institution(request.institution_id)
        });
    
        let institution = match institution {
            Some(inst) => {
                info!("Institution found: {}", inst.name);
                inst
            },
            None => {
                error!("Institution not found: {}", request.institution_id);
                return Err("Institution does not exist".to_string());
            }
        };
    
        let current_score = institution.credit_score.score;
        debug!("Current credit score: {}", current_score);
    
        // 2. 检查扣分后是否会小于0
        if current_score < request.deduction_points as u64 {
            error!(
                "Deduction points ({}) exceed current credit score ({})",
                request.deduction_points,
                current_score
            );
            return Err(format!(
                "Deduction points ({}) exceed current credit score ({})",
                request.deduction_points,
                current_score
            ));
        }
    
        // 3. 更新机构分数
        let new_score = current_score - request.deduction_points as u64;
        info!("Updating credit score from {} to {}", current_score, new_score);
        
        match ADMIN_SERVICE.with(|service| {
            let mut service = service.borrow_mut();
            service.update_credit_score(request.institution_id, new_score)
        }) {
            Ok(_) => {
                info!("Successfully updated credit score");
            },
            Err(e) => {
                error!("Failed to update credit score: {}", e);
                return Err(format!("Failed to update credit score: {}", e));
            }
        }
    
        // 4. 创建扣分记录
        debug!("Creating deduction record with ID: {}", self.deduction_records.len() + 1);
        let record = CreditDeductionRecord {
            id: format!("{}", self.deduction_records.len() + 1),
            record_id: format!("CR{}{:03}",
                time() / 1_000_000_000,
                self.deduction_records.len() + 1
            ),
            institution_id: request.institution_id,
            institution_name: institution.name.clone(),
            deduction_points: request.deduction_points,
            reason: request.reason.clone(),
            data_quality_issue: request.data_quality_issue.clone(),
            created_at: time(),
            operator_id: operator,
            operator_name: "Administrator".to_string(),
        };
    
        // 5. 保存记录
        info!("Saving deduction record: {}", record.record_id);
        self.deduction_records.push(record.clone());
        
        info!("Successfully created deduction record: {}", record.record_id);
        
        Ok(record)
    }
    // 修改调用奖励的地方
pub fn reward_query_token(
    &mut self,
    query_institution_id: Principal,  // 查询方机构
    record: CreditRecord,
    user_did: String
) -> Result<bool, String> {
    // 获取目标机构的查询价格
    let target_institution = ADMIN_SERVICE.with(|service| {
        service.borrow().get_institution(record.institution_id)
    }).ok_or_else(|| "机构不存在".to_string())?;

    let token_op = TokenOperation {
        from_id: query_institution_id,  // 查询方为支付方
        to_id: record.institution_id,    // 被查询方为接收方
        user_did: user_did.clone(),
        query_price: target_institution.query_price,  // 使用正确的查询价格
        record: record.clone(),
    };

    // 异步处理代币操作
    ic_cdk::spawn(async move {
        if let Err(e) = Self::process_token_operation(token_op).await {
            error!("代币操作处理失败: {}", e);
        }
    });

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

}



// 扩展 RecordType
impl RecordType {
    fn to_u8(&self) -> u8 {
        match self {
            RecordType::LoanRecord => 1,
            RecordType::RepaymentRecord => 2,
            RecordType::OverdueRecord => 3,
        }
    }
}

pub fn init_record_service() {
    RECORD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.records.clear();
    });
}

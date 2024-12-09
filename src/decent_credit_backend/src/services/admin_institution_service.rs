use candid::{CandidType, Principal, Deserialize};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use crate::models::institution::*;
use crate::models::credit::*;
use crate::models::record::*;
use crate::models::dashboard::*;
use log::{info, debug, warn, error};
use crate::utils::error::Error;
use crate::services::token_service::*;
use crate::services::record_service::*;
use crate::services::record_service::RecordService;
const DEFAULT_PASSWORD: &str = "123"; // 默认密码


pub struct AdminService {
    institutions: HashMap<Principal, Institution>,
    caller_institutions: HashMap<Principal, Vec<Principal>>,
    name_to_id: HashMap<String, Principal>,
    next_id: u64,
    dcc_transactions: Vec<DCCTransactionRequest>,
    usdt_rate: f64,
}

thread_local! {
    pub static ADMIN_SERVICE: RefCell<AdminService> = RefCell::new(AdminService::new());
}

impl AdminService {
    pub fn new() -> Self {
        Self {
            institutions: HashMap::new(),
            caller_institutions: HashMap::new(),
            name_to_id: HashMap::new(),
            next_id: 0,
            dcc_transactions: Vec::new(),
            usdt_rate: 1.0,
        }
    }

    // === 核心功能和工具方法 ===

    fn hash_password(password: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn generate_id(&mut self, id_str: &str) -> Principal {
        match Principal::from_text(id_str) {
            Ok(principal) => principal,
            Err(_) => {
                warn!("Failed to parse principal from text: {}", id_str);
                Principal::anonymous() // 或者其他默认处理
            }
        }
    }
    
    fn calculate_growth_rate(&self, total: u64, today: u64) -> f64 {
        if total == 0 {
            0.0
        } else {
            (today as f64 / total as f64) * 100.0
        }
    }

    // === 机构管理相关方法 ===

    pub fn register_institution(&mut self, request: RegisterRequest) -> Result<Principal, String> {
        let caller =ic_cdk::caller();
        let institution_id = match Principal::from_text(&request.principal) {
            Ok(principal) => principal,
            Err(_) => return Err("Invalid Principal ID format".to_string()),
        };        
        // 检查机构名是否已存在
        if self.name_to_id.contains_key(&request.name) {
            return Err("机构名已存在".to_string());
        }
        
        let password = request.password.unwrap_or_else(|| DEFAULT_PASSWORD.to_string());
        let password_hash = Self::hash_password(&password);

        let institution = Institution {
            id: institution_id,
            name: request.name.clone(),
            full_name: request.full_name.clone(),
            password_hash,
            status: InstitutionStatus::Inactive,
            join_time: time(),
            last_active: time(),
            api_calls: 0,
            dcc_consumed: 0,
            data_uploads: 0,
            credit_score: CreditScore {
                score: 80,
                last_update: time(),
            },
            token_trading: TokenTrading {
                bought: 0,
                sold: 0,
            },
            data_service_enabled:true,
            query_price:0,
            reward_share_ratio:0,
            inbound_queries:0,
            outbound_queries:0,
            consumption:0,
            rewards:0,
            balance:0,
        };

        self.institutions.insert(institution_id, institution);
        self.name_to_id.insert(request.name, institution_id);
        self.caller_institutions
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(institution_id);

        Ok(institution_id)
    }

    pub fn update_status(&mut self, id: Principal, is_active: bool) -> Result<(), String> {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.status = if is_active {
                InstitutionStatus::Active
            } else {
                InstitutionStatus::Inactive
            };
            institution.last_active = time();
            Ok(())
        } else {
            Err("机构不存在".to_string())
        }
    }
    pub fn update_service_settings(
        &mut self,
        institution_id: Principal,
        request: UpdateServiceSettingsRequest
    ) -> Result<(), String> {
        // 获取机构信息
        let institution = self.institutions.get_mut(&institution_id)
            .ok_or_else(|| "机构不存在".to_string())?;
        
        // 更新设置
        institution.data_service_enabled = request.data_service_enabled;
        institution.query_price = request.query_price;
        institution.reward_share_ratio = 10;

        // 记录更新
        info!(
            "Updated service settings for institution {}: enabled={}, price={}, ratio={}", 
            institution.name,
            request.data_service_enabled,
            request.query_price,
            request.reward_share_ratio
        );

        Ok(())
    }
    pub fn get_institution(&self, id: Principal) -> Option<Institution> {
        self.institutions.get(&id).cloned()
    }

    pub fn get_all_institutions(&self) -> Vec<Institution> {
        self.institutions.values().cloned().collect()
    }

    pub fn delete_institution(&mut self, id: Principal) -> bool {
        if let Some(institution) = self.institutions.remove(&id) {
            self.name_to_id.remove(&institution.name);
            true
        } else {
            false
        }
    }

    pub fn update_credit_score(&mut self, id: Principal, score: u64) -> Result<(), String> {
        if let Some(institution) = self.institutions.get_mut(&id) {
            if score > 100 {
                return Err("信用分数不能超过100".to_string());
            }
            institution.credit_score.score = score;
            institution.credit_score.last_update = time();
            Ok(())
        } else {
            Err("机构不存在".to_string())
        }
    }
    pub fn institution_record_api_call(&mut self, id: Principal, record: CreditRecord, count: u64) {
        info!("institution_record_api_call: {}", id.to_text());
        
        // 更新查询方的统计
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.api_calls += count;
            // 如果查询的不是自己的记录，增加对外查询计数
            if record.institution_id != id {
                institution.outbound_queries += count;
            }
            institution.last_active = time();
        }
    
        // 如果查询的不是自己的记录，更新被查询方的统计
        if record.institution_id != id {
            if let Some(target_institution) = self.institutions.get_mut(&record.institution_id) {
                target_institution.inbound_queries += count;
                target_institution.last_active = time();
            }

             // 获取查询价格
             let target_institution = self.get_institution(record.institution_id);


            // 如果机构存在，处理代币操作
            if let Some(target_institution) = target_institution {
                let token_op =TokenOperation {
                    from_id: id,
                    to_id: record.institution_id,
                    user_did: record.user_did.clone(),
                    query_price: target_institution.query_price,
                    record: record.clone(),
                };

                // 在后台异步处理代币操作
                ic_cdk::spawn(async move {
                    if let Err(e) = RecordService::process_token_operation(token_op).await {
                        error!("代币操作处理失败: {}", e);
                    }
                });
            } else {
                warn!("未找到机构信息，跳过代币处理: {}", record.institution_id);
            }
        }

                               
                            
    }

    pub fn institution_record_data_upload(&mut self, id: Principal, count: u64) {
        info!("institution_record_data_upload: {}", id.to_text());

        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.data_uploads += count;
            institution.last_active = time();
            info!("institution_record_data_upload institution: {}",institution.data_uploads);

        }
    }
 
    pub fn increment_outbound_queries(&mut self, institution_id: Principal) {
        if let Some(institution) = self.institutions.get_mut(&institution_id) {
            institution.outbound_queries += 1;
        }
    }
    
    pub fn increment_inbound_queries(&mut self, institution_id: Principal) {
        if let Some(institution) = self.institutions.get_mut(&institution_id) {
            institution.inbound_queries += 1;
        }
    }
    pub async fn get_institution_balance(&self, id: Principal) -> Result<BalanceResponse, String> {
        if !self.institutions.contains_key(&id) {
            return Err("机构不存在".to_string());
        }
        
        let chain_balance = TOKEN_SERVICE.with(|service| {
            let token_service = service.borrow();
            let token_canister_id = token_service.token_canister_id;
            TokenService::query_balance_static(token_canister_id, id)
        }).await?;
        
        let usdt_value = (chain_balance as f64) * self.usdt_rate;
        
        Ok(BalanceResponse {
            dcc: chain_balance,
            usdt_value,
        })
    }

    
pub async fn recharge_dcc(id: Principal, request: DCCTransactionRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("DCC recharge initiated by {} for institution: {}", caller.to_text(), id.to_text());
    debug!("Recharge details - Amount: {}", request.dcc_amount);

    // Clone 必要的值，避免所有权问题
    let dcc_amount = request.dcc_amount;
    let remarks = request.remarks.clone();

    // 获取充值前余额
    let balance_before = TOKEN_SERVICE.with(|service| {
        let token_service = service.borrow();
        let token_canister_id = token_service.token_canister_id;
        TokenService::query_balance_static(token_canister_id, id)
    }).await?;
    
    info!("Balance before recharge: {}", balance_before);

    // 使用 TokenService 直接调用充值方法
    let result = TOKEN_SERVICE.with(|service| {
        let token_service = service.borrow();
        let token_canister_id = token_service.token_canister_id;
        
        // 使用普通函数调用而不是异步闭包
        TokenService::send_reward_static(token_canister_id, id, dcc_amount, remarks)
    }).await;

     // 验证充值后余额
     let balance_after = TOKEN_SERVICE.with(|service| {
        let token_service = service.borrow();
        let token_canister_id = token_service.token_canister_id;
        TokenService::query_balance_static(token_canister_id, id)
    }).await?;
    
    info!("Balance after recharge: {}", balance_after);
    
    if balance_after <= balance_before {
        return Err("充值未能增加余额".to_string());
    }

    // 如果成功，更新本地记录
    if result.is_ok() {
        ADMIN_SERVICE.with(|service| {
            let mut admin_service = service.borrow_mut();
            admin_service.record_token_trading(id, true, dcc_amount);
        });
    }

    result
}

pub async fn deduct_dcc(id: Principal, request: DCCTransactionRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("DCC deduction initiated by {} for institution: {}", caller.to_text(), id.to_text());
    debug!("Deduction details - Amount: {}", request.dcc_amount);

    // Clone 必要的值，避免所有权问题
    let dcc_amount = request.dcc_amount;
    let remarks = request.remarks.clone();

    // 使用 TokenService 直接调用扣除方法
    let result = TOKEN_SERVICE.with(|service| {
        let token_service = service.borrow();
        let token_canister_id = token_service.token_canister_id;
        
        // 使用普通函数调用而不是异步闭包
        TokenService::deduct_tokens_static(token_canister_id, id, dcc_amount, remarks)
    }).await;

    // 如果成功，更新本地记录
    if result.is_ok() {
        ADMIN_SERVICE.with(|service| {
            let mut admin_service = service.borrow_mut();
            admin_service.record_token_trading(id, false, dcc_amount);
        });
    }

    result
}

    pub fn update_usdt_rate(&mut self, rate: f64) -> Result<(), String> {
        if rate <= 0.0 {
            return Err("汇率必须大于0".to_string());
        }
        self.usdt_rate = rate;
        Ok(())
    }



    pub fn record_token_trading(&mut self, id: Principal, is_buy: bool, amount: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            if is_buy {
                institution.token_trading.bought += amount;
                institution.balance+=amount;
            } else {
                institution.token_trading.sold += amount;
                institution.balance-=amount;
            }
            institution.last_active = time();
        }
    }
    pub fn record_token_reward(&mut self, id: Principal, amount: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.rewards += amount;
            institution.balance +=amount;
            institution.last_active = time();
            info!("Updated institution rewards: +{} for {}", amount, id);
        }
    }

    pub fn record_token_consumption(&mut self, id: Principal, amount: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.consumption += amount;
            institution.balance -=amount;

            institution.last_active = time();
            info!("Updated institution consumption: +{} for {}", amount, id);
        }
    }




    // === 认证和会话相关方法 ===

    pub fn institution_login(&mut self, request: LoginRequest) -> LoginResponse {
        match self.name_to_id.get(&request.name) {
            Some(&id) => {
                if let Some(institution) = self.institutions.get_mut(&id) {
                    let password_hash = Self::hash_password(&request.password);
                    
                    if institution.password_hash == password_hash {
                        institution.last_active = time();
                          // 保存机构ID到本地存储
                        LoginResponse {
                            success: true,
                            full_name:institution.full_name.clone(),
                            institution_id: Some(id),
                            message: "登录成功".to_string(),
                        }
                    } else {
                        LoginResponse {
                            success: false,
                            institution_id: None,
                            full_name:"".to_string(),
                            message: "密码错误".to_string(),
                        }
                    }
                } else {
                    LoginResponse {
                        success: false,
                        institution_id: None,
                        full_name:"".to_string(),
                        message: "机构不存在".to_string(),
                    }
                }
            }
            None => LoginResponse {
                success: false,
                institution_id: None,
                full_name:"".to_string(),
                message: "机构不存在".to_string(),
            },
        }
    }

    pub fn change_password(&mut self, id: Principal, old_password: String, new_password: String) -> Result<(), String> {
        if let Some(institution) = self.institutions.get_mut(&id) {
            let old_hash = Self::hash_password(&old_password);
            if institution.password_hash == old_hash {
                institution.password_hash = Self::hash_password(&new_password);
                Ok(())
            } else {
                Err("原密码错误".to_string())
            }
        } else {
            Err("机构不存在".to_string())
        }
    }

    pub fn reset_password(&mut self, id: Principal) -> Result<String, String> {
        if let Some(institution) = self.institutions.get_mut(&id) {
            let new_password = DEFAULT_PASSWORD.to_string();
            institution.password_hash = Self::hash_password(&new_password);
            Ok(new_password)
        } else {
            Err("机构不存在".to_string())
        }
    }

    // === 查询辅助方法 ===
    
    pub fn get_caller_institutions(&self, caller: Principal) -> Vec<Institution> {
        if let Some(ids) = self.caller_institutions.get(&caller) {
            ids.iter()
                .filter_map(|id| self.institutions.get(id))
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    // === 日志和记录方法 ===
    
    pub fn log_event(&mut self, id: Principal, event_type: &str) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.last_active = time();
            // 这里可以添加事件日志记录逻辑
        }
    }
}

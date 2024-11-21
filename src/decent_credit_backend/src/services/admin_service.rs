use candid::{CandidType, Principal, Deserialize};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use crate::models::institution::*;

const DEFAULT_PASSWORD: &str = "changeme123"; // 默认密码

// 统计信息结构
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AdminStatistics {
    pub total_institutions: u64,
    pub active_institutions: u64,
    pub total_dcc_consumed: u64,
}

#[derive(CandidType, Deserialize)]
pub struct CreditRecord {
    pub id: String,
    pub institution_id: Principal,
    pub record_type: RecordType,
    pub content: Vec<u8>,  // 加密后的数据
    pub proof: Vec<u8>,    // zk-SNARK证明
    pub canister_id: String,
    pub timestamp: u64,
    pub status: RecordStatus,
    pub user_did: String
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordType {
    LoanRecord,
    RepaymentRecord, 
    NotificationRecord
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum RecordStatus {
    Pending,
    Confirmed,
    Rejected
}

pub struct AdminService {
    institutions: HashMap<Principal, Institution>,
    caller_institutions: HashMap<Principal, Vec<Principal>>,
    name_to_id: HashMap<String, Principal>,
    next_id: u64,
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
        }
    }

    // 生成密码哈希
    fn hash_password(password: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn generate_id(&mut self) -> Principal {
        let id = self.next_id;
        self.next_id += 1;
        let bytes = id.to_be_bytes();
        Principal::from_slice(&bytes)
    }

    // 修改注册函数，支持自定义密码
    pub fn register_institution(&mut self, request: RegisterRequest) -> Principal {
        let caller = ic_cdk::caller();
        let institution_id = self.generate_id();
        
        let password = request.password.unwrap_or_else(|| DEFAULT_PASSWORD.to_string());
        let password_hash = Self::hash_password(&password);

        let institution = Institution {
            id: institution_id,
            name: request.name.clone(),
            full_name: request.full_name,
            password_hash,
            status: InstitutionStatus::Active,
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
        };

        self.institutions.insert(institution_id, institution);
        self.name_to_id.insert(request.name, institution_id);
        self.caller_institutions
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(institution_id);

        institution_id
    }

    // 获取统计信息
    pub fn get_statistics(&self) -> AdminStatistics {
        let total_institutions = self.institutions.len();
        let active_institutions = self.institutions
            .values()
            .filter(|i| matches!(i.status, InstitutionStatus::Active))
            .count();
        
        let total_dcc_consumed = self.institutions
            .values()
            .map(|i| i.dcc_consumed)
            .sum();

        AdminStatistics {
            total_institutions: total_institutions as u64,
            active_institutions: active_institutions as u64,
            total_dcc_consumed,
        }
    }
    // 添加登录方法
    pub fn login(&mut self, request: LoginRequest) -> LoginResponse {
        match self.name_to_id.get(&request.name) {
            Some(&id) => {
                if let Some(institution) = self.institutions.get_mut(&id) {
                    let password_hash = Self::hash_password(&request.password);
                    
                    if institution.password_hash == password_hash {
                        institution.last_active = time();
                        LoginResponse {
                            success: true,
                            institution_id: Some(id),
                            message: "登录成功".to_string(),
                        }
                    } else {
                        LoginResponse {
                            success: false,
                            institution_id: None,
                            message: "密码错误".to_string(),
                        }
                    }
                } else {
                    LoginResponse {
                        success: false,
                        institution_id: None,
                        message: "机构不存在".to_string(),
                    }
                }
            }
            None => LoginResponse {
                success: false,
                institution_id: None,
                message: "机构不存在".to_string(),
            },
        }
    }

    // 修改密码
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

    // 重置密码
    pub fn reset_password(&mut self, id: Principal) -> Result<String, String> {
        if let Some(institution) = self.institutions.get_mut(&id) {
            let new_password = DEFAULT_PASSWORD.to_string();
            institution.password_hash = Self::hash_password(&new_password);
            Ok(new_password)
        } else {
            Err("机构不存在".to_string())
        }
    }

    // 获取机构信息
    pub fn get_institution(&self, id: Principal) -> Option<Institution> {
        self.institutions.get(&id).cloned()
    }

    // 获取所有机构
    pub fn get_all_institutions(&self) -> Vec<Institution> {
        self.institutions.values().cloned().collect()
    }

    // 获取调用者的机构
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

    // 更新机构状态
    pub fn update_status(&mut self, id: Principal, is_active: bool) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.status = if is_active {
                InstitutionStatus::Active
            } else {
                InstitutionStatus::Inactive
            };
            institution.last_active = time();
        }
    }

    // 删除机构
    pub fn delete_institution(&mut self, id: Principal) -> bool {
        if let Some(institution) = self.institutions.remove(&id) {
            self.name_to_id.remove(&institution.name);
            true
        } else {
            false
        }
    }

    // 记录 API 调用
    pub fn record_api_call(&mut self, id: Principal, count: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.api_calls += count;
            institution.last_active = time();
        }
    }

    // 记录数据上传
    pub fn record_data_upload(&mut self, id: Principal, count: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.data_uploads += count;
            institution.last_active = time();
        }
    }

    // 记录代币交易
    pub fn record_token_trading(&mut self, id: Principal, is_buy: bool, amount: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            if is_buy {
                institution.token_trading.bought += amount;
            } else {
                institution.token_trading.sold += amount;
            }
            institution.last_active = time();
        }
    }

    // 更新信用分数
    pub fn update_credit_score(&mut self, id: Principal, score: u64) {
        if let Some(institution) = self.institutions.get_mut(&id) {
            institution.credit_score.score = score;
            institution.credit_score.last_update = time();
        }
    }
}

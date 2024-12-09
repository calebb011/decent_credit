use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use log::{info, debug, warn, error};  // 替换原来的 log_info
use serde::Serialize;

use crate::services::admin_institution_service::*;
use crate::models::record::{DCCTransactionRequest, BalanceResponse};
use crate::models::dashboard::{AdminDashboardData};
use crate::models::institution::*;
use crate::services::token_service::*;
use ic_cdk::api::time;





/// 注册新机构
#[update]
pub async fn register_institution(request: RegisterRequest) -> Result<Principal, String> {
    let caller = ic_cdk::caller();
    info!("Institution registration attempt by {}", caller.to_text());
    debug!("Registration details - Name: {}, ", request.name);

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.register_institution(request) {
            Ok(id) => {
                info!("Successfully registered institution with ID: {}", id.to_text());
                Ok(id)
            },
            Err(e) => {
                error!("Failed to register institution: {}", e);
                Err(e)
            }
        }
    })
}


// 然后添加更新接口
#[update]
pub async fn update_service_settings(request: UpdateServiceSettingsRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("Service settings update initiated by {}", caller.to_text());
    debug!("Update details - Service enabled: {}, Query price: {}, Reward ratio: {}", 
        request.data_service_enabled,
        request.query_price,
        request.reward_share_ratio
    );

    // 验证参数
    if request.reward_share_ratio > 100 {
        error!("Invalid rewards share ratio: {}", request.reward_share_ratio);
        return Err("奖励分成比例必须在0-100之间".to_string());
    }

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.update_service_settings(caller, request) {
            Ok(_) => {
                info!("Successfully updated service settings");
                Ok(())
            },
            Err(e) => {
                error!("Failed to update service settings: {}", e);
                Err(e)
            }
        }
    })
}
/// 修改机构状态
#[update]
pub async fn update_institution_status(id: Principal, is_active: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("Institution status update by {} for ID: {}", caller.to_text(), id.to_text());
    debug!("New status: {}", if is_active { "Active" } else { "Inactive" });

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.update_status(id, is_active) {
            Ok(_) => {
                info!("Successfully updated institution status");
                Ok(())
            },
            Err(e) => {
                error!("Failed to update institution status: {}", e);
                Err(e)
            }
        }
    })
}

/// 获取机构信息
#[query]
pub fn get_institution(id: Principal) -> Option<Institution> {
    debug!("Fetching institution info for ID: {}", id.to_text());
    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        match service.get_institution(id) {
            Some(inst) => {
                debug!("Found institution: {}", inst.name);
                Some(inst)
            },
            None => {
                warn!("Institution not found for ID: {}", id.to_text());
                None
            }
        }
    })
}

/// 获取所有机构列表
#[query]
pub fn get_all_institutions() -> Vec<Institution> {
    debug!("Fetching all institutions");
    
    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        let institutions = service.get_all_institutions();
        info!("Retrieved {} institutions", institutions.len());
        institutions
    })
}

/// 更新信用分数
#[update]
pub async fn update_credit_score(id: Principal, score: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("Credit score update initiated by {} for ID: {}", caller.to_text(), id.to_text());
    debug!("New credit score: {}", score);

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.update_credit_score(id, score) {
            Ok(_) => {
                info!("Successfully updated credit score");
                Ok(())
            },
            Err(e) => {
                error!("Failed to update credit score: {}", e);
                Err(e)
            }
        }
    })
}


#[update]
pub async fn get_balance(id: Principal) -> Result<BalanceResponse, String> {
    debug!("Fetching balance for institution: {}", id.to_text());

    // 验证机构是否存在
    let exists = ADMIN_SERVICE.with(|service| {
        service.borrow().get_institution(id).is_some()
    });

    if !exists {
        return Err("机构不存在".to_string());
    }

    // 查询链上余额
    let chain_balance = TOKEN_SERVICE.with(|service| {
        let token_service = service.borrow();
        let token_canister_id = token_service.token_canister_id;
        TokenService::query_balance_static(token_canister_id, id)
    }).await?;


    
    let usdt_value = (chain_balance as f64) * 7.1;

    Ok(BalanceResponse {
        dcc: chain_balance,
        usdt_value,
    })
}

/// 更新USDT汇率
#[update]
pub async fn update_usdt_rate(rate: f64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("USDT rate update initiated by {}", caller.to_text());
    debug!("New USDT rate: {}", rate);

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.update_usdt_rate(rate) {
            Ok(_) => {
                info!("Successfully updated USDT rate");
                Ok(())
            },
            Err(e) => {
                error!("Failed to update USDT rate: {}", e);
                Err(e)
            }
        }
    })
}


#[update]
pub async fn record_token_trading(id: Principal, is_buy: bool, amount: u64) -> Result<(), String> {
    info!("Recording token trading for institution: {}", id.to_text());
    debug!("Trading details - Type: {}, Amount: {}", 
        if is_buy { "Buy" } else { "Sell" }, 
        amount
    );

    // 创建交易请求
    let request = DCCTransactionRequest {
        dcc_amount: amount,
        remarks: if is_buy { 
            "Purchase DCC tokens".to_string() 
        } else { 
            "Sell DCC tokens".to_string() 
        },
        tx_hash: format!("TX_{}_{}_{}", 
            if is_buy { "BUY" } else { "SELL" },
            time() / 1_000_000_000,
            id.to_text()
        ),
        usdt_amount: 0.0,
        created_at: time(),
    };

    // 使用关联函数语法调用
    let result = if is_buy {
        ADMIN_SERVICE.with(|_service| {
            AdminService::recharge_dcc(id, request)
        }).await
    } else {
        ADMIN_SERVICE.with(|_service| {
            AdminService::deduct_dcc(id, request)
        }).await
    };

    match result {
        Ok(_) => {
            debug!("Successfully processed token trading");
            Ok(())
        }
        Err(e) => {
            error!("Failed to process token trading: {}", e);
            Err(e)
        }
    }
}
// === 会话相关接口 ===

/// 登录接口
#[update]
pub async fn institution_login(request: LoginRequest) -> LoginResponse {
    info!("Login attempt for user: {}", request.name);
    debug!("Login attempt received");

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        let response = service.institution_login(request);
        if response.success {
            info!("Login successful for message11: {}", response.message);
        } else {
            warn!("Login failed for user");
        }
        response
    })
}

/// 修改密码
#[update]
pub async fn change_password(old_password: String, new_password: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("Password change attempt for user: {}", caller.to_text());
    debug!("Password change request received");

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.change_password(caller, old_password, new_password) {
            Ok(_) => {
                info!("Successfully changed password");
                Ok(())
            },
            Err(e) => {
                error!("Failed to change password: {}", e);
                Err(e)
            }
        }
    })
}

/// 重置密码
#[update]
pub async fn reset_password(id: Principal) -> Result<String, String> {
    info!("Password reset attempt for user: {}", id.to_text());
    debug!("Password reset request received");

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.reset_password(id) {
            Ok(new_password) => {
                info!("Successfully reset password");
                Ok(new_password)
            },
            Err(e) => {
                error!("Failed to reset password: {}", e);
                Err(e)
            }
        }
    })
}




candid::export_service!();
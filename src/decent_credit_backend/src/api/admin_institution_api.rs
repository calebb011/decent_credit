use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use log::{info, debug, warn, error};  // 替换原来的 log_info
use serde::Serialize;

use crate::services::admin_institution_service::ADMIN_SERVICE;
use crate::models::record::{DCCTransactionRequest, BalanceResponse};
use crate::models::dashboard::{AdminDashboardData};
use crate::models::institution::{
    Institution, LoginRequest, LoginResponse, RegisterRequest
};

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

/// DCC充值
#[update]
pub async fn recharge_dcc(id: Principal, request: DCCTransactionRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("DCC recharge initiated by {} for institution: {}", caller.to_text(), id.to_text());
    debug!("Recharge details - Amount: {}", request.dcc_amount);

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.process_dcc_recharge(id, request) {
            Ok(_) => {
                info!("Successfully processed DCC recharge");
                Ok(())
            },
            Err(e) => {
                error!("Failed to process DCC recharge: {}", e);
                Err(e)
            }
        }
    })
}

/// DCC扣除
#[update]
pub async fn deduct_dcc(id: Principal, request: DCCTransactionRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    info!("DCC deduction initiated by {} for institution: {}", caller.to_text(), id.to_text());
    debug!("Deduction details - Amount: {}", request.dcc_amount);

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        match service.process_dcc_deduction(id, request) {
            Ok(_) => {
                info!("Successfully processed DCC deduction");
                Ok(())
            },
            Err(e) => {
                error!("Failed to process DCC deduction: {}", e);
                Err(e)
            }
        }
    })
}

/// 获取DCC余额
#[query]
pub fn get_balance(id: Principal) -> Result<BalanceResponse, String> {
    debug!("Fetching balance for institution: {}", id.to_text());

    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        match service.get_institution_balance(id) {
            Ok(balance) => {
                debug!("Balance retrieved successfully");
                Ok(balance)
            },
            Err(e) => {
                warn!("Failed to get balance: {}", e);
                Err(e)
            }
        }
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



/// 记录代币交易
#[update]
pub fn record_token_trading(id: Principal, is_buy: bool, amount: u64) {
    info!("Recording token trading for institution: {}", id.to_text());
    debug!("Trading details - Type: {}, Amount: {}", 
        if is_buy { "Buy" } else { "Sell" }, 
        amount
    );

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_token_trading(id, is_buy, amount);
        debug!("Successfully recorded token trading");
    })
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
            info!("Login successful for message: {}", response.message);
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
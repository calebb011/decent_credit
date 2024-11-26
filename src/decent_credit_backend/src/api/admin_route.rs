use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;
use serde::Serialize;

use crate::services::admin_service::ADMIN_SERVICE;
use crate::models::*;


/// 注册新机构
#[update]
pub async fn register_institution(request: RegisterRequest) -> Result<Principal, String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "Institution registration attempt by {} for: {}", 
        caller.to_text(),
        request.name
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.register_institution(request)
    })
}

/// 修改机构状态
#[update]
pub async fn update_institution_status(id: Principal, is_active: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "Institution status update attempt for: {}", 
        id.to_text()
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.update_status(id, is_active)
    })
}

/// 获取机构信息
#[query]
pub fn get_institution(id: Principal) -> Option<Institution> {
    log_info(format!("Fetching institution: {}", id.to_text()));
    
    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution(id)
    })
}

/// 获取所有机构列表
#[query]
pub fn get_all_institutions() -> Vec<Institution> {
    log_info("Fetching all institutions");
    
    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_all_institutions()
    })
}

/// 更新信用分数
#[update]
pub async fn update_credit_score(id: Principal, score: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "Credit score update attempt for: {}", 
        id.to_text()
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.update_credit_score(id, score)
    })
}


/// DCC充值
#[update]
pub async fn recharge_dcc(id: Principal, request: DCCTransactionRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "DCC recharge attempt for: {}", 
        id.to_text()
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.process_dcc_recharge(id, request)
    })
}

/// DCC扣除
#[update]
pub async fn deduct_dcc(id: Principal, request: DCCTransactionRequest) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "DCC deduction attempt for: {}", 
        id.to_text()
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.process_dcc_deduction(id, request)
    })
}

/// 获取DCC余额
#[query]
pub fn get_balance(id: Principal) -> Result<BalanceResponse, String> {
    log_info(format!(
        "Fetching balance for: {}", 
        id.to_text()
    ));

    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution_balance(id)
    })
}

/// 更新USDT汇率
#[update]
pub async fn update_usdt_rate(rate: f64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(format!(
        "USDT rate update attempt: {}", 
        rate
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.update_usdt_rate(rate)
    })
}

// === 记录相关接口 ===

/// 记录API调用
#[update]
pub fn record_api_call(id: Principal, count: u64) {
    log_info(format!("Recording API calls: {}", count));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_api_call(id, count);
    })
}

/// 记录数据上传
#[update]
pub fn record_data_upload(id: Principal, count: u64) {
    log_info(format!("Recording data upload: {}", count));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_data_upload(id, count);
    })
}

/// 记录代币交易
#[update]
pub fn record_token_trading(id: Principal, is_buy: bool, amount: u64) {
    log_info(format!(
        "Recording token trading: {} {}", 
        if is_buy { "buy" } else { "sell" },
        amount
    ));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_token_trading(id, is_buy, amount);
    })
}


/// 获取管理员仪表板数据
#[query]
pub fn get_admin_dashboard() -> DashboardStats {
    log_info("Fetching admin dashboard stats");

    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_admin_dashboard()
    })
}

// === 会话相关接口 ===

/// 登录接口
#[update]
pub async fn login(request: LoginRequest) -> LoginResponse {
    log_info(format!("Login attempt: {}", request.name));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.login(request)
    })
}

/// 修改密码
#[update]
pub async fn change_password(old_password: String, new_password: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(format!("Password change attempt for: {}", caller.to_text()));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.change_password(caller, old_password, new_password)
    })
}

/// 重置密码
#[update]
pub async fn reset_password(id: Principal) -> Result<String, String> {
    log_info(format!("Password reset attempt for: {}", id.to_text()));

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.reset_password(id)
    })
}

candid::export_service!();

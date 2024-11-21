use candid::Principal;
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;
use crate::models::institution::{
    Institution,
    LoginRequest,
    LoginResponse,
    RegisterRequest
};
use crate::services::admin_service::{ADMIN_SERVICE};

// 机构管理接口
#[update]
pub fn register_institution(request: RegisterRequest) -> Principal {
    log_info(
        format!("Registering new institution: {}", request.name)
    );
    
    let result = ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.register_institution(request)
    });
    
    log_info(
        format!("Institution registered with ID: {}", result.to_text())
    );
    
    result
}

// 登录接口
#[update]
pub fn login(request: LoginRequest) -> LoginResponse {
    log_info(
        format!("Login attempt for institution: {}", request.name)
    );
    
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.login(request)
    })
}

// 修改密码接口
#[update]
pub fn change_password(old_password: String, new_password: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    log_info(
        format!("Password change attempt for institution: {}", caller.to_text())
    );
    
    if old_password.is_empty() || new_password.is_empty() {
        return Err("密码不能为空".to_string());
    }

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.change_password(caller, old_password, new_password)
    })
}

// 重置密码接口
#[update]
pub fn reset_password(id: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    log_info(
        format!("Password reset attempt for institution {} by {}", id.to_text(), caller.to_text())
    );

    if id == Principal::anonymous() {
        return Err("无效的机构ID".to_string());
    }

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.reset_password(id)
    })
}

#[query]
pub fn get_institution(id: Principal) -> Option<Institution> {
    log_info(
        format!("Fetching institution details for ID: {}", id.to_text())
    );
    
    if id == Principal::anonymous() {
        return None;
    }

    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution(id)
    })
}

#[query]
pub fn get_all_institutions() -> Vec<Institution> {
    log_info("Fetching all institutions".to_string());
    
    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_all_institutions()
    })
}

#[query]
pub fn get_caller_institutions() -> Vec<Institution> {
    let caller = ic_cdk::caller();
    log_info(
        format!("Fetching institutions for caller: {}", caller.to_text())
    );

    ADMIN_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_caller_institutions(caller)
    })
}

#[update]
pub fn update_institution_status(id: Principal, is_active: bool) {
    let caller = ic_cdk::caller();
    log_info(
        format!("Status update attempt for institution {} by {}", id.to_text(), caller.to_text())
    );

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.update_status(id, is_active);
    })
}

#[update]
pub fn delete_institution(id: Principal) -> bool {
    let caller = ic_cdk::caller();
    log_info(
        format!("Delete attempt for institution {} by {}", id.to_text(), caller.to_text())
    );

    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.delete_institution(id)
    })
}



// 记录相关接口
#[update]
pub fn record_api_call(id: Principal, count: u64) {
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_api_call(id, count);
    })
}

#[update]
pub fn record_data_upload(id: Principal, count: u64) {
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_data_upload(id, count);
    })
}

#[update]
pub fn record_token_trading(id: Principal, is_buy: bool, amount: u64) {
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_token_trading(id, is_buy, amount);
    })
}

#[update]
pub fn update_credit_score(id: Principal, score: u64) {
    ADMIN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.update_credit_score(id, score);
    })
}
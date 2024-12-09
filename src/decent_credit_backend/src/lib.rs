<<<<<<< HEAD
use candid::{CandidType, Deserialize, Principal};  // 改为直接从 candid 导入 Principal
use ic_cdk::api::time;
use ic_cdk_macros::*;
use std::collections::HashMap;
use std::cell::RefCell;

#[derive(CandidType, Deserialize, Clone)]
pub struct Institution {
    id: Principal,
    name: String,
    registration_time: u64,
    is_active: bool,
    credit_score: u64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreditRecord {
    id: u64,
    institution: Principal,
    subject_id: String,
    record_type: String,
    data_hash: String,
    timestamp: u64,
    is_valid: bool,
}

// 系统状态
thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[derive(CandidType, Deserialize, Default)]
struct State {
    institutions: HashMap<Principal, Institution>,
    credit_records: Vec<CreditRecord>,
    record_counter: u64,
    admin: Option<Principal>,
}

// 初始化方法
#[init]
fn init() {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.admin = Some(ic_cdk::caller());
    });
}

// 注册新机构
#[update]
fn register_institution(name: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.institutions.contains_key(&caller) {
            return Err("Institution already registered".to_string());
        }

        let institution = Institution {
            id: caller,
            name,
            registration_time: time(),
            is_active: true,
            credit_score: 100,
        };

        state.institutions.insert(caller, institution);
        Ok(())
    })
}

// 查询机构信息
#[query]
fn get_institution(id: Principal) -> Option<Institution> {
    STATE.with(|state| {
        state.borrow().institutions.get(&id).cloned()
    })
}
=======
use ic_cdk_macros::*;
use candid::Principal;
use log::{debug, info, warn, error};

pub mod api;
pub mod models;
pub mod services;
mod utils;

#[init]
fn init() {
    // 初始化日志
    let _ = utils::logger::init_logger();
    info!("Logger initialized");

    // 初始化 crypto service
    if let Err(e) = services::crypto_service::init_crypto_service() {
        error!("Failed to initialize crypto service: {:?}", e);
        ic_cdk::trap("Crypto service initialization failed");
    }
    info!("Crypto service initialized");

    // 初始化 record service
    services::record_service::init_record_service();
    info!("Record service initialized");

    info!("All services initialized successfully");
}

#[post_upgrade]
fn post_upgrade() {
    info!("Starting post upgrade initialization");
    
    let _ = utils::logger::init_logger();
    if let Err(e) = services::crypto_service::init_crypto_service() {
        error!("Failed to initialize crypto service during upgrade: {:?}", e);
        ic_cdk::trap("Crypto service initialization failed during upgrade");
    }
    services::record_service::init_record_service();

    info!("Post upgrade initialization completed");
}

// 重导出 API 接口
pub use api::credit_assessment_api::*;
pub use api::dashboard_api::*;
pub use api::record_api::*;
pub use api::admin_institution_api::*;

// 公共类型定义
pub type Result<T> = std::result::Result<T, String>;

// 只需要一个
ic_cdk::export_candid!();
>>>>>>> dec-test

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
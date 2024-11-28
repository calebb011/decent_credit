use ic_cdk_macros::*;
use candid::Principal;
use log::{debug, info, warn, error};

pub mod api;
pub mod models;
pub mod services;
mod utils;

#[init]
fn init() {
    // 按顺序初始化各个服务，使用 match 或 if let 处理错误
    utils::logger::init_logger();
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
    
    // 在升级后重新初始化服务
    utils::logger::init_logger();
    if let Err(e) = services::crypto_service::init_crypto_service() {
        error!("Failed to initialize crypto service during upgrade: {:?}", e);
        ic_cdk::trap("Crypto service initialization failed during upgrade");
    }
    services::record_service::init_record_service();

    info!("Post upgrade initialization completed");
}

// 只重导出前端需要的 API 接口 
pub use api::credit_api::*;
pub use api::dashboard_api::*;
pub use api::history_api::*;
pub use api::record_api::*;
pub use api::admin_api::*;

// 定义接口可能用到的公共类型
pub type Result<T> = std::result::Result<T, String>;

#[query(name = "did_you_update")]
fn did_you_update() -> Principal {
    ic_cdk::api::caller()
}

candid::export_service!();
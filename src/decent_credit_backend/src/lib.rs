use ic_cdk_macros::*;
use candid::Principal;
use log::{debug, info, warn, error};
pub mod api;  // 改为 pub mod
pub mod models;  // struct需要在前端使用也要pub
pub mod services;  // service实现需要pub
// 内部模块声明

mod utils;
#[init]
fn init() {
    services::record_service::init_record_service();
    services::crypto_service::init_crypto_service();
    utils::logger::init_logger();
    info!("Service initialized");
}

// 只重导出前端需要的 API 接口
pub use api::credit_api::*;        // 信用相关接口
pub use api::dashboard_api::*;     // 仪表盘接口
pub use api::history_api::*;       // 历史记录接口
pub use api::record_api::*;        // 记录相关接口
pub use api::admin_api::*;        // 记录相关接口

   

// 定义接口可能用到的公共类型
pub type Result<T> = std::result::Result<T, String>;

#[ic_cdk::query(name = "did_you_update")]
fn did_you_update() -> candid::Principal { 
    ic_cdk::api::caller()
}
candid::export_service!();
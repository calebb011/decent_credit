use ic_cdk_macros::*;
use candid::Principal;

// 内部模块声明
mod models;  // 不需要 pub,因为只在内部使用
mod services;  // 不需要 pub,因为只在内部使用
pub mod api;  // 需要 pub,因为要暴露给前端

#[init]
fn init() {
    services::record_service::init_record_service();
    services::crypto_service::init_crypto_service();
}

// 只重导出前端需要的 API 接口
pub use api::credit_api::*;        // 信用相关接口
pub use api::dashboard_api::*;     // 仪表盘接口
pub use api::history_api::*;       // 历史记录接口
pub use api::record_api::*;        // 记录相关接口
pub use api::admin_api::*;        // 记录相关接口

// admin 接口可能需要特殊权限,可以单独控制
pub use api::admin_api::*;         

// 定义接口可能用到的公共类型
pub type Result<T> = std::result::Result<T, String>;
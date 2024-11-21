use ic_cdk_macros::*;
use candid::Principal;

// 导出模块
pub mod api;
pub mod models;
pub mod services;




#[init]
fn init() {
    services::record_services::init_record_service();
    services::crypto_service::init_crypto_service();
}


// 重新导出 API 接口
pub use api::admin_route::*;
pub use api::record_route::*;
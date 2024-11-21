use ic_cdk_macros::*;
use candid::Principal;

// 导出模块
pub mod api;
pub mod models;
pub mod services;

// 导入 institution 相关类型
use models::institution::{
    Institution,
    LoginRequest,
    LoginResponse,
    RegisterRequest
};

// 导入 record 相关类型
use models::record::{
    CreditRecord,
    RecordSubmissionRequest,
    RecordSubmissionResponse,
    RecordQueryParams,
    RecordStatus
};

// 导入 identity 相关类型
use models::identity::{
    UserIdentity,
    IdentityCredential,
    CredentialType
};

// 导入 admin 相关类型

#[init]
fn init() {
    services::record_services::init_record_service();
    services::identity::init_identity_service();
}

// 导出 Candid 接口
#[query(name = "idl")]
fn export_candid() -> String {
    candid::export_service!();
    __export_service()
}

// 重新导出 API 接口
pub use api::admin_route::*;
pub use api::record_route::*;
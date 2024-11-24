use candid::Principal;
use ic_cdk_macros::*;
use ic_cdk::api::print as log_info;

use crate::services::dashboard_service::DASHBOARD_SERVICE;
use crate::models::dashboard::*;

/// 获取管理员看板数据
#[query]
pub fn get_admin_dashboard_data() -> AdminDashboardData {
    log_info("Fetching admin dashboard data");

    DASHBOARD_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_admin_dashboard()
    })
}

/// 获取机构仪表板数据
#[query]
pub fn get_institution_dashboard_data(institution_id: Principal) -> Result<InstitutionDashboardData, String> {
    log_info(format!(
        "Fetching dashboard data for institution: {}", 
        institution_id.to_text()
    ));

    DASHBOARD_SERVICE.with(|service| {
        let service = service.borrow();
        service.get_institution_dashboard(institution_id)
    })
}

/// 记录API调用
#[update]
pub fn record_api_call(institution_id: Principal) {
    log_info(format!("Recording API call for institution: {}", institution_id.to_text()));
    
    DASHBOARD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_api_call(institution_id);
    });
}

/// 记录数据上传
#[update]
pub fn record_data_upload(institution_id: Principal) {
    log_info(format!("Recording data upload for institution: {}", institution_id.to_text()));
    
    DASHBOARD_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.record_data_upload(institution_id);
    });
}



candid::export_service!(); 
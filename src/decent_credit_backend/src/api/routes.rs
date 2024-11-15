#[ic_cdk_macros::update]
fn register_institution(name: String, full_name: String) -> Principal {
    ADMIN_SERVICE.with(|service| {
        service.borrow_mut().register_institution(name, full_name)
    })
}

#[ic_cdk_macros::query]
fn get_institution(id: Principal) -> Option<Institution> {
    ADMIN_SERVICE.with(|service| {
        service.borrow().get_institution(id)
    })
}

#[ic_cdk_macros::query]
fn get_all_institutions() -> Vec<Institution> {
    ADMIN_SERVICE.with(|service| {
        service.borrow().get_all_institutions()
    })
}

#[ic_cdk_macros::update]
fn update_institution_status(id: Principal, is_active: bool) {
    ADMIN_SERVICE.with(|service| {
        service.borrow_mut().update_status(id, is_active)
    })
}

#[ic_cdk_macros::update]
fn record_token_trading(id: Principal, is_buy: bool, amount: u64) {
    ADMIN_SERVICE.with(|service| {
        service.borrow_mut().record_token_trading(id, is_buy, amount)
    })
}
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

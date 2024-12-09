use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::{caller, time};
use ic_cdk_macros::*;
use std::cell::RefCell;
use std::collections::HashMap;

#[derive(Default)]
struct TokenData {
    balances: HashMap<Principal, u64>,
    total_supply: u64,
    last_block_height: u64,
    admin: Option<Principal>,
}

thread_local! {
    static TOKEN: RefCell<TokenData> = RefCell::new(TokenData {
        balances: HashMap::new(),
        total_supply: 1_000_000_000_000,
        last_block_height: 0,
        admin: None,
    });
}

#[derive(CandidType, Deserialize)]
pub struct TokenTransferArgs {
    pub to: Principal,
    pub amount: u64,
    pub memo: Vec<u8>,
    pub from_subaccount: Option<Vec<u8>>,
    pub to_subaccount: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct TransferResult {
    pub block_height: u64,
    pub tx_hash: String,
}

#[init]
fn init() {
    TOKEN.with(|token| {
        let mut data = token.borrow_mut();
        let canister_id = ic_cdk::id();
        let total_supply = data.total_supply;  // 先获取值
        data.balances.insert(canister_id, total_supply);
        data.admin = Some(canister_id);
    });
}

#[update]
fn set_admin(new_admin: Principal) -> Result<(), String> {
    let caller = caller();
    TOKEN.with(|token| {
        let mut data = token.borrow_mut();
        if data.admin.is_none() || caller == ic_cdk::id() {
            data.admin = Some(new_admin);
            Ok(())
        } else {
            Err("Unauthorized".to_string())
        }
    })
}

#[update]
fn initialize_canister_balance() -> Result<(), String> {
    let canister_id = ic_cdk::id();
    
    TOKEN.with(|token| {
        let mut data = token.borrow_mut();
        let total = data.total_supply;  // 先获取值
        data.balances.insert(canister_id, total);
        Ok(())
    })
}
#[update]
fn transfer(args: TokenTransferArgs) -> TransferResult {
    TOKEN.with(|token| {
        let mut data = token.borrow_mut();
        
        // 直接使用 canister_id 作为转账来源
        let from = ic_cdk::id();
        
        // 检查余额
        let from_balance = *data.balances.get(&from).unwrap_or(&0);
        if from_balance < args.amount {
            ic_cdk::trap("Insufficient balance");
        }
        
        // 更新余额
        data.balances.insert(from, from_balance - args.amount);
        let to_balance = *data.balances.get(&args.to).unwrap_or(&0);
        data.balances.insert(args.to, to_balance + args.amount);
        
        // 更新区块高度
        data.last_block_height += 1;
        
        TransferResult {
            block_height: data.last_block_height,
            tx_hash: format!(
                "tx_{}_{}_{}",
                time(),
                from,
                args.to
            ),
        }
    })
}

#[query]
fn get_admin() -> Principal {
    TOKEN.with(|token| {
        token.borrow().admin.unwrap_or(Principal::anonymous())
    })
}

#[query]
fn balance_of(account: Principal) -> u64 {
    TOKEN.with(|token| {
        *token.borrow().balances.get(&account).unwrap_or(&0)
    })
}

#[query]
fn name() -> String {
    "Decent Credit Token".to_string()
}

#[query]
fn symbol() -> String {
    "DCC".to_string()
}

#[query]
fn decimals() -> u8 {
    8
}

#[query]
fn total_supply() -> u64 {
    TOKEN.with(|token| {
        token.borrow().total_supply
    })
}

ic_cdk::export_candid!();
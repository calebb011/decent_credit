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
}

thread_local! {
    static TOKEN: RefCell<TokenData> = RefCell::new(TokenData {
        balances: HashMap::new(),
        total_supply: 1_000_000_000_000, // 初始供应量：1 trillion
        last_block_height: 0,
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
        let mut token = token.borrow_mut();
        let owner = caller();
        token.balances.insert(owner, token.total_supply);
    });
}

#[update]
fn transfer(args: TokenTransferArgs) -> TransferResult {
    let from = caller();
    
    TOKEN.with(|token| {
        let mut token = token.borrow_mut();
        
        // 检查余额
        let from_balance = token.balances.get(&from).unwrap_or(&0);
        if *from_balance < args.amount {
            ic_cdk::trap("Insufficient balance");
        }
        
        // 更新余额
        token.balances.insert(from, from_balance - args.amount);
        let to_balance = token.balances.get(&args.to).unwrap_or(&0);
        token.balances.insert(args.to, to_balance + args.amount);
        
        // 更新区块高度
        token.last_block_height += 1;
        
        // 生成交易哈希
        let tx_hash = format!(
            "tx_{}_{}_{}",
            time(),
            from,
            args.to
        );
        
        TransferResult {
            block_height: token.last_block_height,
            tx_hash,
        }
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

#[pre_upgrade]
fn pre_upgrade() {
    // 保存状态
}

#[post_upgrade]
fn post_upgrade() {
    // 恢复状态
}

// 为 candid 生成接口定义
ic_cdk::export_candid!();
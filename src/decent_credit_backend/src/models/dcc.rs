// models/credit.rs
use candid::{CandidType, Deserialize};
use candid::Principal;

// === DCC交易相关结构 ===
#[derive(CandidType, Deserialize)]
pub struct DCCTransactionRequest {
    pub dcc_amount: u64,
    pub usdt_amount: f64,
    pub tx_hash: String,
    pub remarks: String,
}

#[derive(CandidType, Serialize)]
pub struct BalanceResponse {
    pub dcc: u64,
    pub usdt_value: f64,
}
// token.rs

use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize)]
pub struct TokenTrading {
    pub bought: u64,
    pub sold: u64,
}
#[derive(CandidType, Deserialize, Clone, Debug)] 
pub struct TokenBalance {
   pub user_id: String,
   pub amount: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TokenTransaction {
   pub id: String,
   pub from: String,
   pub to: String, 
   pub amount: u64,
   pub timestamp: u64,
   pub transaction_type: TransactionType,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransactionType {
   Deposit,
   Reward,
   Payment,
   Fee
}
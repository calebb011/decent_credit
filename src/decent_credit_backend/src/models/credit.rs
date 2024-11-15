// credit.rs 
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum CreditEventType {
   Loan,
   Repayment,
   Default,
   Other
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreditEvent {
   pub id: String,
   pub user_id: String,
   pub provider_id: String,
   pub event_type: CreditEventType,
   pub amount: u64,
   pub timestamp: u64,
   pub encrypted_data: Vec<u8>,
   pub canister_id: String,
   pub proof: Vec<u8>,  // ZK证明
}


#[derive(CandidType, Deserialize)]
pub struct CreditScore {
    pub score: u64,
    pub last_update: u64,
}
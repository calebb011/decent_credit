// user.rs
#[derive(CandidType, Deserialize)]
pub struct Institution {
    pub id: Principal,
    pub name: String,
    pub full_name: String,
    pub status: InstitutionStatus,
    pub join_time: u64,
    pub last_active: u64,
    pub api_calls: u64,
    pub dcc_consumed: u64,
    pub data_uploads: u64,
    pub credit_score: CreditScore,
    pub token_trading: TokenTrading,
}

#[derive(CandidType, Deserialize)]
pub enum InstitutionStatus {
    Active,
    Inactive,
}
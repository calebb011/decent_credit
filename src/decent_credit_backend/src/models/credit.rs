use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;


// === 风险评估相关结构 ===
#[derive(CandidType, Deserialize, Clone)] // 
pub struct RiskAssessment {
    pub credit_score: u32,
    pub risk_level: String,
    pub assessment_details: Vec<String>,
    pub suggestions: Vec<String>,
}


#[derive(CandidType, Deserialize, Clone)]
pub struct RiskAssessmentReport {
    pub report_id: String,
    pub user_did: String,
    pub institution_id: Principal,
    pub assessment: RiskAssessment,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize)]
pub struct AssessmentResponse {
    pub status: String,
    pub message: Option<String>,
    pub data: Option<RiskAssessmentReport>,
}

#[derive(CandidType, Deserialize)]
pub struct AssessmentListResponse {
    pub status: String,
    pub message: Option<String>,
    pub data: Vec<RiskAssessmentReport>,
}


// === 特征提取结构 ===
#[derive(Debug, Clone)]
pub struct CreditFeatures {
    // 基础特征
    loan_frequency: f64,
    repayment_ratio: f64,
    overdue_ratio: f64,
    
    // 金额特征
    avg_loan_amount: f64,
    avg_repayment_amount: f64,
    amount_variance: f64,
    
    // 时序特征
    recent_activity_score: f64,
    overdue_trend: f64,
    repayment_consistency: f64,
    
    // 风险特征
    max_overdue_days: u64,
    total_overdue_amount: u64,
    overdue_frequency: f64
}

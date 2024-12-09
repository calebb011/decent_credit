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

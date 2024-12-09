use candid::{Principal, Encode, Decode, CandidType, Deserialize};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use log::{info, debug, warn, error};
use crate::services::admin_institution_service::ADMIN_SERVICE;  // 移到顶部
use crate::services::reports_storage::*;  // 移到顶部
use crate::services::record_service::RECORD_SERVICE;  // 移到顶部
use crate::services::storage_service::*;  // 移到顶部
use crate::utils::error::Error;

use crate::models::credit::*;
use crate::models::record::*;


// === 特征提取结构 ===
#[derive(Debug)]
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

pub struct CreditService {
    pub records: HashMap<String, CreditRecord>,      // 添加这个字段
    deduction_records: Vec<CreditDeductionRecord>,
    institution_records: HashMap<Principal, Vec<CreditRecord>>,
    admin_principals: Vec<Principal>,
   }

thread_local! {
    pub static CREDIT_SERVICE: RefCell<CreditService> = RefCell::new(CreditService::new());
}

impl CreditService {
    pub fn new() -> Self {
        Self {
            records: HashMap::new(),             // 初始化 records
            deduction_records: Vec::new(),
            institution_records: HashMap::new(),
            admin_principals: Vec::new(),
        }
    }
    pub fn assess_user_risk(&self, institution_id: Principal, user_did: &str) -> Result<RiskAssessment, String> {
        // 直接从 records HashMap 中获取用户记录
        let user_records: Vec<&CreditRecord> = self.records.values()
        .filter(|r| r.user_did == user_did)
        .collect();

    
        info!("Analyzing {} credit records for user {}", user_records.len(), user_did);
        
        // 检查是否有记录
        if user_records.is_empty() {
            return Err(format!("No credit records found for user {}", user_did));
        }
        
        // 提取信用特征
        let features = self.extract_credit_features(&user_records);
        
        // 计算信用分数
        let credit_score = self.calculate_credit_score(&features);
        
        // 生成风险评估
        let (risk_level, details, suggestions) = self.generate_risk_assessment(credit_score, &features);
        
        let assessment = RiskAssessment {
            credit_score,
            risk_level: risk_level.clone(),
            assessment_details: details,
            suggestions,
        };
    
        info!("Successfully created risk assessment for user {}", user_did);
        Ok(assessment)
    }

fn extract_credit_features(&self, records: &[&CreditRecord]) -> CreditFeatures {
    let now = time();
    
    // 按类型分类记录
    let loan_records: Vec<_> = records.iter()
        .filter(|r| matches!(r.record_type, RecordType::LoanRecord))
        .collect();
        
    let repayment_records: Vec<_> = records.iter()
        .filter(|r| matches!(r.record_type, RecordType::RepaymentRecord))
        .collect();
        
    let overdue_records: Vec<_> = records.iter()
        .filter(|r| matches!(r.record_type, RecordType::OverdueRecord))
        .collect();

    // 计算基础特征
    let loan_frequency = self.calculate_frequency(&loan_records);
    let repayment_ratio = if loan_records.is_empty() {
        0.0
    } else {
        repayment_records.len() as f64 / loan_records.len() as f64
    };
    let overdue_ratio = if loan_records.is_empty() {
        1.0
    } else {
        overdue_records.len() as f64 / loan_records.len() as f64
    };

    // 计算金额特征
    let avg_loan_amount = self.calculate_average_amount(&loan_records);
    let avg_repayment_amount = self.calculate_average_amount(&repayment_records);
    let amount_variance = self.calculate_amount_variance(&records);

    // 计算时序特征
    let recent_activity_score = self.calculate_recent_activity(&records);
    let overdue_trend = self.calculate_overdue_trend(&overdue_records);
    let repayment_consistency = self.calculate_repayment_consistency(&repayment_records);

    // 计算风险特征
    let (max_overdue_days, total_overdue_amount, overdue_frequency) = 
        self.extract_overdue_features(&overdue_records);

    CreditFeatures {
        loan_frequency,
        repayment_ratio,
        overdue_ratio,
        avg_loan_amount,
        avg_repayment_amount,
        amount_variance,
        recent_activity_score,
        overdue_trend,
        repayment_consistency,
        max_overdue_days,
        total_overdue_amount,
        overdue_frequency
    }
}
// 修改计算频率的方法，避免 unwrap
fn calculate_frequency(&self, records: &[&&CreditRecord]) -> f64 {
    let now = time();
    
    match records.len() {
        0 => 0.0,
        1 => {
            let record_time = records[0].timestamp;
            let time_span = (now - record_time) as f64;
            let months = time_span / (30.0 * 24.0 * 60.0 * 60.0 * 1_000_000_000.0);
            1.0 / months.max(1.0)
        }
        _ => {
            let timestamps: Vec<u64> = records.iter()
                .map(|r| r.timestamp)
                .collect();
            
            let max_time = timestamps.iter()
                .max()
                .copied()
                .unwrap_or(now);
            let min_time = timestamps.iter()
                .min()
                .copied()
                .unwrap_or(now);
                
            let time_span = (max_time - min_time) as f64;
            let months = time_span / (30.0 * 24.0 * 60.0 * 60.0 * 1_000_000_000.0);
            
            records.len() as f64 / months.max(1.0)
        }
    }
}
fn calculate_average_amount(&self, records: &[&&CreditRecord]) -> f64 {
    if records.is_empty() {
        return 0.0;
    }

    let total_amount: u64 = records.iter()
        .map(|r| match &r.content {
            RecordContent::Loan(content) => content.amount,
            RecordContent::Repayment(content) => content.amount,
            RecordContent::Overdue(content) => content.amount,
        })
        .sum();

    total_amount as f64 / records.len() as f64
}

fn calculate_amount_variance(&self, records: &[&CreditRecord]) -> f64 {
    if records.is_empty() {
        return 0.0;
    }

    let amounts: Vec<f64> = records.iter()
        .map(|r| match &r.content {
            RecordContent::Loan(content) => content.amount,
            RecordContent::Repayment(content) => content.amount,
            RecordContent::Overdue(content) => content.amount,
        })
        .map(|a| a as f64)
        .collect();

    let mean = amounts.iter().sum::<f64>() / amounts.len() as f64;
    let variance = amounts.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / amounts.len() as f64;

    variance
}

fn calculate_recent_activity(&self, records: &[&CreditRecord]) -> f64 {
    let now = time();
    let thirty_days_ago = now - 30 * 24 * 60 * 60 * 1_000_000_000;
    
    let recent_records: Vec<_> = records.iter()
        .filter(|r| r.timestamp > thirty_days_ago)
        .collect();
        
    if records.is_empty() {
        0.0
    } else {
        recent_records.len() as f64 / records.len() as f64
    }
}

fn calculate_overdue_trend(&self, overdue_records: &[&&CreditRecord]) -> f64 {
    if overdue_records.len() < 2 {
        return 0.0;
    }

    let overdue_amounts: Vec<(u64, f64)> = overdue_records.iter()
        .map(|r| match &r.content {
            RecordContent::Overdue(content) => (r.timestamp, content.amount as f64),
            _ => unreachable!(),
        })
        .collect();

    let n = overdue_amounts.len() as f64;
    let mean_x: f64 = overdue_amounts.iter().map(|(t, _)| *t as f64).sum::<f64>() / n;
    let mean_y: f64 = overdue_amounts.iter().map(|(_, a)| *a).sum::<f64>() / n;

    let covariance: f64 = overdue_amounts.iter()
        .map(|(t, a)| (*t as f64 - mean_x) * (a - mean_y))
        .sum::<f64>();

    let variance_x: f64 = overdue_amounts.iter()
        .map(|(t, _)| (*t as f64 - mean_x).powi(2))
        .sum::<f64>();

    if variance_x == 0.0 {
        0.0
    } else {
        covariance / variance_x
    }
}

fn calculate_repayment_consistency(&self, repayment_records: &[&&CreditRecord]) -> f64 {
    if repayment_records.is_empty() {
        return 0.0;
    }

    let repayment_data: Vec<(String, u64)> = repayment_records.iter()
        .filter_map(|r| {
            if let RecordContent::Repayment(content) = &r.content {
                Some((content.repayment_date.clone(), content.amount))
            } else {
                None
            }
        })
        .collect();

    let mut monthly_variance = 0.0;
    let mut month_counts = HashMap::new();

    for (date, amount) in repayment_data {
        let month = date.split('-').take(2).collect::<Vec<_>>().join("-");
        month_counts.entry(month)
            .or_insert_with(Vec::new)
            .push(amount as f64);
    }

    let variances: Vec<f64> = month_counts.values()
        .filter(|amounts| amounts.len() > 1)
        .map(|amounts| {
            let mean = amounts.iter().sum::<f64>() / amounts.len() as f64;
            amounts.iter()
                .map(|x| (x - mean).powi(2))
                .sum::<f64>() / (amounts.len() - 1) as f64
        })
        .collect();

    if variances.is_empty() {
        1.0
    } else {
        let avg_variance = variances.iter().sum::<f64>() / variances.len() as f64;
        1.0 / (1.0 + avg_variance.sqrt())
    }
}

fn extract_overdue_features(&self, overdue_records: &[&&CreditRecord]) -> (u64, u64, f64) {
    if overdue_records.is_empty() {
        return (0, 0, 0.0);
    }

    let max_overdue_days = overdue_records.iter()
        .filter_map(|r| {
            if let RecordContent::Overdue(content) = &r.content {
                Some(content.overdueDays)
            } else {
                None
            }
        })
        .max()
        .unwrap_or(0);

    let total_overdue_amount = overdue_records.iter()
        .filter_map(|r| {
            if let RecordContent::Overdue(content) = &r.content {
                Some(content.amount)
            } else {
                None
            }
        })
        .sum();

    let overdue_frequency = overdue_records.len() as f64;

    (max_overdue_days, total_overdue_amount, overdue_frequency)
}

fn calculate_credit_score(&self, features: &CreditFeatures) -> u32 {
    let base_score = 60.0;
    
    // 基础行为分数 (0-30分)
    let behavior_score = {
        // 对于新用户，应该有初始信用
        let loan_activity = if features.loan_frequency == 0.0 {
            5.0  // 给予新用户基础分
        } else {
            (features.loan_frequency * 5.0).min(10.0)
        };
        
        let repayment_score = if features.repayment_ratio == 0.0 && features.loan_frequency == 0.0 {
            5.0  // 新用户基础分
        } else {
            features.repayment_ratio * 10.0
        };
        
        let overdue_penalty = features.overdue_ratio * -10.0;
        
        loan_activity + repayment_score + overdue_penalty
    };
    
    // 金额特征分数 (0-20分)
    let amount_score = {
        let stability = (10.0 / (1.0 + features.amount_variance.sqrt())).min(10.0);
        let repayment_strength = if features.avg_loan_amount > 0.0 {
            (features.avg_repayment_amount / features.avg_loan_amount * 10.0).min(10.0)
        } else {
            0.0
        };
        
        stability + repayment_strength
    };
    
    // 时序特征分数 (0-20分)
    let time_score = {
        let recent_score = features.recent_activity_score * 10.0;
        let consistency_score = features.repayment_consistency * 5.0;
        let trend_score = if features.overdue_trend <= 0.0 { 5.0 } else { 0.0 };
        
        recent_score + consistency_score + trend_score
    };
    
    // 风险惩罚 (-50到0分)
    let risk_penalty = {
        let overdue_penalty = -(features.max_overdue_days as f64 / 30.0 * 20.0).min(20.0);
        let frequency_penalty = -(features.overdue_frequency * 10.0).min(20.0);
        let amount_penalty = -(features.total_overdue_amount as f64 / 10000.0).min(10.0);
        
        overdue_penalty + frequency_penalty + amount_penalty
    };
    
    let final_score = (base_score + behavior_score + amount_score + time_score + risk_penalty)
        .round()
        .max(0.0)
        .min(150.0);
        
    final_score as u32
}

fn generate_risk_assessment(
    &self,
    credit_score: u32,
    features: &CreditFeatures
) -> (String, Vec<String>, Vec<String>) {
    // 根据信用分数确定风险等级
    let risk_level = match credit_score {
        0..=50 => "High Risk",    // 原来是 0..=60
        51..=70 => "Medium Risk", // 原来是 61..=80
        _ => "Low Risk",
    }.to_string();
    
    // 生成详细评估信息
    let mut details = vec![
        format!("Credit Score: {}", credit_score),
        format!("Loan Activity Frequency: {:.2} per month", features.loan_frequency),
        format!("Repayment to Loan Ratio: {:.2}%", features.repayment_ratio * 100.0),
    ];
    
    // 添加逾期相关信息
    if features.overdue_frequency > 0.0 {
        details.push(format!("Overdue Frequency: {} times", features.overdue_frequency));
        details.push(format!("Maximum Overdue Days: {} days", features.max_overdue_days));
        details.push(format!("Total Overdue Amount: {}", features.total_overdue_amount));
    }
    
    // 添加时序分析信息
    if features.repayment_consistency > 0.8 {
        details.push("High repayment consistency observed".to_string());
    }
    if features.overdue_trend != 0.0 {
        details.push(format!("Overdue Trend: {}", 
            if features.overdue_trend > 0.0 { "Increasing" } else { "Decreasing" }
        ));
    }

    // 生成建议
    let suggestions = match risk_level.as_str() {
        "High Risk" => {
            let mut sugg = vec![
                "Immediate attention required to improve credit status".to_string(),
                "Focus on timely repayments to avoid further overdue records".to_string(),
            ];
            
            if features.overdue_frequency > 2.0 {
                sugg.push("Multiple overdue records detected - establish repayment plan".to_string());
            }
            if features.overdue_trend > 0.0 {
                sugg.push("Increasing trend in overdue amounts - seek financial counseling".to_string());
            }
            if features.repayment_ratio < 0.8 {
                sugg.push("Improve loan repayment ratio to build better credit".to_string());
            }
            
            sugg
        },
        "Medium Risk" => {
            let mut sugg = vec![
                "Maintain consistent repayment schedule".to_string(),
                "Monitor and improve credit behavior".to_string(),
            ];
            
            if features.repayment_consistency < 0.7 {
                sugg.push("Work on more consistent repayment patterns".to_string());
            }
            if features.overdue_ratio > 0.0 {
                sugg.push("Address any outstanding overdue payments".to_string());
            }
            if features.recent_activity_score < 0.5 {
                sugg.push("Consider increasing positive credit activities".to_string());
            }
            
            sugg
        },
        _ => {
            let mut sugg = vec![
                "Excellent credit status - maintain current practices".to_string(),
                "Eligible for premium financial services".to_string(),
            ];
            
            if features.loan_frequency < 0.5 {
                sugg.push("Consider diversifying credit portfolio".to_string());
            }
            if features.repayment_consistency > 0.9 {
                sugg.push("Outstanding repayment consistency - qualified for preferential rates".to_string());
            }
            if features.recent_activity_score > 0.8 {
                sugg.push("Strong recent credit activity - consider expanding credit limits".to_string());
            }
            
            sugg
        },
    };

    (risk_level, details, suggestions)
}


pub fn query_assessment_reports(
    &self,
    institution_id: Principal,
    days: Option<u64>
) -> AssessmentListResponse {
   // 使用 with_reports_storage 辅助函数来确保正确的借用
let reports = with_reports_storage(|storage| {
    storage.query_reports(institution_id)
});
    AssessmentListResponse {
        status: "SUCCESS".to_string(),
        message: None,
        data: reports,
    }
}
}

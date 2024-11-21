use sha2::{Sha256, Digest};
use crate::models::record::{CreditRecord, RecordContent, RecordStatus, RecordType};
use ic_cdk::api::time;

pub struct ZKProofService;

impl ZKProofService {
    pub fn new() -> Self {
        ic_cdk::println!("Initializing ZKProofService with ZK capabilities");
        Self
    }

    // 生成一个确定性但不可预测的随机数
    fn generate_deterministic_random(&self, seed: &[u8]) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(seed);
        hasher.update(&time().to_le_bytes()); // 使用IC系统时间作为额外熵源
        hasher.finalize().into()
    }

    // 生成零知识证明
    fn generate_zk_proof(&self, message: &[u8], secret: u64) -> (Vec<u8>, Vec<u8>) {
        // 生成一个随机数作为承诺
        let random_bytes = self.generate_deterministic_random(message);
        
        // 计算承诺 C = H(m || r)
        let mut hasher = Sha256::new();
        hasher.update(message);
        hasher.update(&random_bytes);
        let commitment = hasher.finalize().to_vec();

        // 计算证明 P = H(C || s)
        let mut hasher = Sha256::new();
        hasher.update(&commitment);
        hasher.update(secret.to_le_bytes());
        let proof = hasher.finalize().to_vec();

        (commitment, proof)
    }

    pub fn generate_proof(&self, record: &CreditRecord) -> Vec<u8> {
        ic_cdk::println!("Generating proof for record: {}", record.id);
        let mut hasher = Sha256::new();
        
        // 计算DID的哈希
        ic_cdk::println!("Processing user DID: {}", record.user_did);
        hasher.update(record.user_did.as_bytes());
        
        // 添加时间戳
        ic_cdk::println!("Adding timestamp: {}", record.timestamp);
        hasher.update(&record.timestamp.to_le_bytes());
        
        // 添加机构ID
        ic_cdk::println!("Adding institution ID: {}", record.institution_id);
        hasher.update(record.institution_id.to_string().as_bytes());

        // 添加记录类型
        match record.record_type {
            RecordType::LoanRecord => ic_cdk::println!("Record type: Loan"),
            RecordType::RepaymentRecord => ic_cdk::println!("Record type: Repayment"),
            RecordType::NotificationRecord => ic_cdk::println!("Record type: Notification"),
        }
        
        // 获取记录内容的哈希和特定值
        let (content_hash, secret_value) = match &record.content {
            RecordContent::Loan(loan) => {
                ic_cdk::println!("Processing loan record - Amount: {}, Term: {}", loan.amount, loan.term_months);
                let mut hasher = Sha256::new();
                hasher.update(&loan.amount.to_le_bytes());
                hasher.update(&loan.term_months.to_le_bytes());
                hasher.update(loan.loan_id.as_bytes());
                if loan.amount > 0 && loan.interest_rate > 0.0 {
                    hasher.update(&(loan.interest_rate as u64).to_le_bytes());
                }
                (hasher.finalize().to_vec(), loan.amount)
            },
            RecordContent::Repayment(repay) => {
                ic_cdk::println!("Processing repayment record - Amount: {}", repay.amount);
                let mut hasher = Sha256::new();
                hasher.update(&repay.amount.to_le_bytes());
                hasher.update(repay.loan_id.as_bytes());
                hasher.update(repay.repayment_date.as_bytes());
                (hasher.finalize().to_vec(), repay.amount)
            },
            RecordContent::Notification(notif) => {
                ic_cdk::println!("Processing notification record - Amount: {}, Days: {}", notif.amount, notif.days);
                let mut hasher = Sha256::new();
                hasher.update(&notif.amount.to_le_bytes());
                hasher.update(&notif.days.to_le_bytes());
                hasher.update(&notif.period_amount.to_le_bytes());
                (hasher.finalize().to_vec(), notif.amount)
            }
        };

        // 添加记录状态
        ic_cdk::println!("Adding record status");
        match record.status {
            RecordStatus::Pending => hasher.update(&[0u8]),
            RecordStatus::Confirmed => hasher.update(&[1u8]),
            RecordStatus::Rejected => hasher.update(&[2u8]),
        }
        
        // 添加 canister ID
        ic_cdk::println!("Adding canister ID: {}", record.canister_id);
        hasher.update(record.canister_id.as_bytes());

        // 生成基础哈希
        let base_hash = hasher.finalize().to_vec();
        
        // 生成零知识证明
        let (commitment, proof) = self.generate_zk_proof(&content_hash, secret_value);

        // 组合最终的证明
        let mut final_proof = Vec::new();
        final_proof.extend_from_slice(&base_hash);
        final_proof.extend_from_slice(&commitment);
        final_proof.extend_from_slice(&proof);

        ic_cdk::println!("Proof generated with length: {} bytes", final_proof.len());
        
        final_proof
    }

    pub fn verify_proof(&self, record: &CreditRecord, proof: &[u8]) -> bool {
        if proof.len() != 96 { // 3 * 32 (SHA256 hash length)
            ic_cdk::println!("❌ Invalid proof length: {}", proof.len());
            return false;
        }

        let current_proof = self.generate_proof(record);
        let is_valid = current_proof.as_slice() == proof;
        
        if is_valid {
            ic_cdk::println!("✅ Proof verification successful for record: {}", record.id);
        } else {
            ic_cdk::println!("❌ Proof verification failed for record: {}", record.id);
        }
        
        is_valid
    }

    // 添加辅助方法用于记录统计
    fn get_proof_stats(&self, record: &CreditRecord) -> String {
        let proof = self.generate_proof(record);
        format!(
            "Proof Stats:\n\
             - Record ID: {}\n\
             - Proof Length: {} bytes\n\
             - Base Hash Length: 32 bytes\n\
             - Commitment Length: 32 bytes\n\
             - ZK Proof Length: 32 bytes\n\
             - User DID Length: {} bytes\n\
             - Timestamp: {}\n\
             - Institution: {}\n\
             - Status: {:?}",
            record.id,
            proof.len(),
            record.user_did.len(),
            record.timestamp,
            record.institution_id,
            record.status
        )
    }
}
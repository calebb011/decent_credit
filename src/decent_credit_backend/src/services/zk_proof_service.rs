use sha2::{Sha256, Digest};
use crate::models::record::{CreditRecord, RecordContent, RecordStatus, RecordType};
use ic_cdk::api::time;
use crate::utils::error::Error;

pub struct ZKProofService {
    verification_key: Vec<u8>,  // 添加验证密钥字段
}

impl ZKProofService {
    pub fn new() -> Self {
        ic_cdk::println!("Initializing ZKProofService with ZK capabilities");
        Self {
            verification_key: Vec::new() // 添加必要的字段
        }
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
 /// 为原始数据生成证明
 pub fn generate_proof(&self, content_bytes: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    
    // 处理原始内容
    hasher.update(content_bytes);
    
    // 添加验证密钥
    hasher.update(&self.verification_key);
    
    // 生成基础哈希
    let base_hash = hasher.finalize().to_vec();
    
    // 生成零知识证明
    let (commitment, proof) = self.generate_zk_proof_other(&base_hash, 0);  // 使用固定值代替secret_value

    // 组合最终的证明
    let mut final_proof = Vec::new();
    final_proof.extend_from_slice(&base_hash);
    final_proof.extend_from_slice(&commitment);
    final_proof.extend_from_slice(&proof);

    ic_cdk::println!("Proof generated with length: {} bytes", final_proof.len());
    
    final_proof
}

// 生成零知识证明的辅助方法
fn generate_zk_proof_other(&self, content_hash: &[u8], secret: u64) -> (Vec<u8>, Vec<u8>) {
    let mut hasher = Sha256::new();
    
    // 生成承诺值
    hasher.update(content_hash);
    hasher.update(&secret.to_le_bytes());
    let commitment = hasher.finalize().to_vec();
    
    // 生成证明
    let mut proof_hasher = Sha256::new();
    proof_hasher.update(&commitment);
    proof_hasher.update(&self.verification_key);
    let proof = proof_hasher.finalize().to_vec();

    (commitment, proof)
}


pub fn verify_proof(&self, record: &CreditRecord, proof: &[u8]) -> Result<bool, String> {
    // 检查证明长度
    if proof.len() != 96 { // 3 * 32 (SHA256 hash length)
        ic_cdk::println!("❌ Invalid proof length: {}", proof.len());
        return Err("Invalid proof length".to_string());
    }

    // 使用加密内容生成当前证明
    let current_proof = self.generate_proof(&record.encrypted_content);
    
    // 比较证明内容
    let is_valid = current_proof.as_slice() == proof;

    // 记录验证结果
    if is_valid {
        ic_cdk::println!("✅ Proof verification successful for record: {}", record.id);
        ic_cdk::println!(
            "Record details - Institution: {}, Timestamp: {}", 
            record.institution_id, 
            record.timestamp
        );
        Ok(true)
    } else {
        ic_cdk::println!("❌ Proof verification failed for record: {}", record.id);
        ic_cdk::println!(
            "Proof lengths - Expected: {}, Got: {}", 
            current_proof.len(), 
            proof.len()
        );
        Err("Proof verification failed".to_string())
    }
}

// // 还要修改对应的 generate_proof 方法
// pub fn generate_proof(&self, content_bytes: &[u8]) -> Vec<u8> {
//     let mut hasher = Sha256::new();
    
//     // 处理加密内容
//     hasher.update(content_bytes);
    
//     // 添加时间戳防重放
//     hasher.update(&time().to_le_bytes());
    
//     // 添加验证密钥
//     hasher.update(&self.verification_key);
    
//     // 生成基础哈希
//     let base_hash = hasher.finalize().to_vec();
    
//     // 生成零知识证明
//     let (commitment, proof) = self.generate_zk_proof(&base_hash, 0);

//     // 组合最终证明
//     let mut final_proof = Vec::new();
//     final_proof.extend_from_slice(&base_hash);
//     final_proof.extend_from_slice(&commitment);
//     final_proof.extend_from_slice(&proof);
    
//     ic_cdk::println!("Generated proof length: {} bytes", final_proof.len());
    
//     final_proof
// }
    
}
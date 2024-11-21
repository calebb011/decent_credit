use candid::Principal;
use std::cell::RefCell;
use std::convert::TryInto;
use sha2::{Sha256, Digest};

#[derive(Debug)]
pub enum CryptoError {
    EncryptionError(String),
    DecryptionError(String),
    SignatureError(String),
    KeyGenerationError(String),
}

#[derive(Clone)]
struct KeyState {
    current_key: [u8; 32],
    private_key: [u8; 32],
    public_key: [u8; 32],
}

impl KeyState {
    fn new() -> Self {
        // 使用确定性的种子生成密钥
        let timestamp = ic_cdk::api::time();
        let mut hasher = Sha256::new();
        hasher.update(timestamp.to_be_bytes());
        let seed = hasher.finalize();
        
        // 使用前32字节作为当前密钥
        let mut current_key = [0u8; 32];
        current_key.copy_from_slice(&seed[..32]);
        
        // 生成签名密钥对
        let mut hasher = Sha256::new();
        hasher.update(&seed);
        let key_seed = hasher.finalize();
        
        let mut private_key = [0u8; 32];
        let mut public_key = [0u8; 32];
        private_key.copy_from_slice(&key_seed[..32]);
        
        // 简单的公钥生成(在生产环境中应使用proper密码学库)
        let mut hasher = Sha256::new();
        hasher.update(&private_key);
        public_key.copy_from_slice(&hasher.finalize()[..32]);
        
        Self {
            current_key,
            private_key,
            public_key,
        }
    }
}

thread_local! {
    static KEY_STATE: RefCell<Option<KeyState>> = RefCell::new(None);
}

pub struct CryptoService;

impl CryptoService {
    pub fn new() -> Self {
        let key_state = KeyState::new();
        KEY_STATE.with(|state| {
            *state.borrow_mut() = Some(key_state);
        });
        Self {}
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        KEY_STATE.with(|state| {
            let state = state.borrow();
            let state = state.as_ref()
                .ok_or_else(|| CryptoError::EncryptionError("Key state not initialized".to_string()))?;
            
            // 简单的加密实现(在生产环境中应使用proper加密库)
            let mut result = Vec::new();
            
            // 生成随机IV
            let timestamp = ic_cdk::api::time();
            let mut hasher = Sha256::new();
            hasher.update(timestamp.to_be_bytes());
            let iv = hasher.finalize();
            
            // 添加IV到结果
            result.extend_from_slice(&iv);
            
            // 简单的XOR加密
            for (i, &byte) in data.iter().enumerate() {
                let key_byte = state.current_key[i % 32];
                let iv_byte = iv[i % 32];
                result.push(byte ^ key_byte ^ iv_byte);
            }
            
            Ok(result)
        })
    }

    pub fn decrypt(&self, encrypted: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if encrypted.len() < 32 {
            return Err(CryptoError::DecryptionError("Invalid data length".to_string()));
        }

        KEY_STATE.with(|state| {
            let state = state.borrow();
            let state = state.as_ref()
                .ok_or_else(|| CryptoError::DecryptionError("Key state not initialized".to_string()))?;

            // 提取IV
            let iv = &encrypted[..32];
            let data = &encrypted[32..];
            
            // 解密数据
            let mut result = Vec::new();
            for (i, &byte) in data.iter().enumerate() {
                let key_byte = state.current_key[i % 32];
                let iv_byte = iv[i % 32];
                result.push(byte ^ key_byte ^ iv_byte);
            }
            
            Ok(result)
        })
    }

    pub fn sign(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        KEY_STATE.with(|state| {
            let state = state.borrow();
            let state = state.as_ref()
                .ok_or_else(|| CryptoError::SignatureError("Key state not initialized".to_string()))?;
            
            // 简单的签名实现(在生产环境中应使用proper签名算法)
            let mut hasher = Sha256::new();
            hasher.update(&state.private_key);
            hasher.update(data);
            Ok(hasher.finalize().to_vec())
        })
    }

    pub fn verify(&self, data: &[u8], signature: &[u8]) -> Result<bool, CryptoError> {
        if signature.len() != 32 {
            return Err(CryptoError::SignatureError("Invalid signature length".to_string()));
        }

        KEY_STATE.with(|state| {
            let state = state.borrow();
            let state = state.as_ref()
                .ok_or_else(|| CryptoError::SignatureError("Key state not initialized".to_string()))?;

            // 验证签名
            let mut hasher = Sha256::new();
            hasher.update(&state.private_key);
            hasher.update(data);
            let expected = hasher.finalize();
            
            Ok(expected[..] == signature[..])
        })
    }

    pub fn generate_did(&self, identity_hash: &str, institution_id: &Principal) -> String {
        let mut hasher = Sha256::new();
        hasher.update(identity_hash.as_bytes());
        hasher.update(institution_id.as_slice());
        format!("did:decent_credit:{}", hex::encode(hasher.finalize()))
    }
}

thread_local! {
    static CRYPTO_SERVICE: RefCell<Option<CryptoService>> = RefCell::new(None);
}

pub fn init_crypto_service() -> Result<(), CryptoError> {
    let service = CryptoService::new();
    CRYPTO_SERVICE.with(|s| {
        *s.borrow_mut() = Some(service);
    });
    Ok(())
}

pub fn with_crypto_service<F, R>(f: F) -> R 
where
    F: FnOnce(&CryptoService) -> R,
{
    CRYPTO_SERVICE.with(|service| {
        let service = service.borrow();
        let service_ref = service.as_ref()
            .expect("Crypto service not initialized");
        f(service_ref)
    })
}


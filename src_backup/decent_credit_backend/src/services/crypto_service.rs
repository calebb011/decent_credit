use candid::Principal;
use ic_cdk_macros::*;
use std::cell::RefCell;
use std::convert::TryInto;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::{RngCore, SeedableRng};
use rand_chacha::ChaCha20Rng;
use sha2::{Sha256, Digest};
use ed25519_dalek::{Signature, SigningKey, Signer, Verifier, VerifyingKey};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

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
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
}

impl KeyState {
    fn new() -> Self {
        let mut rng = ChaCha20Rng::seed_from_u64(ic_cdk::api::time());
        let mut current_key = [0u8; 32];
        rng.fill_bytes(&mut current_key);
        
        let signing_key = SigningKey::generate(&mut rng);
        let verifying_key = VerifyingKey::from(&signing_key);
        
        Self {
            current_key,
            signing_key,
            verifying_key,
        }
    }
}

thread_local! {
    static KEY_STATE: RefCell<KeyState> = RefCell::new(KeyState::new());
}

pub struct CryptoService;

impl CryptoService {
    pub fn new() -> Self {
        Self {}
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        KEY_STATE.with(|state| {
            let state = state.borrow();
            let mut rng = ChaCha20Rng::seed_from_u64(ic_cdk::api::time());
            
            let mut nonce_bytes = [0u8; 12];
            rng.fill_bytes(&mut nonce_bytes);
            let nonce = Nonce::from_slice(&nonce_bytes);

            let cipher = Aes256Gcm::new_from_slice(&state.current_key)
                .map_err(|e| CryptoError::EncryptionError(e.to_string()))?;

            let encrypted = cipher
                .encrypt(nonce, data)
                .map_err(|e| CryptoError::EncryptionError(e.to_string()))?;

            let mut result = Vec::with_capacity(nonce_bytes.len() + encrypted.len());
            result.extend_from_slice(&nonce_bytes);
            result.extend_from_slice(&encrypted);

            Ok(result)
        })
    }

    pub fn decrypt(&self, encrypted: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if encrypted.len() < 12 {
            return Err(CryptoError::DecryptionError("Invalid data length".to_string()));
        }

        KEY_STATE.with(|state| {
            let state = state.borrow();
            let nonce = Nonce::from_slice(&encrypted[..12]);
            let ciphertext = &encrypted[12..];

            let cipher = Aes256Gcm::new_from_slice(&state.current_key)
                .map_err(|e| CryptoError::DecryptionError(e.to_string()))?;

            cipher.decrypt(nonce, ciphertext)
                .map_err(|e| CryptoError::DecryptionError(e.to_string()))
        })
    }

    pub fn sign(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        KEY_STATE.with(|state| {
            let state = state.borrow();
            let signature = state.signing_key.sign(data);
            Ok(signature.to_bytes().to_vec())
        })
    }

    pub fn verify(&self, data: &[u8], signature: &[u8]) -> Result<bool, CryptoError> {
        if signature.len() != 64 {
            return Err(CryptoError::SignatureError("Invalid signature length".to_string()));
        }

        let result = KEY_STATE.with(|state| -> Result<bool, CryptoError> {
            let state = state.borrow();
            let signature_bytes: [u8; 64] = signature.try_into()
                .map_err(|_| CryptoError::SignatureError("Invalid signature format".to_string()))?;

            let signature = Signature::try_from(&signature_bytes)
                .map_err(|e| CryptoError::SignatureError(e.to_string()))?;
            
            Ok(state.verifying_key.verify(data, &signature).is_ok())
        });

        result
    }

    pub fn generate_did(&self, identity_hash: &str, institution_id: &Principal) -> String {
        let mut hasher = Sha256::new();
        hasher.update(identity_hash.as_bytes());
        hasher.update(institution_id.as_slice());
        format!("did:decent_credit:{}", hex::encode(hasher.finalize()))
    }
}

thread_local! {
    static CRYPTO_SERVICE: RefCell<CryptoService> = RefCell::new(CryptoService::new());
}

pub fn with_crypto_service<F, R>(f: F) -> R 
where
    F: FnOnce(&CryptoService) -> R,
{
    CRYPTO_SERVICE.with(|service| f(&service.borrow()))
}
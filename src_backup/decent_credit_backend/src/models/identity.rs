// models/identity.rs
use candid::{CandidType, Deserialize};
use candid::Principal;
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Clone, PartialEq)]
pub enum IdentityType {
    IDCard,
    Passport,
    Other(String)
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UserIdentity {
    pub did: String,
    pub identity_type: IdentityType,
    pub identity_hash: String,
    pub verified: bool,
    pub institution_id: Principal,
    pub credentials: Vec<IdentityCredential>
}

#[derive(CandidType, Deserialize, Clone, PartialEq)]
pub enum CredentialType {
    BasicIdentity,
    CreditScore,
    Employment,
    Custom(String)
}

#[derive(CandidType, Deserialize, Clone)]
pub struct IdentityCredential {
    pub did: String,
    pub credential_type: CredentialType,
    pub issuer: Principal,
    pub issuance_date: u64,
    pub expiration_date: u64,
    pub claims: HashMap<String, String>,
    pub signature: Vec<u8>
}

#[derive(Debug)]
pub enum IdentityError {
    Unauthorized,
    IdentityNotFound,
    InvalidSignature,
    CredentialExpired,
    CredentialNotFound,
    EncryptionError,
    DecryptionError,
}
// services/identity_service.rs
use std::collections::HashMap;
use candid::Principal;
use std::cell::RefCell;
use crate::models::identity::{UserIdentity, CredentialType, IdentityCredential, IdentityError};
// use crate::services::crypto_service::CRYPTO_SERVICE;  // 修改导入

thread_local! {
    static IDENTITY_SERVICE: RefCell<IdentityService> = RefCell::new(
        IdentityService::new(Principal::from_text("bkyz2-fmaaa-aaaaa-qaaaq-cai").unwrap())
    );
}

pub struct IdentityService {
    identities: HashMap<String, UserIdentity>,
    identity_provider: Principal,
}

impl IdentityService {
    pub fn new(identity_provider: Principal) -> Self {
        Self {
            identities: HashMap::new(),
            identity_provider,
        }
    }

    pub fn register_identity(&mut self, mut identity: UserIdentity) -> Result<String, IdentityError> {
        // 验证调用者是否为授权机构
        if ic_cdk::caller() != self.identity_provider {
            return Err(IdentityError::Unauthorized);
        }

        // // 生成DID
        // let did = CRYPTO_SERVICE.with(|service| {
        //     service.borrow().generate_did(&identity.identity_hash, &identity.institution_id)
        // });

        // 设置DID
        // identity.did = did.clone();

        // 加密敏感数据
        // let encrypted_hash = CRYPTO_SERVICE.with(|service| {
        //     service.borrow().encrypt(identity.identity_hash.as_bytes())
        // });
        // identity.identity_hash = hex::encode(encrypted_hash);

        // 存储身份信息
        // self.identities.insert(did.clone(), identity);
        Ok(0.to_string())
    }

    pub fn verify_identity(&self, did: &str) -> Result<bool, IdentityError> {
        let identity = self.identities.get(did)
            .ok_or(IdentityError::IdentityNotFound)?;

        // 验证基础身份凭证
        let basic_credential = identity.credentials.iter()
            .find(|c| c.credential_type == CredentialType::BasicIdentity)
            .ok_or(IdentityError::CredentialNotFound)?;

        // 验证凭证签名
        // let data = self.prepare_credential_data(basic_credential)?;
        // CRYPTO_SERVICE.with(|service| {
        //     service.borrow().verify(&data, &basic_credential.signature)
        // });

        // 验证凭证是否过期
        if ic_cdk::api::time() > basic_credential.expiration_date {
            return Ok(false);
        }

        Ok(true)
    }

    pub fn issue_credential(
        &mut self,
        did: &str,
        mut credential: IdentityCredential
    ) -> Result<(), IdentityError> {
        // 验证调用者权限
        if ic_cdk::caller() != self.identity_provider {
            return Err(IdentityError::Unauthorized);
        }

        // 验证DID存在
        let identity = self.identities.get_mut(did)
            .ok_or(IdentityError::IdentityNotFound)?;

        // 准备签名数据
        // let data = self.prepare_credential_data(&credential);

        // 签名凭证
        // credential.signature = CRYPTO_SERVICE.with(|service| {
        //     service.borrow().sign(&data)
        // });

        // 存储凭证
        identity.credentials.push(credential);
        Ok(())
    }

    pub fn verify_credential(
        &self,
        did: &str,
        credential_type: CredentialType
    ) -> Result<bool, IdentityError> {
        let identity = self.identities.get(did)
            .ok_or(IdentityError::IdentityNotFound)?;

        let credential = identity.credentials.iter()
            .find(|c| c.credential_type == credential_type)
            .ok_or(IdentityError::CredentialNotFound)?;

        // 准备验证数据
        let data = self.prepare_credential_data(credential)?;

        // 验证签名
        // CRYPTO_SERVICE.with(|service| {
        //     service.borrow().verify(&data, &credential.signature)
        // });

        // 检查过期时间
        if ic_cdk::api::time() > credential.expiration_date {
            return Ok(false);
        }

        Ok(true)
    }

    pub fn revoke_credential(
        &mut self,
        did: &str,
        credential_type: CredentialType
    ) -> Result<(), IdentityError> {
        if ic_cdk::caller() != self.identity_provider {
            return Err(IdentityError::Unauthorized);
        }

        let identity = self.identities.get_mut(did)
            .ok_or(IdentityError::IdentityNotFound)?;

        identity.credentials.retain(|c| c.credential_type != credential_type);
        Ok(())
    }

    fn prepare_credential_data(&self, credential: &IdentityCredential) -> Result<Vec<u8>, IdentityError> {
        // 序列化凭证数据用于签名
        let mut data = Vec::new();
        data.extend_from_slice(credential.did.as_bytes());
        data.extend_from_slice(&credential.issuance_date.to_le_bytes());
        data.extend_from_slice(&credential.expiration_date.to_le_bytes());
        
        // 序列化claims
        for (key, value) in &credential.claims {
            data.extend_from_slice(key.as_bytes());
            data.extend_from_slice(value.as_bytes());
        }

        Ok(data)
    }
}

// API端点
#[ic_cdk_macros::update]
async fn register_identity(identity: UserIdentity) -> Result<String, String> {
    IDENTITY_SERVICE.with(|service| {
        service.borrow_mut().register_identity(identity)
            .map_err(|e| format!("{:?}", e))
    })
}

#[ic_cdk_macros::update]
async fn issue_credential(did: String, credential: IdentityCredential) -> Result<(), String> {
    IDENTITY_SERVICE.with(|service| {
        service.borrow_mut().issue_credential(&did, credential)
            .map_err(|e| format!("{:?}", e))
    })
}

#[ic_cdk_macros::query]
fn verify_identity(did: String) -> Result<bool, String> {
    IDENTITY_SERVICE.with(|service| {
        service.borrow().verify_identity(&did)
            .map_err(|e| format!("{:?}", e))
    })
}

#[ic_cdk_macros::query]
fn verify_credential(did: String, credential_type: CredentialType) -> Result<bool, String> {
    IDENTITY_SERVICE.with(|service| {
        service.borrow().verify_credential(&did, credential_type)
            .map_err(|e| format!("{:?}", e))
    })
}

pub fn init_identity_service() {
    IDENTITY_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        // 初始化身份服务
        service.identities.clear();
        // 其他初始化配置
    });
}
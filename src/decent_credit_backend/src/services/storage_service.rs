use std::cell::RefCell;
use std::collections::HashMap;
use candid::Principal;
use ic_cdk::api::time;

// 添加 StorageService 相关内容
thread_local! {
    static STORAGE_SERVICE: RefCell<StorageService> = RefCell::new(StorageService::new());
}

// StorageService 结构体定义
pub struct StorageService {
    stored_data: HashMap<String, Vec<u8>>,
    chain_data: HashMap<String, (String, Vec<u8>)>,
}

impl StorageService {
    pub fn new() -> Self {
        Self {
            stored_data: HashMap::new(),
            chain_data: HashMap::new(),
        }
    }

    pub fn store_data(&mut self, data: Vec<u8>) -> Result<String, String> {
        let id = format!("storage-{}", ic_cdk::api::time());
        self.stored_data.insert(id.clone(), data);
        Ok(id)
    }

    pub fn store_on_chain(&mut self, record_id: String, storage_id: String, proof: Vec<u8>) -> Result<(), String> {
        self.chain_data.insert(record_id, (storage_id, proof));
        Ok(())
    }

    pub fn get_chain_data(&self, record_id: &str) -> Option<(String, Vec<u8>)> {  // 返回拥有所有权的数据
        self.chain_data.get(record_id).map(|(id, proof)| {
            (id.clone(), proof.clone())  // 克隆数据而不是返回引用
        })
    }

    pub fn get_data(&self, storage_id: &str) -> Option<&Vec<u8>> {
        self.stored_data.get(storage_id)
    }
}

// Helper function for storage service access
pub fn with_storage_service<F, R>(f: F) -> R 
where
    F: FnOnce(&mut StorageService) -> R
{
    STORAGE_SERVICE.with(|service| {
        f(&mut service.borrow_mut())
    })
}

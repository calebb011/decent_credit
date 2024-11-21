use candid::Principal;
use ic_cdk::api::call;
use std::collections::HashMap;
use std::cell::RefCell;

#[derive(Debug)] 
pub enum StorageError {
   StorageFailed(String),
   SerializationFailed,
   ChainStorageFailed,
}

pub struct StorageService {
   canister_id: Principal,
   data_store: HashMap<String, Vec<u8>>, // ID -> encrypted data
   chain_store: HashMap<String, (String, Vec<u8>)> // record_id -> (storage_id, proof)
}

thread_local! {
   static STORAGE_SERVICE: RefCell<StorageService> = RefCell::new(
       StorageService::new(
           Principal::from_text("bkyz2-fmaaa-aaaaa-qaaaq-cai").unwrap()
       )
   );
}

impl StorageService {
   pub fn new(canister_id: Principal) -> Self {
       Self {
           canister_id,
           data_store: HashMap::new(),
           chain_store: HashMap::new()
       }
   }

  // 改为同步版本
  pub fn store_data(&mut self, data: Vec<u8>) -> Result<String, StorageError> {
    let storage_id = format!("STORAGE-{}", ic_cdk::api::time());
    self.data_store.insert(storage_id.clone(), data);
    Ok(storage_id)
}

// 改为同步版本
pub fn store_on_chain(
    &mut self,
    record_id: String,
    storage_id: String,
    proof: Vec<u8>
) -> Result<(), StorageError> {
    self.chain_store.insert(record_id.clone(), (storage_id, proof));
    Ok(())
}

   pub fn get_data(&self, storage_id: &str) -> Option<&Vec<u8>> {
       self.data_store.get(storage_id)
   }

   pub fn get_chain_data(&self, record_id: &str) -> Option<&(String, Vec<u8>)> {
       self.chain_store.get(record_id)
   }
}

pub fn init_storage_service() {
   STORAGE_SERVICE.with(|service| {
       let mut service = service.borrow_mut();
       service.data_store.clear();
       service.chain_store.clear();
   });
}

// 同步的 with_storage_service
pub fn with_storage_service<F, R>(f: F) -> R 
where
    F: FnOnce(&mut StorageService) -> R,
{
    STORAGE_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        f(&mut service)
    })
}
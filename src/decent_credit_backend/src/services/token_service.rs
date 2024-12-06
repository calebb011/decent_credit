use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;
use serde::Serialize;
use crate::models::record::*;
use crate::utils::error::Error;
use log::{info, warn, error};
use crate::services::admin_institution_service::ADMIN_SERVICE;
use crate::services::dashboard_service::DASHBOARD_SERVICE;
use crate::models::record::{CreditRecord, DCCTransactionRequest};

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TokenState {
    pub daily_stats: HashMap<Principal, InstitutionDailyStats>,
    pub last_sync: u64,
    pub version: u32,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct InstitutionDailyStats {
    pub rewards: u64,
    pub consumption: u64,
    pub last_update: u64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TokenTransferArgs {
    pub to: Principal,
    pub amount: u64,
    pub memo: Vec<u8>,
    pub from_subaccount: Option<Vec<u8>>,
    pub to_subaccount: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct TransferResult {
    pub block_height: u64,
    pub tx_hash: String,
}

pub struct TokenService {
    state: TokenState,
    pub token_canister_id: Principal,
}

thread_local! {
    pub static TOKEN_SERVICE: RefCell<TokenService> = RefCell::new(
        TokenService::new(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()
        )
    );
}

impl TokenService {
    pub fn new(token_canister_id: Principal) -> Self {
        Self {
            state: TokenState {
                daily_stats: HashMap::new(),
                last_sync: time(),
                version: 1,
            },
            token_canister_id,
        }
    }

    // 同步处理查询费用的业务逻辑
    pub fn prepare_query_fee(
        &mut self,
        from_id: Principal,
        to_id: Principal,
        user_did: String,
        query_price: u64,
    ) -> Result<TokenTransferArgs, Error> {
        // 准备交易请求
        let tx_request = self.prepare_query_transaction(from_id, user_did.clone(), query_price)
            .map_err(|e| Error::InvalidData(e))?;

        // 准备转账参数
        let transfer_args = TokenTransferArgs {
            to: to_id,
            amount: query_price,
            memo: tx_request.remarks.into_bytes(),
            from_subaccount: None,
            to_subaccount: None,
            created_at_time: Some(time()),
        };

        // 更新统计
        self.update_stats(from_id, 0, query_price);
        
        info!("Query fee prepared successfully: {} DCC for user {}", query_price, user_did);
        Ok(transfer_args)
    }

    // 异步执行查询费用转账
    pub async fn execute_query_fee_transfer(
        &self,
        from_id: Principal,
        transfer_args: TokenTransferArgs,
    ) -> Result<(), Error> {
        // 检查余额
        let balance = self.check_balance(from_id).await?;
        
        if balance < transfer_args.amount {
            return Err(Error::InsufficientBalance);
        }

        // 执行链上转账
        self.transfer_dcc(transfer_args).await
    }

    // 处理查询费用的完整流程
    pub async fn process_query_fee(
        &mut self,
        from_id: Principal,
        to_id: Principal,
        user_did: String,
        query_price: u64,
    ) -> Result<(), Error> {
        // 同步处理业务逻辑
        let transfer_args = self.prepare_query_fee(from_id, to_id, user_did, query_price)?;
        
        // 异步执行转账
        self.execute_query_fee_transfer(from_id, transfer_args).await
    }

    // 同步处理查询奖励的业务逻辑
    pub fn prepare_query_reward(
        &mut self,
        institution_id: Principal,
        user_did: String,
    ) -> Result<Option<TokenTransferArgs>, Error> {
        let institution = ADMIN_SERVICE.with(|service| {
            service.borrow().get_institution(institution_id)
                .ok_or_else(|| Error::ResourceNotFound(
                    format!("Institution not found: {}", institution_id)
                ))
        })?;

        // 计算奖励金额
        let reward_amount = self.calculate_reward_amount(
            institution.query_price,
            institution.reward_share_ratio.into()
        )?;

        if reward_amount == 0 {
            return Ok(None);
        }

        // 准备交易
        let tx_request = self.prepare_reward_transaction(
            institution_id,
            user_did.clone(),
            reward_amount,
            institution.reward_share_ratio.into()
        )?;

        // 准备转账参数
        let transfer_args = TokenTransferArgs {
            to: institution_id,
            amount: reward_amount,
            memo: tx_request.remarks.into_bytes(),
            from_subaccount: None,
            to_subaccount: None,
            created_at_time: Some(time()),
        };

        // 更新统计
        self.update_stats(institution_id, reward_amount, 0);
        
        info!("Query reward prepared successfully: {} DCC for institution {}", 
              reward_amount, institution_id);

        Ok(Some(transfer_args))
    }

    // 异步执行查询奖励转账
    pub async fn execute_query_reward_transfer(
        &self,
        transfer_args: TokenTransferArgs,
    ) -> Result<(), Error> {
        // 执行链上转账
        self.transfer_dcc(transfer_args).await
    }

    // 处理查询奖励的完整流程
    pub async fn process_query_reward(
        &mut self,
        institution_id: Principal,
        record: CreditRecord,
        user_did: String,
    ) -> Result<(), Error> {
        // 同步处理业务逻辑
        if let Some(transfer_args) = self.prepare_query_reward(
            institution_id,
            user_did,
        )? {
            // 异步执行转账
            self.execute_query_reward_transfer(transfer_args).await?;
        }

        Ok(())
    }

    // 异步查询余额
    pub async fn check_balance(&self, institution_id: Principal) -> Result<u64, Error> {
        let chain_balance = self.get_chain_balance(institution_id).await
            .map_err(|e| Error::NetworkError(e))?;
            
        Ok(chain_balance)
    }

    // 内部辅助方法
    fn calculate_reward_amount(&self, base_amount: u64, ratio: u32) -> Result<u64, Error> {
        if ratio > 100 {
            return Err(Error::InvalidData("Invalid reward ratio".to_string()));
        }
        Ok((base_amount as f64 * (ratio as f64 / 100.0)) as u64)
    }

    fn prepare_query_transaction(
        &self,
        from_id: Principal,
        user_did: String,
        amount: u64
    ) -> Result<DCCTransactionRequest, String> {
        Ok(DCCTransactionRequest {
            dcc_amount: amount,
            usdt_amount: 0.0,
            tx_hash: format!("QRY{}_{}",
                time() / 1_000_000_000,
                user_did.chars().take(8).collect::<String>()
            ),
            remarks: format!("Query credit record for user {}", user_did),
            created_at: time(),
        })
    }

    fn prepare_reward_transaction(
        &self,
        institution_id: Principal,
        user_did: String,
        amount: u64,
        ratio: u32
    ) -> Result<DCCTransactionRequest, Error> {
        Ok(DCCTransactionRequest {
            dcc_amount: amount,
            usdt_amount: 0.0,
            tx_hash: format!("RWD{}_{}",
                time() / 1_000_000_000,
                user_did.chars().take(8).collect::<String>()
            ),
            remarks: format!(
                "Reward for data query: {} DCC ({}% share)",
                amount, ratio
            ),
            created_at: time(),
        })
    }

    fn update_stats(&mut self, institution_id: Principal, rewards: u64, consumption: u64) {
        let stats = self.state.daily_stats
            .entry(institution_id)
            .or_insert(InstitutionDailyStats {
                rewards: 0,
                consumption: 0,
                last_update: time(),
            });

        stats.rewards += rewards;
        stats.consumption += consumption;
        stats.last_update = time();

        // 更新全局统计
        DASHBOARD_SERVICE.with(|service| {
            service.borrow_mut().update_token_stats(rewards, consumption);
        });
    }

    // 定期清理过期统计
    pub fn clean_expired_stats(&mut self) {
        let today_start = time() - (time() % (24 * 60 * 60 * 1_000_000_000));
        self.state.daily_stats.retain(|_, stats| stats.last_update >= today_start);
        self.state.last_sync = time();
    }

    // 异步转账操作
    async fn transfer_dcc(
        &self,
        args: TokenTransferArgs,
    ) -> Result<(), Error> {
        let result: Result<(TransferResult,), _> = ic_cdk::call(
            self.token_canister_id,
            "transfer",
            (args,)
        ).await;

        match result {
            Ok(_) => Ok(()),
            Err((code, msg)) => {
                error!("Transfer failed: {:?} - {}", code, msg);
                Err(Error::NetworkError(format!("Transfer failed: {}", msg)))
            }
        }
    }

    async fn get_chain_balance(&self, account: Principal) -> Result<u64, String> {
        let result: Result<(u64,), _> = ic_cdk::call(
            self.token_canister_id,
            "balance_of",
            (account,)
        ).await;

        match result {
            Ok((balance,)) => Ok(balance),
            Err((code, msg)) => {
                error!("Failed to get balance: {:?} - {}", code, msg);
                Err(format!("Failed to get balance: {}", msg))
            }
        }
    }
}

// 提供系统初始化函数
pub async fn init_token_service() {
    TOKEN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.state.daily_stats.clear();
        service.state.last_sync = time();
    });
}
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
            Principal::from_text("b77ix-eeaaa-aaaaa-qaada-cai").unwrap()
        )
    );
}
impl TokenService {

    
    pub fn new(token_canister_id: Principal) -> Self {
        info!("Initializing TokenService with canister_id: {}", token_canister_id);
        Self {
            state: TokenState {
                daily_stats: HashMap::new(),
                last_sync: time(),
                version: 1,
            },
            token_canister_id,
        }
    }
    pub async fn check_and_prepare_transfer(
        &mut self,
        from_id: Principal, 
        to_id: Principal,
        amount: u64,
        user_did: String,
    ) -> Result<Option<TokenTransferArgs>, Error> {
        // 先检查余额
        let balance = self.get_chain_balance(from_id).await
            .map_err(|e| Error::NetworkError(e))?;
            
        if balance < amount {
            info!("Insufficient balance for {}: has {}, needs {}", 
                from_id, balance, amount);
            return Ok(None); // 返回 None 而不是错误
        }

        // 如果余额足够，准备转账参数
        let transfer_args = self.prepare_query_fee(
            from_id,
            to_id,
            user_did,
            amount
        )?;

        Ok(Some(transfer_args))
    }
    pub fn prepare_query_fee(
        &mut self,
        from_id: Principal,
        to_id: Principal,
        user_did: String,
        query_price: u64,
    ) -> Result<TokenTransferArgs, Error> {
        info!("Preparing query fee: from={}, to={}, user={}, price={}", 
            from_id, to_id, user_did, query_price);

        // 准备交易请求
        let tx_request = self.prepare_query_transaction(from_id, user_did.clone(), query_price)
            .map_err(|e| {
                error!("Failed to prepare query transaction: {}", e);
                Error::InvalidData(e)
            })?;

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


        pub async fn execute_query_fee_transfer(
            &mut self,
            from_id: Principal,
            transfer_args: TokenTransferArgs,
        ) -> Result<(), Error> {
            info!("Executing query fee transfer for {}, amount: {}", from_id, transfer_args.amount);
            
            // 检查余额
            let balance = self.get_chain_balance(from_id).await
                .map_err(|e| Error::NetworkError(e))?;
            info!("Current balance for {}: {}", from_id, balance);
            
            if balance < transfer_args.amount {
                error!("Insufficient balance for {}: has {}, needs {}", 
                    from_id, balance, transfer_args.amount);
                return Err(Error::InsufficientBalance);
            }
    
            let token_canister_id = self.token_canister_id;
            
            // 执行链上转账
            let result: Result<(TransferResult,), _> = ic_cdk::call(
                token_canister_id,
                "transfer",
                (transfer_args,)
            ).await;
    
            match result {
                Ok(_) => {
                    info!("DCC transfer completed successfully");
                    Ok(())
                }
                Err((code, msg)) => {
                    error!("Transfer failed: {:?} - {}", code, msg);
                    Err(Error::NetworkError(format!("Transfer failed: {}", msg)))
                }
            }
        }

        pub async fn query_balance(&self, id: Principal) -> Result<u64, String> {
            info!("Querying balance for account: {}", id);
            
            // 直接调用链上查询
            let result: Result<(u64,), _> = ic_cdk::call(
                self.token_canister_id,
                "balance_of",
                (id,)
            ).await;
    
            match result {
                Ok((balance,)) => {
                    info!("Current balance for {}: {}", id, balance);
                    Ok(balance)
                }
                Err((code, msg)) => {
                    error!("Failed to query balance: {:?} - {}", code, msg);
                    Err(format!("查询余额失败: {}", msg))
                }
            }
        }
    
        // 同时提供一个静态方法版本，方便其他服务调用
        pub async fn query_balance_static(
            token_canister_id: Principal,
            id: Principal
        ) -> Result<u64, String> {
            info!("Static querying balance for account: {}", id);
            
            let result: Result<(u64,), _> = ic_cdk::call(
                token_canister_id,
                "balance_of",
                (id,)
            ).await;
    
            match result {
                Ok((balance,)) => {
                    info!("Current balance for {}: {}", id, balance);
                    Ok(balance)
                }
                Err((code, msg)) => {
                    error!("Failed to query balance: {:?} - {}", code, msg);
                    Err(format!("查询余额失败: {}", msg))
                }
            }
        }
        pub async fn process_query_fee(
            &mut self,
            from_id: Principal,
            to_id: Principal,
            user_did: String,
            query_price: u64,
        ) -> Result<(), Error> {
            info!("Processing query fee: from={}, to={}, user={}, price={}", 
                from_id, to_id, user_did, query_price);
    
            // 同步处理业务逻辑
            let transfer_args = self.prepare_query_fee(from_id, to_id, user_did.clone(), query_price)?;
            
            // 检查余额
            let balance = self.get_chain_balance(from_id).await
                .map_err(|e| Error::NetworkError(e))?;
                
            if balance < transfer_args.amount {
                return Err(Error::InsufficientBalance);
            }
            
            // 使用静态方法执行转账
            Self::execute_transfer(self.token_canister_id, transfer_args).await
        }
    
        /// 简单的奖励发放方法
        pub async fn send_reward(&mut self, to_id: Principal, amount: u64, memo: String) -> Result<(), String> {
            info!("Sending reward to account: {}, amount: {}", to_id, amount);
            
            let transfer_args = TokenTransferArgs {
                to: to_id,
                amount,
                memo: memo.into_bytes(),
                from_subaccount: None,
                to_subaccount: None,
                created_at_time: Some(time()),
            };
    
            // 直接调用 transfer，由 token canister 作为发送方
            let result: Result<(TransferResult,), _> = ic_cdk::call(
                self.token_canister_id,
                "transfer",
                (transfer_args,)
            ).await;
    
            match result {
                Ok(_) => {
                    info!("Reward sent successfully: {} tokens to {}", amount, to_id);
                    self.update_stats(to_id, amount, 0);  // 保留统计功能
                    Ok(())
                }
                Err((code, msg)) => {
                    error!("Failed to send reward: {:?} - {}", code, msg);
                    Err(format!("发送奖励失败: {}", msg))
                }
            }
        }
    

    /// 简单的代币扣除方法
    pub async fn deduct_tokens(&mut self, from_id: Principal, amount: u64, memo: String) -> Result<(), String> {
        info!("Deducting tokens from account: {}, amount: {}", from_id, amount);
        
        // 先检查余额
        let balance = self.query_balance(from_id).await?;
        if balance < amount {
            return Err(format!("余额不足: 当前 {} < 需要 {}", balance, amount));
        }

        let transfer_args = TokenTransferArgs {
            to: from_id,  // 这里是 from_id，因为是扣除操作
            amount,
            memo: memo.into_bytes(),
            from_subaccount: None,
            to_subaccount: None,
            created_at_time: Some(time()),
        };

        // 执行扣除操作
        let result: Result<(TransferResult,), _> = ic_cdk::call(
            self.token_canister_id,
            "transfer",
            (transfer_args,)
        ).await;

        match result {
            Ok(_) => {
                info!("Tokens deducted successfully: {} tokens from {}", amount, from_id);
                self.update_stats(from_id, 0, amount);  // 更新统计
                Ok(())
            }
            Err((code, msg)) => {
                error!("Failed to deduct tokens: {:?} - {}", code, msg);
                Err(format!("扣除代币失败: {}", msg))
            }
        }
    }

      // 修改 send_reward_static，移除所有余额检查
      pub async fn send_reward_static(
        token_canister_id: Principal,
        to_id: Principal,
        amount: u64,
        memo: String
    ) -> Result<(), String> {
        info!("Static sending reward to account: {}, amount: {}", to_id, amount);
        
        let transfer_args = TokenTransferArgs {
            to: to_id,
            amount,
            memo: memo.into_bytes(),
            from_subaccount: None,
            to_subaccount: None,
            created_at_time: Some(time()),
        };

        // 直接调用 transfer，由 token canister 作为发送方
        let result: Result<(TransferResult,), _> = ic_cdk::call(
            token_canister_id,
            "transfer",
            (transfer_args,)
        ).await;

        match result {
            Ok(_) => {
                info!("Reward sent successfully: {} tokens to {}", amount, to_id);
                Ok(())
            }
            Err((code, msg)) => {
                error!("Failed to send reward: {:?} - {}", code, msg);
                Err(format!("发送奖励失败: {}", msg))
            }
        }
    }
    // 修改 deduct_tokens_static，简化余额检查
    pub async fn deduct_tokens_static(
        token_canister_id: Principal,
        from_id: Principal,
        amount: u64,
        memo: String
    ) -> Result<(), String> {
        info!("Static deducting tokens from account: {}, amount: {}", from_id, amount);

        let transfer_args = TokenTransferArgs {
            to: from_id,  // 这里是 from_id，因为是扣除操作
            amount,
            memo: memo.into_bytes(),
            from_subaccount: None,
            to_subaccount: None,
            created_at_time: Some(time()),
        };

        let result: Result<(TransferResult,), _> = ic_cdk::call(
            token_canister_id,
            "transfer",
            (transfer_args,)
        ).await;

        match result {
            Ok(_) => {
                info!("Tokens deducted successfully: {} tokens from {}", amount, from_id);
                Ok(())
            }
            Err((code, msg)) => {
                error!("Failed to deduct tokens: {:?} - {}", code, msg);
                Err(format!("扣除代币失败: {}", msg))
            }
        }
    }
    pub fn prepare_query_reward(
        &mut self,
        institution_id: Principal,
        user_did: String,
    ) -> Result<Option<TokenTransferArgs>, Error> {
        info!("Preparing query reward for institution {}, user {}", institution_id, user_did);

        let institution = ADMIN_SERVICE.with(|service| {
            service.borrow().get_institution(institution_id)
                .ok_or_else(|| {
                    let err = Error::ResourceNotFound(
                        format!("Institution not found: {}", institution_id)
                    );
                    error!("Failed to get institution: {}", err);
                    err
                })
        })?;

        // 计算奖励金额
        let reward_amount = self.calculate_reward_amount(
            institution.query_price,
            institution.reward_share_ratio.into()
        )?;

        if reward_amount == 0 {
            info!("No reward needed for this query");
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

    pub async fn execute_query_reward_transfer(
        &mut self,
        transfer_args: TokenTransferArgs,
    ) -> Result<(), Error> {
        info!("Executing reward transfer: to={}, amount={}", 
            transfer_args.to, transfer_args.amount);
            
        let token_canister_id = self.token_canister_id;
        
        let result: Result<(TransferResult,), _> = ic_cdk::call(
            token_canister_id,
            "transfer",
            (transfer_args,)
        ).await;

        match result {
            Ok(_) => {
                info!("DCC transfer completed successfully");
                Ok(())
            }
            Err((code, msg)) => {
                error!("Transfer failed: {:?} - {}", code, msg);
                Err(Error::NetworkError(format!("Transfer failed: {}", msg)))
            }
        }
    }


    
    pub async fn process_query_reward(
        &mut self,
        institution_id: Principal,
        _record: CreditRecord,  // 加下划线避免未使用警告
        user_did: String,
    ) -> Result<(), Error> {
        info!("Processing query reward for institution {}, user {}", 
            institution_id, user_did);

        if let Some(transfer_args) = self.prepare_query_reward(
            institution_id,
            user_did.clone(),
        )? {
            // 使用静态方法执行转账
            Self::execute_transfer(self.token_canister_id, transfer_args).await?;
        }

        info!("Query reward processing completed for user {}", user_did);
        Ok(())
    }

    pub async fn check_balance(&self, institution_id: Principal) -> Result<u64, Error> {
        info!("Checking balance for institution: {}", institution_id);
        let chain_balance = self.get_chain_balance(institution_id).await
            .map_err(|e| {
                error!("Failed to get chain balance for {}: {}", institution_id, e);
                Error::NetworkError(e)
            })?;
            
        info!("Retrieved balance for {}: {}", institution_id, chain_balance);
        Ok(chain_balance)
    }
 // 修改为静态方法，接收所有需要的参数
 pub async fn execute_transfer(
    token_canister_id: Principal,
    transfer_args: TokenTransferArgs,
) -> Result<(), Error> {
    info!("Executing transfer: to={}, amount={}", 
        transfer_args.to, transfer_args.amount);
        
    let result: Result<(TransferResult,), _> = ic_cdk::call(
        token_canister_id,
        "transfer",
        (transfer_args,)
    ).await;

    match result {
        Ok(_) => {
            info!("Transfer completed successfully");
            Ok(())
        }
        Err((code, msg)) => {
            error!("Transfer failed: {:?} - {}", code, msg);
            Err(Error::NetworkError(format!("Transfer failed: {}", msg)))
        }
    }
}
    fn calculate_reward_amount(&self, base_amount: u64, ratio: u32) -> Result<u64, Error> {
        info!("Calculating reward amount: base={}, ratio={}", base_amount, ratio);
        if ratio > 100 {
            error!("Invalid reward ratio: {}", ratio);
            return Err(Error::InvalidData("Invalid reward ratio".to_string()));
        }
        let amount = (base_amount as f64 * (ratio as f64 / 100.0)) as u64;
        info!("Calculated reward amount: {}", amount);
        Ok(amount)
    }

    fn prepare_query_transaction(
        &self,
        from_id: Principal,
        user_did: String,
        amount: u64
    ) -> Result<DCCTransactionRequest, String> {
        info!("Preparing query transaction: from={}, user={}, amount={}", from_id, user_did, amount);
        let tx_request = DCCTransactionRequest {
            dcc_amount: amount,
            usdt_amount: 0.0,
            tx_hash: format!("QRY{}_{}",
                time() / 1_000_000_000,
                user_did.chars().take(8).collect::<String>()
            ),
            remarks: format!("Query credit record for user {}", user_did),
            created_at: time(),
        };
        info!("Query transaction prepared with hash: {}", tx_request.tx_hash);
        Ok(tx_request)
    }

    fn prepare_reward_transaction(
        &self,
        institution_id: Principal,
        user_did: String,
        amount: u64,
        ratio: u32
    ) -> Result<DCCTransactionRequest, Error> {
        info!("Preparing reward transaction: institution={}, user={}, amount={}, ratio={}", 
            institution_id, user_did, amount, ratio);
        let tx_request = DCCTransactionRequest {
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
        };
        info!("Reward transaction prepared with hash: {}", tx_request.tx_hash);
        Ok(tx_request)
    }

    fn update_stats(&mut self, institution_id: Principal, rewards: u64, consumption: u64) {
        info!("Updating stats for {}: rewards={}, consumption={}", 
            institution_id, rewards, consumption);
        
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

        info!("Updated institution stats: rewards={}, consumption={}", 
            stats.rewards, stats.consumption);

        DASHBOARD_SERVICE.with(|service| {
            service.borrow_mut().update_token_stats(rewards, consumption);
        });
    }

    pub fn clean_expired_stats(&mut self) {
        info!("Starting cleanup of expired stats");
        let today_start = time() - (time() % (24 * 60 * 60 * 1_000_000_000));
        let initial_count = self.state.daily_stats.len();
        
        self.state.daily_stats.retain(|_, stats| stats.last_update >= today_start);
        
        let removed = initial_count - self.state.daily_stats.len();
        if removed > 0 {
            info!("Cleaned up {} expired stat entries", removed);
        }
        self.state.last_sync = time();
    }

    async fn transfer_dcc(
        &self,
        args: TokenTransferArgs,
    ) -> Result<(), Error> {
        info!("Initiating DCC transfer: to={}, amount={}", args.to, args.amount);

        let result: Result<(TransferResult,), _> = ic_cdk::call(
            self.token_canister_id,
            "transfer",
            (args,)
        ).await;

        match result {
            Ok(_) => {
                info!("DCC transfer completed successfully");
                Ok(())
            }
            Err((code, msg)) => {
                error!("Transfer failed: {:?} - {}", code, msg);
                Err(Error::NetworkError(format!("Transfer failed: {}", msg)))
            }
        }
    }

    pub async fn get_chain_balance(&self, account: Principal) -> Result<u64, String> {
        info!("Getting chain balance for account: {}", account);

        let result: Result<(u64,), _> = ic_cdk::call(
            self.token_canister_id,
            "balance_of",
            (account,)
        ).await;

        match result {
            Ok((balance,)) => {
                info!("Retrieved balance for {}: {}", account, balance);
                Ok(balance)
            }
            Err((code, msg)) => {
                error!("Failed to get balance: {:?} - {}", code, msg);
                Err(format!("Failed to get balance: {}", msg))
            }
        }
    }
}

pub async fn init_token_service() {
    info!("Initializing token service...");
    TOKEN_SERVICE.with(|service| {
        let mut service = service.borrow_mut();
        service.state.daily_stats.clear();
        service.state.last_sync = time();
        info!("Token service initialized successfully");
    });
}